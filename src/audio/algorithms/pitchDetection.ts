import type { PitchDetectionResult } from '../types.ts';

export interface PitchDetectorOptions {
  sampleRate?: number;
  minFreq?: number;
  maxFreq?: number;
  yinThreshold?: number;
  rmsThreshold?: number;
}

const DEFAULT_MIN_FREQ = 75; // Guitar Low E ~ 82.4Hz, Drop D ~ 73.4Hz
const DEFAULT_MAX_FREQ = 1100; // High frets on 1st string
const DEFAULT_YIN_THRESHOLD = 0.15; // Standard YIN dip threshold
const DEFAULT_RMS_THRESHOLD = 0.008; // Noise gate threshold for silence

/**
 * High-performance, zero-allocation implementation of the YIN Pitch Detection algorithm
 * with Cumulative Mean Normalized Difference Function (CMNDF) and parabolic interpolation.
 */
export class YinPitchDetector {
  private sampleRate: number;
  private minFreq: number;
  private maxFreq: number;
  private yinThreshold: number;
  private rmsThreshold: number;

  // Pre-allocated buffers to prevent GC stutter during continuous real-time audio frames
  private diffBuffer: Float32Array;

  constructor(options: PitchDetectorOptions = {}) {
    this.sampleRate = options.sampleRate ?? 44100;
    this.minFreq = options.minFreq ?? DEFAULT_MIN_FREQ;
    this.maxFreq = options.maxFreq ?? DEFAULT_MAX_FREQ;
    this.yinThreshold = options.yinThreshold ?? DEFAULT_YIN_THRESHOLD;
    this.rmsThreshold = options.rmsThreshold ?? DEFAULT_RMS_THRESHOLD;

    // Buffer capacity for maximum anticipated lag
    this.diffBuffer = new Float32Array(2048);
  }

  /**
   * Updates sample rate dynamically if AudioContext changes.
   */
  public setSampleRate(sampleRate: number): void {
    if (sampleRate > 0 && this.sampleRate !== sampleRate) {
      this.sampleRate = sampleRate;
    }
  }

  public setRmsThreshold(threshold: number): void {
    this.rmsThreshold = Math.max(0.0001, threshold);
  }

  public getRmsThreshold(): number {
    return this.rmsThreshold;
  }

  public setYinThreshold(threshold: number): void {
    this.yinThreshold = Math.max(0.01, Math.min(0.5, threshold));
  }

  /**
   * Computes Root-Mean-Square (RMS) amplitude of the audio buffer.
   */
  public static computeRMS(buffer: Float32Array): number {
    const len = buffer.length;
    if (len === 0) return 0;

    let sum = 0;
    for (let i = 0; i < len; i++) {
      const val = buffer[i];
      sum += val * val;
    }
    return Math.sqrt(sum / len);
  }

  /**
   * Computes peak amplitude [0, 1].
   */
  public static computePeak(buffer: Float32Array): number {
    let max = 0;
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs > max) max = abs;
    }
    return max;
  }

  /**
   * Detects fundamental frequency and clarity from an audio buffer.
   */
  public detect(buffer: Float32Array): PitchDetectionResult {
    const bufferSize = buffer.length;
    const rms = YinPitchDetector.computeRMS(buffer);

    // 1. Noise gate / Silence check
    if (rms < this.rmsThreshold) {
      return { freq: 0, clarity: 0, rms, isSilent: true };
    }

    // Min and Max lag corresponding to frequency bounds
    // tau = sampleRate / freq
    const minTau = Math.max(2, Math.floor(this.sampleRate / this.maxFreq));
    const maxTau = Math.min(
      Math.floor(bufferSize / 2),
      Math.ceil(this.sampleRate / this.minFreq)
    );

    if (maxTau <= minTau || maxTau >= bufferSize) {
      return { freq: 0, clarity: 0, rms, isSilent: false };
    }

    // Ensure pre-allocated buffer is large enough
    if (this.diffBuffer.length < maxTau + 2) {
      this.diffBuffer = new Float32Array(maxTau + 2);
    }
    const d = this.diffBuffer;

    // Window size for difference function
    const windowSize = bufferSize - maxTau;

    // 2. Difference Function: d(tau) = sum_{j=0}^{W-1} (x[j] - x[j+tau])^2
    d[0] = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        const delta = buffer[j] - buffer[j + tau];
        sum += delta * delta;
      }
      d[tau] = sum;
    }

    // 3. Cumulative Mean Normalized Difference Function (CMNDF)
    // d'(0) = 1
    // d'(tau) = d(tau) / ( (1/tau) * sum_{j=1}^tau d(j) )
    d[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      runningSum += d[tau];
      if (runningSum === 0) {
        d[tau] = 1;
      } else {
        d[tau] = (d[tau] * tau) / runningSum;
      }
    }

    // 4. Absolute Thresholding: Find first dip below threshold
    let tauEstimate = -1;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (d[tau] < this.yinThreshold) {
        // Keep advancing as long as it's decreasing to find local minimum
        while (tau + 1 <= maxTau && d[tau + 1] < d[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    // If no dip was below threshold, find global minimum as fallback
    let bestClarityDip = 1.0;
    if (tauEstimate === -1) {
      let minVal = Infinity;
      let minTauIndex = -1;

      for (let tau = minTau; tau <= maxTau; tau++) {
        if (d[tau] < minVal) {
          minVal = d[tau];
          minTauIndex = tau;
        }
      }

      // If even the best minimum is too noisy (> 0.50), reject as unpitched noise
      if (minTauIndex !== -1 && minVal < 0.5) {
        tauEstimate = minTauIndex;
        bestClarityDip = minVal;
      } else {
        return { freq: 0, clarity: 0, rms, isSilent: false };
      }
    } else {
      bestClarityDip = d[tauEstimate];
    }

    // 5. Parabolic Interpolation for sub-sample accuracy
    let refinedTau = tauEstimate;
    if (tauEstimate > 1 && tauEstimate < maxTau) {
      const s0 = d[tauEstimate - 1];
      const s1 = d[tauEstimate];
      const s2 = d[tauEstimate + 1];

      const denominator = 2 * (2 * s1 - s0 - s2);
      if (Math.abs(denominator) > 1e-6) {
        const delta = (s2 - s0) / denominator;
        refinedTau = tauEstimate + delta;
      }
    }

    if (refinedTau <= 0) {
      return { freq: 0, clarity: 0, rms, isSilent: false };
    }

    const detectedFreq = this.sampleRate / refinedTau;

    // Validate frequency bounds
    if (detectedFreq < this.minFreq || detectedFreq > this.maxFreq) {
      return { freq: 0, clarity: 0, rms, isSilent: false };
    }

    // Clarity is normalized [0, 1] where 1.0 is a pure periodic wave
    const clarity = Math.max(0, Math.min(1, 1 - bestClarityDip));

    return {
      freq: Math.round(detectedFreq * 100) / 100,
      clarity: Math.round(clarity * 100) / 100,
      rms,
      isSilent: false,
    };
  }
}

/**
 * Convenience singleton instance for direct detection.
 */
export const defaultPitchDetector = new YinPitchDetector();
