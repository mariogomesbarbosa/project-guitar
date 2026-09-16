/**
 * Types and Constants for Rocksmith-style 3D Guitar Rhythm Game.
 */

export type JudgmentType = 'perfect' | 'good' | 'miss';

export interface LessonNote {
  /** Unique note identifier */
  id: string;
  /** Exact time in seconds when this note reaches the strike line */
  timeSeconds: number;
  /** Guitar string index (1 = High E, ..., 6 = Low E) */
  stringIndex: number;
  /** Fret number: 0 = open string, 1 to 15+ */
  fret: number;
  /** Note name with octave (e.g. 'E2', 'A2', 'C3', 'G3') */
  noteName: string;
  /** Optional sustain duration in seconds (0 for staccato / standard pick) */
  duration?: number;
}

export interface HitResult {
  noteId: string;
  judgment: JudgmentType;
  /** Difference in milliseconds: (hitTime - expectedTime) * 1000 */
  timeDeltaMs: number;
  /** Score points awarded for this hit */
  scorePoints: number;
  /** Timestamp when hit occurred */
  hitTime: number;
  stringIndex: number;
  fret: number;
  noteName: string;
}

export interface HitFeedbackItem {
  id: string;
  position: [number, number, number];
  color: string;
  judgment: JudgmentType;
  score: number;
  createdAt: number;
  duration: number;
}

export interface GameplayStats {
  score: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  hitsCount: {
    perfect: number;
    good: number;
    miss: number;
  };
  totalNotes: number;
  processedNotes: number;
  accuracy: number;
}

export interface SongData {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  durationSeconds: number;
  notes: LessonNote[];
  audioUrl?: string;
}

/**
 * Rocksmith Canonical Color Palette for 6 Strings:
 * String 6 (E2, Low E): Red (#ef4444)
 * String 5 (A2): Yellow (#eab308)
 * String 4 (D3): Azul (#3b82f6)
 * String 3 (G3): Laranja (#f97316)
 * String 2 (B3): Verde (#22c55e)
 * String 1 (E4, High E): Roxo (#a855f7)
 */
export interface GuitarStringVisual {
  stringIndex: number;
  noteName: string;
  octave: number;
  label: string;
  color: string;
  hexNumber: number;
  thickness: number;
  freq: number;
}

export const STRING_VISUALS: Record<number, GuitarStringVisual> = {
  6: {
    stringIndex: 6,
    noteName: 'E',
    octave: 2,
    label: '6th (Low E)',
    color: '#ef4444',
    hexNumber: 0xef4444,
    thickness: 0.052,
    freq: 82.41,
  },
  5: {
    stringIndex: 5,
    noteName: 'A',
    octave: 2,
    label: '5th (A)',
    color: '#eab308',
    hexNumber: 0xeab308,
    thickness: 0.044,
    freq: 110.0,
  },
  4: {
    stringIndex: 4,
    noteName: 'D',
    octave: 3,
    label: '4th (D)',
    color: '#3b82f6',
    hexNumber: 0x3b82f6,
    thickness: 0.038,
    freq: 146.83,
  },
  3: {
    stringIndex: 3,
    noteName: 'G',
    octave: 3,
    label: '3rd (G)',
    color: '#f97316',
    hexNumber: 0xf97316,
    thickness: 0.032,
    freq: 196.0,
  },
  2: {
    stringIndex: 2,
    noteName: 'B',
    octave: 3,
    label: '2nd (B)',
    color: '#22c55e',
    hexNumber: 0x22c55e,
    thickness: 0.026,
    freq: 246.94,
  },
  1: {
    stringIndex: 1,
    noteName: 'E',
    octave: 4,
    label: '1st (High E)',
    color: '#a855f7',
    hexNumber: 0xa855f7,
    thickness: 0.02,
    freq: 329.63,
  },
};

/**
 * Hit Timing Windows in seconds.
 * Perfect: within +-70ms
 * Good: within +-150ms
 */
export const HIT_WINDOWS = {
  PERFECT_SEC: 0.07,
  GOOD_SEC: 0.15,
} as const;

export const SCORING = {
  PERFECT: 100,
  GOOD: 50,
  MISS: 0,
} as const;

/**
 * Geometry Layout Configuration for the Fretboard
 */
export const FRETBOARD_CONFIG = {
  totalFrets: 12,
  neckLength: 14.0,
  neckWidth: 2.6,
  neckThickness: 0.28,
  stringSpacing: 0.38,
  /** Y position baseline for strings */
  stringElevation: 0.16,
  /** Highway travel speed (units per second) */
  noteSpeed: 8.0,
  /** Distance in seconds visible in highway before hitting strike line */
  spawnAheadSeconds: 3.5,
  /** Inlay markers on frets (dots) */
  singleDotFrets: [3, 5, 7, 9],
  doubleDotFrets: [12],
};

/**
 * Computes the X coordinate along the fretboard for a given fret (0 to 12+).
 * Fret 0 is at the Nut. Frets follow natural acoustic logarithmic tapering.
 */
export function getFretXPosition(fret: number, _totalFrets: number = 12, length: number = 14.0): number {
  if (fret <= 0) {
    // Nut position
    return -length / 2 + 0.1;
  }
  const scale = length * 1.35;
  const startX = -length / 2 + 0.1;
  const fretRatio = 1 - Math.pow(2, -fret / 12);
  return startX + fretRatio * (scale * 0.72);
}

/**
 * Computes the center position between two fret bars (where player fingers the string).
 */
export function getFretCenterPosition(fret: number, totalFrets: number = 12, length: number = 14.0): number {
  if (fret <= 0) {
    return -length / 2 - 0.4; // Open string zone before nut
  }
  const currentFretX = getFretXPosition(fret, totalFrets, length);
  const prevFretX = getFretXPosition(fret - 1, totalFrets, length);
  return (currentFretX + prevFretX) / 2;
}

/**
 * Computes the Y coordinate for a given string index (1 to 6).
 * String 6 (Low E) is at the top (+Y), String 1 (High E) is at the bottom (-Y).
 */
export function getStringYPosition(stringIndex: number, spacing: number = 0.38): number {
  // stringIndex 1 (bottom) to 6 (top)
  // Index 6 -> +2.5 * spacing, Index 1 -> -2.5 * spacing
  return (stringIndex - 3.5) * spacing;
}
