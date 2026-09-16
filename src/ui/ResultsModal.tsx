import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/useGameStore.ts';
import { SAMPLE_LESSONS } from '../lessons/sampleLessons.ts';
import {
  Star,
  Trophy,
  RotateCcw,
  ArrowRight,
  Menu,
  Flame,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const ResultsModal: React.FC = () => {
  const {
    currentLesson,
    score,
    accuracy,
    maxStreak,
    hits,
    misses,
    restartLesson,
    startLesson,
    setMode,
  } = useGameStore();

  // Determine star rating:
  // >= 90% = 3 stars
  // >= 70% = 2 stars
  // >= 45% = 1 star
  // < 45% = 0 stars
  const starsCount = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 45 ? 1 : 0;

  // Find next lesson
  const currentLessonIndex = SAMPLE_LESSONS.findIndex(
    (l) => l.id === currentLesson?.id
  );
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < SAMPLE_LESSONS.length - 1
      ? SAMPLE_LESSONS[currentLessonIndex + 1]
      : null;

  useEffect(() => {
    // Fire festive celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'],
      });
      const timer = setTimeout(() => {
        if (starsCount >= 2) {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    } catch (e) {
      console.warn('Confetti launch error:', e);
    }
  }, [starsCount]);

  const getEncouragement = () => {
    if (accuracy >= 95) return 'Mestre da Guitarra! Execução impecável!';
    if (accuracy >= 80) return 'Excelente Ritmo e Afinação! Continue assim!';
    if (accuracy >= 60) return 'Muito Bom! Cada dia mais perto da perfeição!';
    return 'Bom treino! A repetição é a mãe da agilidade!';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-xl select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col items-center text-center">
        {/* Top Trophy Icon */}
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-8 h-8 text-zinc-950" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-300 animate-pulse" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
          Lição Concluída!
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mb-6">
          {currentLesson?.title || 'Exercício'}
        </p>

        {/* 3 Stars Visual */}
        <div className="flex items-center gap-3 mb-6">
          {[1, 2, 3].map((starIndex) => {
            const isEarned = starIndex <= starsCount;
            return (
              <div
                key={starIndex}
                className={`p-3 rounded-2xl transition-all duration-300 ${
                  isEarned
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-400/50 scale-110 shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-800/60 text-zinc-600 border border-zinc-700/40'
                }`}
              >
                <Star
                  className={`w-7 h-7 sm:w-8 sm:h-8 ${
                    isEarned ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Motivational Message */}
        <div className="text-sm font-semibold text-emerald-400 mb-6 px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
          {getEncouragement()}
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8 text-left">
          {/* Score */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Pontos</span>
            <div className="text-lg font-black font-mono text-white mt-0.5">
              {score.toLocaleString()}
            </div>
          </div>

          {/* Accuracy */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Precisão</span>
            <div
              className={`text-lg font-black font-mono mt-0.5 ${
                accuracy >= 80
                  ? 'text-emerald-400'
                  : accuracy >= 60
                  ? 'text-amber-400'
                  : 'text-red-400'
              }`}
            >
              {accuracy}%
            </div>
          </div>

          {/* Max Streak */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-400" /> Combo Max
            </span>
            <div className="text-lg font-black font-mono text-white mt-0.5">
              {maxStreak}
            </div>
          </div>

          {/* Hits vs Misses */}
          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Acertos</span>
            <div className="text-xs font-mono font-bold mt-1 flex items-center gap-2">
              <span className="text-emerald-400 flex items-center gap-0.5">
                <Check className="w-3 h-3" /> {hits}
              </span>
              <span className="text-red-400 flex items-center gap-0.5">
                <X className="w-3 h-3" /> {misses}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {nextLesson && (
            <button
              onClick={() => startLesson(nextLesson)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 text-white font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-98"
            >
              <span>Próxima Lição: {nextLesson.title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <div className="w-full grid grid-cols-2 gap-2.5">
            <button
              onClick={restartLesson}
              className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm border border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Tentar Novamente
            </button>

            <button
              onClick={() => setMode('home')}
              className="py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm border border-zinc-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Menu className="w-4 h-4" />
              Menu de Lições
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
