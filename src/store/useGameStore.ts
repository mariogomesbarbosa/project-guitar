import { create } from 'zustand';
import type { DetectedPitch } from '../audio/types.ts';
import type { Lesson, LessonNote } from '../lessons/types.ts';
import { SAMPLE_LESSONS } from '../lessons/sampleLessons.ts';

export type AppMode = 'home' | 'tuner' | 'gameplay' | 'results';
export type HitQuality = 'perfect' | 'good' | 'miss';

export interface HitFeedback {
  id: string;
  quality: HitQuality;
  noteLabel: string;
  cents?: number;
  pointsAdded: number;
  timestamp: number;
}

export interface GameState {
  // Navigation mode
  mode: AppMode;

  // Audio & Microphone
  isMicActive: boolean;
  micRms: number;
  noiseFloor: number;
  sensitivity: number; // 0.5 to 2.0
  currentPitch: DetectedPitch | null;
  targetTunerString: number | null; // 1 to 6 or null for auto-detect

  // Gameplay session
  currentLesson: Lesson | null;
  currentNoteIndex: number;
  isPlaying: boolean;
  isPaused: boolean;

  // Score & Metrics
  score: number;
  combo: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  hits: number;
  misses: number;
  accuracy: number;
  lastFeedback: HitFeedback | null;

  // Actions
  setMode: (mode: AppMode) => void;
  setMicActive: (active: boolean) => void;
  setSensitivity: (val: number) => void;
  setTargetTunerString: (str: number | null) => void;
  updatePitch: (pitch: DetectedPitch | null, rms?: number) => void;

  selectLesson: (lesson: Lesson) => void;
  startLesson: (lesson?: Lesson) => void;
  advanceNote: () => void;
  recordHit: (quality: HitQuality, noteLabel?: string, cents?: number) => void;
  resetScore: () => void;
  togglePause: () => void;
  resumeGame: () => void;
  pauseGame: () => void;
  restartLesson: () => void;
  finishLesson: () => void;
  getCurrentNote: () => LessonNote | null;
}

function calculateMultiplier(combo: number): number {
  if (combo >= 20) return 4;
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: 'home',

  // Audio defaults
  isMicActive: false,
  micRms: 0,
  noiseFloor: 0.008,
  sensitivity: 1.0,
  currentPitch: null,
  targetTunerString: null,

  // Gameplay defaults
  currentLesson: SAMPLE_LESSONS[0],
  currentNoteIndex: 0,
  isPlaying: false,
  isPaused: false,

  // Score defaults
  score: 0,
  combo: 0,
  streak: 0,
  maxStreak: 0,
  multiplier: 1,
  hits: 0,
  misses: 0,
  accuracy: 100,
  lastFeedback: null,

  setMode: (mode) => set({ mode }),

  setMicActive: (active) => set({ isMicActive: active }),

  setSensitivity: (val) => set({ sensitivity: Math.max(0.2, Math.min(3.0, val)) }),

  setTargetTunerString: (str) => set({ targetTunerString: str }),

  updatePitch: (pitch, rms) =>
    set((state) => ({
      currentPitch: pitch,
      micRms: rms !== undefined ? rms : state.micRms,
    })),

  selectLesson: (lesson) =>
    set({
      currentLesson: lesson,
      currentNoteIndex: 0,
      score: 0,
      combo: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      hits: 0,
      misses: 0,
      accuracy: 100,
      lastFeedback: null,
      isPaused: false,
    }),

  startLesson: (lesson) => {
    const targetLesson = lesson || get().currentLesson || SAMPLE_LESSONS[0];
    set({
      currentLesson: targetLesson,
      mode: 'gameplay',
      isPlaying: true,
      isPaused: false,
      currentNoteIndex: 0,
      score: 0,
      combo: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      hits: 0,
      misses: 0,
      accuracy: 100,
      lastFeedback: null,
    });
  },

  advanceNote: () => {
    const { currentLesson, currentNoteIndex } = get();
    if (!currentLesson) return;

    if (currentNoteIndex + 1 >= currentLesson.notes.length) {
      get().finishLesson();
    } else {
      set({ currentNoteIndex: currentNoteIndex + 1 });
    }
  },

  recordHit: (quality, noteLabel = '', cents = 0) => {
    const state = get();
    const isSuccess = quality === 'perfect' || quality === 'good';
    const newHits = isSuccess ? state.hits + 1 : state.hits;
    const newMisses = !isSuccess ? state.misses + 1 : state.misses;
    const total = newHits + newMisses;
    const newAccuracy = total > 0 ? Math.round((newHits / total) * 100) : 100;

    let pointsAdded = 0;
    let newCombo = 0;
    let newStreak = 0;

    if (isSuccess) {
      newCombo = state.combo + 1;
      newStreak = state.streak + 1;
      const basePoints = quality === 'perfect' ? 100 : 50;
      pointsAdded = basePoints * state.multiplier;
    } else {
      newCombo = 0;
      newStreak = 0;
    }

    const newMultiplier = calculateMultiplier(newCombo);
    const newMaxStreak = Math.max(state.maxStreak, newStreak);

    const feedback: HitFeedback = {
      id: `${Date.now()}-${Math.random()}`,
      quality,
      noteLabel,
      cents,
      pointsAdded,
      timestamp: Date.now(),
    };

    set({
      score: state.score + pointsAdded,
      combo: newCombo,
      streak: newStreak,
      maxStreak: newMaxStreak,
      multiplier: newMultiplier,
      hits: newHits,
      misses: newMisses,
      accuracy: newAccuracy,
      lastFeedback: feedback,
    });

    // Automatically advance note
    get().advanceNote();
  },

  resetScore: () =>
    set({
      score: 0,
      combo: 0,
      streak: 0,
      maxStreak: 0,
      multiplier: 1,
      hits: 0,
      misses: 0,
      accuracy: 100,
      lastFeedback: null,
      currentNoteIndex: 0,
    }),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),

  restartLesson: () => {
    const lesson = get().currentLesson;
    if (lesson) {
      get().startLesson(lesson);
    }
  },

  finishLesson: () => {
    set({
      isPlaying: false,
      isPaused: false,
      mode: 'results',
    });
  },

  getCurrentNote: () => {
    const { currentLesson, currentNoteIndex } = get();
    if (!currentLesson || !currentLesson.notes) return null;
    return currentLesson.notes[currentNoteIndex] || null;
  },
}));
