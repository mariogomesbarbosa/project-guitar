export type LessonDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type LessonCategory = 'strings' | 'frets' | 'riffs' | 'chords';

export interface LessonNote {
  id: string;
  stringIndex: number; // 1 (High E) to 6 (Low E)
  fret: number; // 0 = open string, 1, 2, 3...
  noteName: string; // e.g. 'E', 'A', 'D', 'G', 'B', 'C'
  octave: number; // e.g. 2, 3, 4
  fullLabel: string; // e.g. 'E2', 'A2', 'C4'
  beat: number; // Beat position in the lesson
  durationBeats: number; // Duration in beats (e.g. 1, 2, 4)
  chordName?: string; // e.g. 'Em', 'Asus2'
  finger?: number; // 1=index, 2=middle, 3=ring, 4=pinky
}

export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: LessonCategory;
  difficulty: LessonDifficulty;
  bpm: number;
  timeSignature: [number, number]; // e.g. [4, 4]
  notes: LessonNote[];
  tip: string;
  estimatedDurationSec: number;
}

export interface StringStyle {
  index: number;
  noteName: string;
  openFreq: number;
  name: string;
  colorHex: string;
  colorGlow: string;
  label: string;
}

export const GUITAR_STRING_STYLES: readonly StringStyle[] = [
  {
    index: 6,
    noteName: 'E2',
    openFreq: 82.41,
    name: '6ª Corda (Mi Grave)',
    label: 'E',
    colorHex: '#ef4444',
    colorGlow: 'rgba(239, 68, 68, 0.4)',
  },
  {
    index: 5,
    noteName: 'A2',
    openFreq: 110.0,
    name: '5ª Corda (Lá)',
    label: 'A',
    colorHex: '#eab308',
    colorGlow: 'rgba(234, 179, 8, 0.4)',
  },
  {
    index: 4,
    noteName: 'D3',
    openFreq: 146.83,
    name: '4ª Corda (Ré)',
    label: 'D',
    colorHex: '#3b82f6',
    colorGlow: 'rgba(59, 130, 246, 0.4)',
  },
  {
    index: 3,
    noteName: 'G3',
    openFreq: 196.0,
    name: '3ª Corda (Sol)',
    label: 'G',
    colorHex: '#f97316',
    colorGlow: 'rgba(249, 115, 22, 0.4)',
  },
  {
    index: 2,
    noteName: 'B3',
    openFreq: 246.94,
    name: '2ª Corda (Si)',
    label: 'B',
    colorHex: '#10b981',
    colorGlow: 'rgba(16, 185, 129, 0.4)',
  },
  {
    index: 1,
    noteName: 'E4',
    openFreq: 329.63,
    name: '1ª Corda (Mi Agudo)',
    label: 'e',
    colorHex: '#a855f7',
    colorGlow: 'rgba(168, 85, 247, 0.4)',
  },
] as const;
