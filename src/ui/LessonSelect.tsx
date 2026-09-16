import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore.ts';
import { SAMPLE_LESSONS } from '../lessons/sampleLessons.ts';
import type { Lesson, LessonCategory } from '../lessons/types.ts';
import {
  Play,
  Clock,
  Activity,
  Lightbulb,
  Sparkles,
  Guitar,
  CheckCircle,
  Award,
} from 'lucide-react';

export const LessonSelect: React.FC = () => {
  const { startLesson, setMode } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'Todas as Lições' },
    { id: 'strings', label: 'Cordas Soltas' },
    { id: 'frets', label: 'Primeiros Trastes' },
    { id: 'riffs', label: 'Riffs Famosos' },
    { id: 'chords', label: 'Acordes Básicos' },
  ];

  const filteredLessons = SAMPLE_LESSONS.filter((lesson) => {
    if (selectedCategory === 'all') return true;
    return lesson.category === (selectedCategory as LessonCategory);
  });

  const getDifficultyBadge = (difficulty: Lesson['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Iniciante
          </span>
        );
      case 'intermediate':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Intermediário
          </span>
        );
      case 'advanced':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            Avançado
          </span>
        );
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto select-none">
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-8 flex flex-col min-h-full">
        {/* Hero Welcome Banner */}
        <div className="shrink-0 relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-blue-950/40 border border-zinc-800 p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Método Interativo com Reconhecimento em Tempo Real
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
              Domine o Violão com Feedback Instantâneo
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6">
              Conecte seu violão ou use o microfone do computador. Toque cada nota no ritmo certo e acompanhe sua evolução nota por nota no braço 3D!
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => startLesson(SAMPLE_LESSONS[0])}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer hover:scale-105"
              >
                <Play className="w-4 h-4 fill-white" />
                Começar Primeira Lição
              </button>
              <button
                onClick={() => setMode('tuner')}
                className="px-5 py-3 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm border border-zinc-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Guitar className="w-4 h-4 text-emerald-400" />
                Afinar Instrumento
              </button>
            </div>
          </div>

          {/* Ambient background decoration */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
        </div>

        {/* Category Tabs */}
        <div className="shrink-0 flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-zinc-100 text-zinc-950 shadow-md'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lesson Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
          {filteredLessons.map((lesson, idx) => (
            <div
              key={lesson.id}
              className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 shadow-lg hover:shadow-2xl"
            >
              <div>
                {/* Header: Lesson #, Title, Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-bold text-blue-400 uppercase tracking-wider">
                      Lição #{idx + 1}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-blue-400 transition-colors">
                      {lesson.title}
                    </h3>
                  </div>
                  {getDifficultyBadge(lesson.difficulty)}
                </div>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4">
                  {lesson.description}
                </p>

                {/* Tip Box */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 mb-4 text-xs text-zinc-300">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{lesson.tip}</span>
                </div>
              </div>

              {/* Bottom Meta & Action */}
              <div className="pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{lesson.estimatedDurationSec}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    {lesson.bpm} BPM
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-zinc-500" />
                    {lesson.notes.length} Notas
                  </span>
                </div>

                <button
                  onClick={() => startLesson(lesson)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer group-hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Praticar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Encouragement */}
        <div className="shrink-0 mt-auto p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Pratique 15 minutos por dia para desenvolver memória muscular consistente.</span>
          </div>
          <button
            onClick={() => setMode('tuner')}
            className="text-blue-400 hover:text-blue-300 font-medium underline cursor-pointer"
          >
            Checar afinação antes de começar
          </button>
        </div>
      </div>
    </div>
  );
};
