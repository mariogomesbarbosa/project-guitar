import { YinPitchDetector } from './algorithms/pitchDetection.ts';
import { frequencyToNote, guessBestGuitarPosition } from './NoteMapper.ts';
import type { AudioEngineState, DetectedPitch } from './types.ts';

export type PitchCallback = (pitch: DetectedPitch | null) => void;
export type StateCallback = (state: AudioEngineState) => void;

export interface AudioEngineConfig {
  fftSize?: number;
  clarityThreshold?: number;
  defaultNoiseFloor?: number;
}

const DEFAULT_FFT_SIZE = 2048;
const DEFAULT_CLARITY_THRESHOLD = 0.82;
const DEFAULT_NOISE_FLOOR = 0.008;

/**
 * High-performance Audio Engine for microphone capture, real-time DSP,
 * and guitar pitch detection.
 */
export class AudioEngine {
  private static instance: AudioEngine | null = null;

  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private pitchDetector: YinPitchDetector;

  private timeDomainData: Float32Array<ArrayBuffer>;
  private animationFrameId: number | null = null;
  private isProcessing = false;

  private state: AudioEngineState = {
    status: 'stopped',
    rms: 0,
    peak: 0,
    noiseFloor: DEFAULT_NOISE_FLOOR,
    isSilent: true,
    sampleRate: 44100,
  };

  private clarityThreshold: number;
  private pitchCallbacks: Set<PitchCallback> = new Set();
  private stateCallbacks: Set<StateCallback> = new Set();

  private constructor(config: AudioEngineConfig = {}) {
    const fftSize = config.fftSize ?? DEFAULT_FFT_SIZE;
    this.clarityThreshold = config.clarityThreshold ?? DEFAULT_CLARITY_THRESHOLD;
    this.state.noiseFloor = config.defaultNoiseFloor ?? DEFAULT_NOISE_FLOOR;

    this.pitchDetector = new YinPitchDetector({
      rmsThreshold: this.state.noiseFloor,
    });
    this.timeDomainData = new Float32Array(
      new ArrayBuffer(fftSize * Float32Array.BYTES_PER_ELEMENT)
    );
  }

  /**
   * Returns the singleton instance of the AudioEngine.
   */
  public static getInstance(config?: AudioEngineConfig): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine(config);
    }
    return AudioEngine.instance;
  }

  /**
   * Initializes the AudioContext and acquires microphone access.
   * Disables voice-oriented DSP (echo cancellation, AGC, noise suppression)
   * to preserve raw guitar harmonics.
   */
  public async init(micDeviceId?: string): Promise<void> {
    try {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        await this.stop();
      }

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      this.audioCtx = new AudioContextClass({
        latencyHint: 'interactive',
      });

      this.pitchDetector.setSampleRate(this.audioCtx.sampleRate);
      this.updateState({ sampleRate: this.audioCtx.sampleRate });

      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          channelCount: 1,
          ...(micDeviceId ? { deviceId: { exact: micDeviceId } } : {}),
        },
        video: false,
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = DEFAULT_FFT_SIZE;
      this.analyserNode.smoothingTimeConstant = 0; // Pure raw snapshot without smoothing

      this.sourceNode.connect(this.analyserNode);

      const activeTrack = this.mediaStream.getAudioTracks()[0];
      const settings = activeTrack?.getSettings();
      this.updateState({
        selectedDeviceId: settings?.deviceId ?? micDeviceId,
        status: 'stopped',
        errorMessage: undefined,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.updateState({
        status: 'error',
        errorMessage: errorMsg,
      });
      throw err;
    }
  }

  /**
   * Starts the real-time pitch detection processing loop.
   */
  public async start(): Promise<void> {
    if (!this.audioCtx || !this.analyserNode) {
      await this.init();
    }

    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.isProcessing = true;
    this.updateState({ status: 'running' });
    this.processLoop();
  }

  /**
   * Pauses pitch detection without tearing down microphone stream.
   */
  public pause(): void {
    this.isProcessing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.updateState({ status: 'paused' });
    this.notifyPitch(null);
  }

  /**
   * Stops processing and releases microphone stream and audio nodes.
   */
  public async stop(): Promise<void> {
    this.isProcessing = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      await this.audioCtx.close();
      this.audioCtx = null;
    }

    this.updateState({
      status: 'stopped',
      rms: 0,
      peak: 0,
      isSilent: true,
    });
    this.notifyPitch(null);
  }

  /**
   * Measures ambient background room noise for a given duration
   * and automatically adjusts the noise floor threshold.
   */
  public async calibrate(durationMs: number = 1500): Promise<number> {
    if (!this.analyserNode) {
      await this.init();
    }

    const sampleCount = Math.max(10, Math.floor(durationMs / 50));
    let totalRms = 0;
    let maxRms = 0;

    for (let i = 0; i < sampleCount; i++) {
      if (this.analyserNode) {
        this.analyserNode.getFloatTimeDomainData(this.timeDomainData);
        const rms = YinPitchDetector.computeRMS(this.timeDomainData);
        totalRms += rms;
        if (rms > maxRms) maxRms = rms;
      }
      await new Promise((resolve) => setTimeout(resolve, durationMs / sampleCount));
    }

    const avgRms = totalRms / sampleCount;
    // Set threshold slightly above peak noise floor with headroom factor of 1.4
    const calibratedNoiseFloor = Math.max(0.005, Math.min(0.05, maxRms * 1.4 || avgRms * 1.8));

    this.setNoiseFloor(calibratedNoiseFloor);
    return calibratedNoiseFloor;
  }

  /**
   * Core processing loop executed on every animation frame for low latency.
   */
  private processLoop = (): void => {
    if (!this.isProcessing || !this.analyserNode) {
      return;
    }

    this.analyserNode.getFloatTimeDomainData(this.timeDomainData);

    const rms = YinPitchDetector.computeRMS(this.timeDomainData);
    const peak = YinPitchDetector.computePeak(this.timeDomainData);
    const isSilent = rms < this.state.noiseFloor;

    this.updateState({
      rms: Math.round(rms * 1000) / 1000,
      peak: Math.round(peak * 1000) / 1000,
      isSilent,
    });

    if (isSilent) {
      this.notifyPitch(null);
    } else {
      const result = this.pitchDetector.detect(this.timeDomainData);

      if (result.freq > 0 && result.clarity >= this.clarityThreshold) {
        const noteInfo = frequencyToNote(result.freq);
        const posGuess = guessBestGuitarPosition(noteInfo.noteName, noteInfo.octave);

        const detected: DetectedPitch = {
          freq: result.freq,
          noteName: noteInfo.noteName,
          octave: noteInfo.octave,
          cents: noteInfo.cents,
          clarity: result.clarity,
          stringGuess: posGuess?.stringIndex,
          fretGuess: posGuess?.fret,
        };

        this.notifyPitch(detected);
      } else {
        this.notifyPitch(null);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.processLoop);
  };

  public onPitchDetected(callback: PitchCallback): () => void {
    this.pitchCallbacks.add(callback);
    return () => this.pitchCallbacks.delete(callback);
  }

  public onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    callback(this.state);
    return () => this.stateCallbacks.delete(callback);
  }

  public getState(): AudioEngineState {
    return { ...this.state };
  }

  public getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  public setNoiseFloor(threshold: number): void {
    const validThreshold = Math.max(0.001, threshold);
    this.pitchDetector.setRmsThreshold(validThreshold);
    this.updateState({ noiseFloor: validThreshold });
  }

  public setClarityThreshold(threshold: number): void {
    this.clarityThreshold = Math.max(0.1, Math.min(0.99, threshold));
  }

  public async setInputDevice(deviceId: string): Promise<void> {
    const wasRunning = this.state.status === 'running';
    await this.init(deviceId);
    if (wasRunning) {
      await this.start();
    }
  }

  public static async getAvailableInputDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  }

  private updateState(partial: Partial<AudioEngineState>): void {
    this.state = { ...this.state, ...partial };
    for (const cb of this.stateCallbacks) {
      cb(this.state);
    }
  }

  private notifyPitch(pitch: DetectedPitch | null): void {
    for (const cb of this.pitchCallbacks) {
      cb(pitch);
    }
  }
}

export const audioEngine = AudioEngine.getInstance();
