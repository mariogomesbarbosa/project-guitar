import type { GuitarPosition, GuitarString, NoteInfo } from './types.ts';

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

/**
 * Standard Guitar Strings in E Standard Tuning (E2-A2-D3-G3-B3-E4).
 * Ordered from String 1 (thinnest / highest pitch) to String 6 (thickest / lowest pitch).
 */
export const GUITAR_STRINGS: readonly GuitarString[] = [
  {
    stringIndex: 1,
    standardNote: 'E4',
    standardFreq: 329.63,
    name: '1st String (High E)',
    openMidi: 64,
  },
  {
    stringIndex: 2,
    standardNote: 'B3',
    standardFreq: 246.94,
    name: '2nd String (B)',
    openMidi: 59,
  },
  {
    stringIndex: 3,
    standardNote: 'G3',
    standardFreq: 196.00,
    name: '3rd String (G)',
    openMidi: 55,
  },
  {
    stringIndex: 4,
    standardNote: 'D3',
    standardFreq: 146.83,
    name: '4th String (D)',
    openMidi: 50,
  },
  {
    stringIndex: 5,
    standardNote: 'A2',
    standardFreq: 110.00,
    name: '5th String (A)',
    openMidi: 45,
  },
  {
    stringIndex: 6,
    standardNote: 'E2',
    standardFreq: 82.41,
    name: '6th String (Low E)',
    openMidi: 40,
  },
];

/**
 * Converts a frequency in Hz to musical note information using standard MIDI formula:
 * midi = 69 + 12 * log2(freq / 440)
 */
export function frequencyToNote(freq: number): NoteInfo {
  if (freq <= 0 || !Number.isFinite(freq)) {
    return {
      noteName: 'C',
      octave: 0,
      label: 'C0',
      midi: 0,
      exactMidi: 0,
      cents: 0,
      targetFreq: 0,
    };
  }

  const exactMidi = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exactMidi);
  const cents = Math.round((exactMidi - midi) * 100);

  const noteIndex = ((midi % 12) + 12) % 12;
  const noteName = NOTE_NAMES[noteIndex];
  const octave = Math.floor(midi / 12) - 1;
  const label = `${noteName}${octave}`;
  const targetFreq = midiToFrequency(midi);

  return {
    noteName,
    octave,
    label,
    midi,
    exactMidi,
    cents,
    targetFreq,
  };
}

/**
 * Converts a MIDI note number to its exact fundamental frequency (A4 = 440Hz).
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Converts a note name (e.g. 'A' or 'F#') and octave to MIDI note number.
 */
export function noteToMidi(noteName: string, octave: number): number {
  const normalized = noteName.trim().toUpperCase();
  const index = NOTE_NAMES.indexOf(normalized as NoteName);
  if (index === -1) {
    throw new Error(`Invalid note name: "${noteName}". Expected one of: ${NOTE_NAMES.join(', ')}`);
  }
  return (octave + 1) * 12 + index;
}

/**
 * Finds all guitar positions (string and fret) for a given note and octave.
 * Default maxFret is 12.
 */
export function findGuitarPositions(
  noteName: string,
  octave: number,
  maxFret: number = 12
): GuitarPosition[] {
  const targetMidi = noteToMidi(noteName, octave);
  const positions: GuitarPosition[] = [];

  for (const guitarString of GUITAR_STRINGS) {
    const fret = targetMidi - guitarString.openMidi;
    if (fret >= 0 && fret <= maxFret) {
      positions.push({
        stringIndex: guitarString.stringIndex,
        fret,
      });
    }
  }

  // Sort logically: lower frets / natural positions first
  return positions.sort((a, b) => a.fret - b.fret);
}

/**
 * Finds the closest open guitar string to the detected frequency.
 */
export function findClosestGuitarString(freq: number): {
  guitarString: GuitarString;
  centsDiff: number;
  freqDiff: number;
} {
  let closestString = GUITAR_STRINGS[0];
  let minAbsCents = Infinity;
  let signedCentsDiff = 0;
  let freqDiff = 0;

  for (const s of GUITAR_STRINGS) {
    const cents = 1200 * Math.log2(freq / s.standardFreq);
    const absCents = Math.abs(cents);
    if (absCents < minAbsCents) {
      minAbsCents = absCents;
      closestString = s;
      signedCentsDiff = cents;
      freqDiff = freq - s.standardFreq;
    }
  }

  return {
    guitarString: closestString,
    centsDiff: Math.round(signedCentsDiff),
    freqDiff: Math.round(freqDiff * 100) / 100,
  };
}

/**
 * Guesses the most likely guitar string and fret for a detected frequency,
 * prioritizing open strings or lower fret positions.
 */
export function guessBestGuitarPosition(
  noteName: string,
  octave: number,
  maxFret: number = 12
): GuitarPosition | undefined {
  const positions = findGuitarPositions(noteName, octave, maxFret);
  if (positions.length === 0) return undefined;

  // Prioritize open string (fret 0) or frets between 1 and 5 (first position)
  const firstPos = positions.find((p) => p.fret <= 5);
  return firstPos ?? positions[0];
}
