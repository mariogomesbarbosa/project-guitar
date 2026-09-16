/**
 * Core type definitions for Audio and DSP engine.
 */

export type AudioEngineStatus = 'stopped' | 'running' | 'paused' | 'error';

export interface DetectedPitch {
  /** Detected fundamental frequency in Hertz (Hz) */
  freq: number;
  /** Musical note name with sharps (e.g., 'E', 'A', 'F#') */
  noteName: string;
  /** Scientific pitch octave (e.g., 2 for E2, 4 for A4) */
  octave: number;
  /** Pitch deviation in cents (-50 to +50) from the nearest semitone */
  cents: number;
  /** Confidence score of pitch detection (0.0 = pure noise, 1.0 = pure periodic tone) */
  clarity: number;
  /** Guessed guitar string index (1 to 6) based on proximity and standard tuning */
  stringGuess?: number;
  /** Guessed fret position (0 to 12+) on the guessed string */
  fretGuess?: number;
}

export interface GuitarString {
  /** String index: 1 (High E, 1st) to 6 (Low E, 6th) */
  stringIndex: number;
  /** Note name and octave (e.g., 'E2', 'A2', 'D3', 'G3', 'B3', 'E4') */
  standardNote: string;
  /** Fundamental frequency in Hertz (E standard tuning) */
  standardFreq: number;
  /** Human-readable string name (e.g., '6th String (Low E)') */
  name: string;
  /** Standard MIDI note number (e.g., 40 for E2, 64 for E4) */
  openMidi: number;
}

export interface GuitarPosition {
  /** String index: 1 to 6 */
  stringIndex: number;
  /** Fret number: 0 (open string) to max fret */
  fret: number;
}

export interface NoteInfo {
  /** Note name without octave (e.g., 'C', 'C#', 'D') */
  noteName: string;
  /** Octave number */
  octave: number;
  /** Full note label (e.g., 'E2', 'A4') */
  label: string;
  /** Nearest integer MIDI note number */
  midi: number;
  /** Fractional MIDI note number for high precision */
  exactMidi: number;
  /** Detuning in cents relative to nearest integer MIDI */
  cents: number;
  /** Reference frequency in Hz for this exact MIDI note */
  targetFreq: number;
}

export interface AudioEngineState {
  /** Current operating status */
  status: AudioEngineStatus;
  /** Root-mean-square amplitude [0.0, 1.0] */
  rms: number;
  /** Peak amplitude [0.0, 1.0] */
  peak: number;
  /** Estimated or calibrated ambient noise floor */
  noiseFloor: number;
  /** Whether the input level is currently below the noise threshold */
  isSilent: boolean;
  /** Active input microphone device ID */
  selectedDeviceId?: string;
  /** Sample rate of the current AudioContext in Hz */
  sampleRate: number;
  /** Error message if status === 'error' */
  errorMessage?: string;
}

export interface PitchDetectionResult {
  freq: number;
  clarity: number;
  rms: number;
  isSilent: boolean;
}
