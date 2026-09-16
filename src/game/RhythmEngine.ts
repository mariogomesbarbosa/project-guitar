import type { AudioEngine } from '../audio/AudioEngine.ts';
import type { DetectedPitch } from '../audio/types.ts';
import {
  HIT_WINDOWS,
  SCORING,
  type GameplayStats,
  type HitResult,
  type JudgmentType,
  type LessonNote,
  type SongData,
} from './types.ts';

export type NoteHitCallback = (result: HitResult) => void;
export type NoteMissCallback = (note: LessonNote) => void;
export type ScoreUpdateCallback = (stats: GameplayStats) => void;
export type TimeUpdateCallback = (currentTime: number) => void;

export interface RhythmEngineOptions {
  audioEngine?: AudioEngine;
  /** Audio latency compensation offset in seconds (e.g. 0.035 for 35ms) */
  latencyCompensation?: number;
}

/**
 * High-precision Rhythm Game Engine.
 * Synchronizes playback with Web Audio clock, evaluates note timings,
 * tracks combos, multipliers, and fires visual feedback events.
 */
export class RhythmEngine {
  private notes: LessonNote[] = [];
  private processedNoteIds = new Set<string>();
  private activeNoteIndex = 0;

  private isPlaying = false;
  private isPaused = false;
  private playbackStartTime = 0;
  private pauseTime = 0;
  private latencyCompensation = 0.0; // Seconds

  private currentSong: SongData | null = null;
  private animationFrameId: number | null = null;
  private audioEngine?: AudioEngine;
  private unsubscribePitchDetection?: () => void;

  // Gameplay Statistics
  private stats: GameplayStats = {
    score: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    hitsCount: {
      perfect: 0,
      good: 0,
      miss: 0,
    },
    totalNotes: 0,
    processedNotes: 0,
    accuracy: 100,
  };

  // Event Callbacks
  private onHitListeners = new Set<NoteHitCallback>();
  private onMissListeners = new Set<NoteMissCallback>();
  private onScoreListeners = new Set<ScoreUpdateCallback>();
  private onTimeListeners = new Set<TimeUpdateCallback>();

  constructor(options?: RhythmEngineOptions) {
    this.audioEngine = options?.audioEngine;
    this.latencyCompensation = options?.latencyCompensation ?? 0.0;
  }

  /**
   * Sets or updates latency compensation offset in seconds.
   */
  public setLatencyCompensation(seconds: number): void {
    this.latencyCompensation = seconds;
  }

  /**
   * Loads a song or practice lesson.
   */
  public loadLesson(song: SongData): void {
    this.stop();
    this.currentSong = song;
    // Sort notes chronologically
    this.notes = [...song.notes].sort((a, b) => a.timeSeconds - b.timeSeconds);
    this.resetStats();
  }

  /**
   * Starts playback synchronized to AudioContext or high-res performance clock.
   */
  public start(): void {
    if (this.isPlaying) return;

    const clockTime = this.getClockTime();
    if (this.isPaused) {
      // Resume from paused position
      this.playbackStartTime = clockTime - this.pauseTime;
      this.isPaused = false;
    } else {
      this.playbackStartTime = clockTime;
      this.resetStats();
    }

    this.isPlaying = true;

    // Attach to AudioEngine pitch events if available
    if (this.audioEngine && !this.unsubscribePitchDetection) {
      this.unsubscribePitchDetection = this.audioEngine.onPitchDetected((pitch) => {
        if (pitch) {
          this.evaluateDetectedPitch(pitch);
        }
      });
    }

    this.tick();
  }

  /**
   * Pauses the playback timeline.
   */
  public pause(): void {
    if (!this.isPlaying || this.isPaused) return;

    this.pauseTime = this.getCurrentTime();
    this.isPaused = true;
    this.isPlaying = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Stops playback and resets timeline.
   */
  public stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.unsubscribePitchDetection) {
      this.unsubscribePitchDetection();
      this.unsubscribePitchDetection = undefined;
    }

    this.resetStats();
    this.notifyTime(0);
  }

  /**
   * Evaluates a detected pitch from the audio DSP engine against current expected notes.
   */
  public evaluateDetectedPitch(pitch: DetectedPitch): HitResult | null {
    if (!this.isPlaying) return null;

    // Pitch clarity check
    if (pitch.clarity < 0.7) return null;

    const currentTime = this.getCurrentTime();
    const hitWindowMax = HIT_WINDOWS.GOOD_SEC;

    // Find candidate notes in active hit window
    for (let i = this.activeNoteIndex; i < this.notes.length; i++) {
      const note = this.notes[i];
      if (this.processedNoteIds.has(note.id)) continue;

      const timeDelta = currentTime - note.timeSeconds;

      // Note is too far in the future
      if (timeDelta < -hitWindowMax) break;

      // Note is past hit window
      if (timeDelta > hitWindowMax) continue;

      // Check note match:
      // 1) String & fret match
      const stringMatches =
        pitch.stringGuess === undefined || pitch.stringGuess === note.stringIndex;
      const fretMatches = pitch.fretGuess === undefined || pitch.fretGuess === note.fret;

      // 2) Musical note pitch name match (e.g., 'E', 'A', 'G')
      const noteMatches =
        pitch.noteName === note.noteName ||
        note.noteName.startsWith(pitch.noteName) ||
        (stringMatches && fretMatches);

      if (stringMatches && fretMatches && noteMatches) {
        return this.triggerHit(note, timeDelta, currentTime);
      }
    }

    return null;
  }

  /**
   * Triggers a hit check for a specific string and fret (used for controller, keyboard, or touch input).
   */
  public triggerFretHit(stringIndex: number, fret: number): HitResult | null {
    if (!this.isPlaying) return null;

    const currentTime = this.getCurrentTime();
    const hitWindowMax = HIT_WINDOWS.GOOD_SEC;

    for (let i = this.activeNoteIndex; i < this.notes.length; i++) {
      const note = this.notes[i];
      if (this.processedNoteIds.has(note.id)) continue;

      const timeDelta = currentTime - note.timeSeconds;

      if (timeDelta < -hitWindowMax) break;
      if (timeDelta > hitWindowMax) continue;

      if (note.stringIndex === stringIndex && note.fret === fret) {
        return this.triggerHit(note, timeDelta, currentTime);
      }
    }

    return null;
  }

  /**
   * Computes score points and applies a hit to the given note.
   */
  private triggerHit(note: LessonNote, timeDelta: number, hitTime: number): HitResult {
    this.processedNoteIds.add(note.id);

    const absDelta = Math.abs(timeDelta);
    let judgment: JudgmentType = 'good';
    let baseScore: number = SCORING.GOOD;

    if (absDelta <= HIT_WINDOWS.PERFECT_SEC) {
      judgment = 'perfect';
      baseScore = SCORING.PERFECT;
    }

    // Update streak and multiplier
    const newCombo = this.stats.combo + 1;
    const maxCombo = Math.max(this.stats.maxCombo, newCombo);
    const multiplier = this.computeMultiplier(newCombo);
    const scorePoints = baseScore * multiplier;

    this.stats.score += scorePoints;
    this.stats.combo = newCombo;
    this.stats.maxCombo = maxCombo;
    this.stats.multiplier = multiplier;
    this.stats.hitsCount[judgment] += 1;
    this.stats.processedNotes += 1;
    this.updateAccuracy();

    const hitResult: HitResult = {
      noteId: note.id,
      judgment,
      timeDeltaMs: Math.round(timeDelta * 1000),
      scorePoints,
      hitTime,
      stringIndex: note.stringIndex,
      fret: note.fret,
      noteName: note.noteName,
    };

    this.notifyHit(hitResult);
    this.notifyScore();

    return hitResult;
  }

  /**
   * Main gameplay tick running every animation frame.
   * Checks for missed notes that passed beyond the hit window without being struck.
   */
  private tick = (): void => {
    if (!this.isPlaying) return;

    const currentTime = this.getCurrentTime();
    this.notifyTime(currentTime);

    const missThreshold = HIT_WINDOWS.GOOD_SEC;

    // Check for missed notes
    while (this.activeNoteIndex < this.notes.length) {
      const note = this.notes[this.activeNoteIndex];

      // Note has not arrived at strike line yet
      if (note.timeSeconds - currentTime > -missThreshold) {
        break;
      }

      // If note was not processed and is past the strike window, it's a MISS
      if (!this.processedNoteIds.has(note.id)) {
        this.processedNoteIds.add(note.id);

        this.stats.combo = 0;
        this.stats.multiplier = 1;
        this.stats.hitsCount.miss += 1;
        this.stats.processedNotes += 1;
        this.updateAccuracy();

        this.notifyMiss(note);
        this.notifyScore();
      }

      this.activeNoteIndex++;
    }

    // Check if song finished
    if (
      this.currentSong &&
      currentTime > this.currentSong.durationSeconds + 1.0 &&
      this.activeNoteIndex >= this.notes.length
    ) {
      this.pause();
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  /**
   * Multiplier progression: 1x -> 2x (combo 10) -> 3x (combo 20) -> 4x (combo 30+)
   */
  private computeMultiplier(combo: number): number {
    if (combo >= 30) return 4;
    if (combo >= 20) return 3;
    if (combo >= 10) return 2;
    return 1;
  }

  private updateAccuracy(): void {
    const { perfect, good, miss } = this.stats.hitsCount;
    const totalHits = perfect + good + miss;
    if (totalHits === 0) {
      this.stats.accuracy = 100;
      return;
    }
    const rawAccuracy = (perfect * 1.0 + good * 0.5) / totalHits;
    this.stats.accuracy = Math.round(rawAccuracy * 1000) / 10;
  }

  /**
   * High precision clock source:
   * Uses Web Audio context if initialized and running, else high-resolution performance.now().
   */
  private getClockTime(): number {
    const audioCtx = this.audioEngine?.getAudioContext();
    if (audioCtx && audioCtx.state === 'running') {
      return audioCtx.currentTime;
    }
    return performance.now() / 1000;
  }

  /**
   * Returns current song playback time in seconds with latency compensation.
   */
  public getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.pauseTime;
    }
    const elapsed = this.getClockTime() - this.playbackStartTime;
    return Math.max(0, elapsed - this.latencyCompensation);
  }

  public getStats(): GameplayStats {
    return { ...this.stats };
  }

  public getNotes(): readonly LessonNote[] {
    return this.notes;
  }

  public getProcessedNoteIds(): ReadonlySet<string> {
    return this.processedNoteIds;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getCurrentSong(): SongData | null {
    return this.currentSong;
  }

  public onHit(cb: NoteHitCallback): () => void {
    this.onHitListeners.add(cb);
    return () => this.onHitListeners.delete(cb);
  }

  public onMiss(cb: NoteMissCallback): () => void {
    this.onMissListeners.add(cb);
    return () => this.onMissListeners.delete(cb);
  }

  public onScoreUpdate(cb: ScoreUpdateCallback): () => void {
    this.onScoreListeners.add(cb);
    cb(this.stats);
    return () => this.onScoreListeners.delete(cb);
  }

  public onTimeUpdate(cb: TimeUpdateCallback): () => void {
    this.onTimeListeners.add(cb);
    return () => this.onTimeListeners.delete(cb);
  }

  private notifyHit(result: HitResult): void {
    for (const listener of this.onHitListeners) {
      listener(result);
    }
  }

  private notifyMiss(note: LessonNote): void {
    for (const listener of this.onMissListeners) {
      listener(note);
    }
  }

  private notifyScore(): void {
    for (const listener of this.onScoreListeners) {
      listener(this.stats);
    }
  }

  private notifyTime(time: number): void {
    for (const listener of this.onTimeListeners) {
      listener(time);
    }
  }

  private resetStats(): void {
    this.processedNoteIds.clear();
    this.activeNoteIndex = 0;
    this.stats = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      hitsCount: {
        perfect: 0,
        good: 0,
        miss: 0,
      },
      totalNotes: this.notes.length,
      processedNotes: 0,
      accuracy: 100,
    };
    this.notifyScore();
  }
}
