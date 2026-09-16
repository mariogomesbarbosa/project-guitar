import type { SongData } from './types.ts';

/**
 * Famous beginner practice riff: "Smoke on the Water" (G Minor Pentatonic on 6th & 5th strings).
 */
export const SMOKE_ON_THE_WATER_RIFF: SongData = {
  id: 'smoke-on-the-water',
  title: 'Smoke on the Water (Intro Riff)',
  artist: 'Deep Purple',
  bpm: 112,
  durationSeconds: 16.0,
  notes: [
    // Phrase 1: 0 - 3 - 5
    { id: 'note-1', timeSeconds: 1.5, stringIndex: 6, fret: 0, noteName: 'E2', duration: 0.3 },
    { id: 'note-2', timeSeconds: 2.2, stringIndex: 6, fret: 3, noteName: 'G2', duration: 0.3 },
    { id: 'note-3', timeSeconds: 2.9, stringIndex: 6, fret: 5, noteName: 'A2', duration: 0.5 },

    // Phrase 2: 0 - 3 - 6 - 5
    { id: 'note-4', timeSeconds: 4.2, stringIndex: 6, fret: 0, noteName: 'E2', duration: 0.3 },
    { id: 'note-5', timeSeconds: 4.9, stringIndex: 6, fret: 3, noteName: 'G2', duration: 0.3 },
    { id: 'note-6', timeSeconds: 5.5, stringIndex: 6, fret: 6, noteName: 'A#2', duration: 0.2 },
    { id: 'note-7', timeSeconds: 5.9, stringIndex: 6, fret: 5, noteName: 'A2', duration: 0.6 },

    // Phrase 3: 0 - 3 - 5 - 3 - 0
    { id: 'note-8', timeSeconds: 7.2, stringIndex: 6, fret: 0, noteName: 'E2', duration: 0.3 },
    { id: 'note-9', timeSeconds: 7.9, stringIndex: 6, fret: 3, noteName: 'G2', duration: 0.3 },
    { id: 'note-10', timeSeconds: 8.6, stringIndex: 6, fret: 5, noteName: 'A2', duration: 0.4 },
    { id: 'note-11', timeSeconds: 9.3, stringIndex: 6, fret: 3, noteName: 'G2', duration: 0.3 },
    { id: 'note-12', timeSeconds: 10.0, stringIndex: 6, fret: 0, noteName: 'E2', duration: 0.8 },

    // 5th string (A) accent transition
    { id: 'note-13', timeSeconds: 11.5, stringIndex: 5, fret: 2, noteName: 'B2', duration: 0.4 },
    { id: 'note-14', timeSeconds: 12.3, stringIndex: 5, fret: 5, noteName: 'D3', duration: 0.4 },
    { id: 'note-15', timeSeconds: 13.2, stringIndex: 5, fret: 7, noteName: 'E3', duration: 0.8 },
  ],
};

/**
 * 6-String Color Orientation Exercise (tests all 6 strings and canonical colors).
 */
export const SIX_STRINGS_TEST_EXERCISE: SongData = {
  id: 'six-strings-demo',
  title: '6-String Rocksmith Palette Tour',
  artist: 'Interactive Guitar Lab',
  bpm: 100,
  durationSeconds: 12.0,
  notes: [
    // String 6 (Red, E2)
    { id: 's6-open', timeSeconds: 1.0, stringIndex: 6, fret: 0, noteName: 'E2', duration: 0.4 },
    { id: 's6-fret3', timeSeconds: 2.0, stringIndex: 6, fret: 3, noteName: 'G2', duration: 0.4 },

    // String 5 (Yellow, A2)
    { id: 's5-open', timeSeconds: 3.0, stringIndex: 5, fret: 0, noteName: 'A2', duration: 0.4 },
    { id: 's5-fret2', timeSeconds: 4.0, stringIndex: 5, fret: 2, noteName: 'B2', duration: 0.4 },

    // String 4 (Blue, D3)
    { id: 's4-open', timeSeconds: 5.0, stringIndex: 4, fret: 0, noteName: 'D3', duration: 0.4 },
    { id: 's4-fret2', timeSeconds: 6.0, stringIndex: 4, fret: 2, noteName: 'E3', duration: 0.4 },

    // String 3 (Orange, G3)
    { id: 's3-open', timeSeconds: 7.0, stringIndex: 3, fret: 0, noteName: 'G3', duration: 0.4 },
    { id: 's3-fret2', timeSeconds: 8.0, stringIndex: 3, fret: 2, noteName: 'A3', duration: 0.4 },

    // String 2 (Green, B3)
    { id: 's2-open', timeSeconds: 9.0, stringIndex: 2, fret: 0, noteName: 'B3', duration: 0.4 },

    // String 1 (Purple, E4)
    { id: 's1-open', timeSeconds: 10.0, stringIndex: 1, fret: 0, noteName: 'E4', duration: 0.6 },
  ],
};
