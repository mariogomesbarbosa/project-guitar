import React from 'react';
import { useGameStore } from '../store/useGameStore.ts';
import { GUITAR_STRING_STYLES } from '../lessons/types.ts';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  Trophy,
  Flame,
  Target,
  ArrowLeft,
  Music,
} from 'lucide-react';

export const GameHUD: React.FC = () => {
  const {
    currentLesson,
    currentNoteIndex,
    score,
    combo,
    streak,
    multiplier,
    accuracy,
    hits,
    misses,
    isPaused,
    lastFeedback,
    currentPitch,
    micRms,
    togglePause,
    restartLesson,
    setMode,
    getCurrentNote,
  } = useGameStore();

  const currentTargetNote = getCurrentNote();
  const totalNotes = currentLesson?.notes.length || 1;
  const progressPercent = Math.min(100, Math.round(((currentNoteIndex) / totalNotes) * 100));

  const targetStringStyle = currentTargetNote
    ? GUITAR_STRING_STYLES.find((s) => s.index === currentTargetNote.stringIndex)
    : null;

  // Next upcoming notes preview
  const upcomingNotes = currentLesson
    ? currentLesson.notes.slice(currentNoteIndex + 1, currentNoteIndex + 5)
    : [];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 text-zinc-100 select-none z-20">
      {/* TOP BAR: Song title, Progress bar, Controls */}
      <header className="w-full flex items-center justify-between gap-4 pointer-events-auto">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMode('home')}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 backdrop-blur-md transition-all cursor-pointer hover:scale-105"
            title="Sair para o Menu"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-300" />
          </button>

          <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-blue-400" />
              <h2 className="font-bold text-sm text-zinc-100 max-w-[200px] sm:max-w-md truncate">
                {currentLesson?.title || 'Lição'}
              </h2>
            </div>
            <div className="text-[11px] text-zinc-400">
              Nota {Math.min(currentNoteIndex + 1, totalNotes)} de {totalNotes}
            </div>
          </div>
        </div>

        {/* Center: Progress Bar */}
        <div className="hidden md:flex flex-col items-center w-72 lg:w-96">
          <div className="w-full flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
            <span>PROGRESSO</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-900/90 rounded-full border border-zinc-800/80 overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Controls & Audio Level */}
        <div className="flex items-center gap-2">
          {/* VU Meter RMS */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 backdrop-blur-md">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <div className="w-14 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, Math.round(micRms * 1200))}%` }}
              />
            </div>
          </div>

          {/* Restart */}
          <button
            onClick={restartLesson}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 backdrop-blur-md transition-all cursor-pointer hover:border-zinc-600"
            title="Reiniciar Lição"
          >
            <RotateCcw className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Pause */}
          <button
            onClick={togglePause}
            className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 backdrop-blur-md transition-all cursor-pointer hover:border-zinc-600"
            title={isPaused ? 'Continuar' : 'Pausar'}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-emerald-400" />
            ) : (
              <Pause className="w-4 h-4 text-zinc-300" />
            )}
          </button>
        </div>
      </header>

      {/* MIDDLE SECTION: Live Hit Notification / Feedback Banner */}
      <div className="flex flex-col items-center justify-center my-auto pointer-events-none">
        {lastFeedback && (
          <div
            key={lastFeedback.id}
            className={`animate-bounce px-5 py-2 rounded-2xl backdrop-blur-md border text-center shadow-2xl transition-all ${
              lastFeedback.quality === 'perfect'
                ? 'bg-emerald-500/20 border-emerald-400/80 text-emerald-300 shadow-emerald-500/30'
                : lastFeedback.quality === 'good'
                ? 'bg-blue-500/20 border-blue-400/80 text-blue-300 shadow-blue-500/30'
                : 'bg-red-500/20 border-red-400/80 text-red-300 shadow-red-500/30'
            }`}
          >
            <div className="text-xl sm:text-2xl font-black tracking-wider uppercase">
              {lastFeedback.quality === 'perfect' && 'PERFEITO!'}
              {lastFeedback.quality === 'good' && 'MUITO BOM!'}
              {lastFeedback.quality === 'miss' && 'ERROU!'}
            </div>
            <div className="text-xs font-mono font-semibold opacity-90">
              {lastFeedback.pointsAdded > 0 ? `+${lastFeedback.pointsAdded} pts` : 'Combo resetado'}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: Score, Target Note Card, Upcoming Notes */}
      <footer className="w-full grid grid-cols-1 md:grid-cols-3 items-end gap-4 pointer-events-auto">
        {/* Left Card: Score, Multiplier, Streak */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col p-3 sm:p-4 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-xl shadow-xl min-w-[160px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                SCORE
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {accuracy}% ACC
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {score.toLocaleString()}
            </div>

            {/* Streak & Multiplier Banner */}
            <div className="mt-2 flex items-center justify-between pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5">
                <Flame
                  className={`w-4 h-4 ${
                    streak >= 5 ? 'text-orange-400 animate-pulse' : 'text-zinc-500'
                  }`}
                />
                <span className="text-xs font-bold font-mono">
                  {streak} <span className="text-[10px] text-zinc-400 font-normal">combo {combo}</span>
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <span className="text-emerald-400">✓{hits}</span>
                <span className="text-red-400">✗{misses}</span>
              </div>

              <div
                className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono tracking-wider border transition-all ${
                  multiplier >= 4
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                    : multiplier >= 3
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500'
                    : multiplier >= 2
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
                }`}
              >
                {multiplier}x
              </div>
            </div>
          </div>
        </div>

        {/* Center Card: Current Target Note Prominent Indicator */}
        <div className="flex flex-col items-center">
          {currentTargetNote ? (
            <div
              className="flex flex-col items-center p-4 sm:p-5 rounded-3xl bg-zinc-950/90 border-2 backdrop-blur-xl shadow-2xl transition-all"
              style={{
                borderColor: targetStringStyle?.colorHex || '#3b82f6',
                boxShadow: `0 0 24px ${targetStringStyle?.colorGlow || 'rgba(59,130,246,0.3)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4" style={{ color: targetStringStyle?.colorHex }} />
                <span className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                  {targetStringStyle?.name || `Corda ${currentTargetNote.stringIndex}`}
                </span>
              </div>

              {/* Big Target Note & Fret Indicator */}
              <div className="flex items-baseline gap-2 my-1">
                <span
                  className="text-4xl sm:text-5xl font-black font-mono"
                  style={{ color: targetStringStyle?.colorHex }}
                >
                  {currentTargetNote.noteName}
                  <span className="text-xl font-normal text-zinc-400 ml-1">
                    {currentTargetNote.octave}
                  </span>
                </span>

                <div className="px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-700 text-sm sm:text-base font-bold text-white">
                  {currentTargetNote.fret === 0 ? 'SOLTA (0)' : `CASA ${currentTargetNote.fret}`}
                </div>
              </div>

              {/* Finger or Chord info if present */}
              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                {currentTargetNote.finger && (
                  <span className="bg-zinc-800/90 px-2 py-0.5 rounded-md text-[11px] text-zinc-300 font-medium">
                    Dedo {currentTargetNote.finger}
                  </span>
                )}
                {currentTargetNote.chordName && (
                  <span className="bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded-md text-[11px] text-blue-300 font-bold">
                    Acorde {currentTargetNote.chordName}
                  </span>
                )}
              </div>

              {/* Real-time Pitch Detection Comparison */}
              <div className="mt-3 pt-2 border-t border-zinc-800/80 w-full flex items-center justify-between text-[11px] font-mono">
                <span className="text-zinc-500">MICROFONE:</span>
                <span
                  className={`font-bold ${
                    currentPitch ? 'text-zinc-200' : 'text-zinc-500 italic'
                  }`}
                >
                  {currentPitch
                    ? `${currentPitch.noteName}${currentPitch.octave} (${currentPitch.freq.toFixed(1)} Hz)`
                    : 'Aguardando som...'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-sm font-semibold text-zinc-300">
              Lição Concluída!
            </div>
          )}
        </div>

        {/* Right Card: Next Upcoming Notes queue */}
        <div className="hidden md:flex flex-col items-end">
          <div className="p-3 rounded-2xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-xl shadow-xl">
            <div className="text-[10px] font-bold text-zinc-400 tracking-wider mb-2 uppercase">
              Próximas Notas
            </div>
            <div className="flex items-center gap-2">
              {upcomingNotes.length > 0 ? (
                upcomingNotes.map((note, idx) => {
                  const style = GUITAR_STRING_STYLES.find((s) => s.index === note.stringIndex);
                  return (
                    <div
                      key={note.id || idx}
                      className="flex flex-col items-center p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 min-w-[48px]"
                    >
                      <div
                        className="w-2 h-2 rounded-full mb-1"
                        style={{ backgroundColor: style?.colorHex || '#888' }}
                      />
                      <span className="text-xs font-black font-mono text-zinc-200">
                        {note.noteName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {note.fret === 0 ? '0' : `c.${note.fret}`}
                      </span>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-zinc-500 italic px-2">Fim da lição</span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* PAUSE MODAL OVERLAY */}
      {isPaused && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col items-center">
            <h3 className="text-2xl font-black text-white mb-2">Jogo Pausado</h3>
            <p className="text-xs text-zinc-400 text-center mb-6">
              Respire fundo, relaxe os pulsos e volte quando estiver pronto!
            </p>

            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={togglePause}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Play className="w-4 h-4 fill-white" />
                Continuar
              </button>
              <button
                onClick={restartLesson}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar Lição
              </button>
              <button
                onClick={() => setMode('tuner')}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-all cursor-pointer"
              >
                Abrir Afinador
              </button>
              <button
                onClick={() => setMode('home')}
                className="w-full py-3 rounded-xl bg-zinc-950 hover:bg-red-950/40 border border-zinc-800 hover:border-red-800/60 text-zinc-400 hover:text-red-400 font-medium transition-all cursor-pointer"
              >
                Sair para o Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
