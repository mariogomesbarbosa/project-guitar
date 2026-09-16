import React, { useEffect, useRef } from 'react';
import { useGameStore } from './store/useGameStore.ts';
import { audioEngine } from './audio/AudioEngine.ts';
import { LessonSelect } from './ui/LessonSelect.tsx';
import { TunerOverlay } from './ui/TunerOverlay.tsx';
import { GameHUD } from './ui/GameHUD.tsx';
import { ResultsModal } from './ui/ResultsModal.tsx';
import { FretboardScene } from './3d/FretboardScene.tsx';
import {
  Guitar,
  Mic,
  MicOff,
  BookOpen,
  Volume2,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    mode,
    setMode,
    isMicActive,
    setMicActive,
    updatePitch,
    micRms,
    sensitivity,
    setSensitivity,
    recordHit,
    getCurrentNote,
    isPlaying,
    isPaused,
  } = useGameStore();

  const lastNoteHitTimeRef = useRef<number>(0);
  const [showSettings, setShowSettings] = React.useState(false);

  // Subscribe AudioEngine to GameStore
  useEffect(() => {
    // Pitch listener
    const unsubPitch = audioEngine.onPitchDetected((pitch) => {
      const state = audioEngine.getState();
      updatePitch(pitch, state.rms);

      // In Gameplay mode, evaluate pitch against target note
      if (
        mode === 'gameplay' &&
        isPlaying &&
        !isPaused &&
        pitch &&
        pitch.clarity >= 0.78
      ) {
        const currentTarget = getCurrentNote();
        if (!currentTarget) return;

        const now = Date.now();
        // 350ms debounce to prevent multiple triggers from harmonic ringing
        if (now - lastNoteHitTimeRef.current < 350) return;

        // Check note match
        const isNoteMatch =
          pitch.noteName.toUpperCase() === currentTarget.noteName.toUpperCase();

        if (isNoteMatch) {
          lastNoteHitTimeRef.current = now;
          const absCents = Math.abs(pitch.cents);
          if (absCents <= 15) {
            recordHit('perfect', `${pitch.noteName}${pitch.octave}`, pitch.cents);
          } else {
            recordHit('good', `${pitch.noteName}${pitch.octave}`, pitch.cents);
          }
        }
      }
    });

    // State listener
    const unsubState = audioEngine.onStateChange((state) => {
      setMicActive(state.status === 'running');
    });

    return () => {
      unsubPitch();
      unsubState();
    };
  }, [mode, isPlaying, isPaused, updatePitch, setMicActive, recordHit, getCurrentNote]);

  // Toggle mic capture
  const handleToggleMic = async () => {
    try {
      if (isMicActive) {
        await audioEngine.stop();
        setMicActive(false);
      } else {
        await audioEngine.start();
        setMicActive(true);
      }
    } catch (err) {
      console.error('AudioEngine toggle error:', err);
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  // Keyboard shortcut fallback for testing gameplay without a real guitar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'gameplay' || !isPlaying || isPaused) return;

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        const currentTarget = getCurrentNote();
        if (currentTarget) {
          recordHit('perfect', `${currentTarget.noteName}${currentTarget.octave}`, 0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isPlaying, isPaused, getCurrentNote, recordHit]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col select-none">
      {/* GLOBAL APPLICATION HEADER (Hidden in full gameplay to maximize screen) */}
      {mode !== 'gameplay' && (
        <header className="w-full flex items-center justify-between px-6 py-3.5 bg-zinc-950/80 border-b border-zinc-800/80 backdrop-blur-md z-30">
          {/* Logo & Brand */}
          <div
            onClick={() => setMode('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Guitar className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-wider bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                  PROJECT GUITAR
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  3D
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 -mt-0.5">
                Next-Gen Guitar Learning
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setMode('home')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                mode === 'home'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Lições
            </button>
            <button
              onClick={() => setMode('tuner')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                mode === 'tuner'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Guitar className="w-3.5 h-3.5 text-emerald-400" />
              Afinador
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* Mic Level indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.round(micRms * 1200))}%` }}
                />
              </div>
            </div>

            {/* Mic Toggle Button */}
            <button
              onClick={handleToggleMic}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                isMicActive
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {isMicActive ? (
                <>
                  <Mic className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>Mic Conectado</span>
                </>
              ) : (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Conectar Mic</span>
                </>
              )}
            </button>

            {/* Audio Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              title="Configurações de Sensibilidade"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Settings Dropdown Drawer */}
      {showSettings && (
        <div className="absolute right-6 top-16 z-40 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl w-72 select-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Sensibilidade do Microfone
            </span>
            <span className="text-xs font-mono font-bold text-blue-400">
              {sensitivity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.1"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseFloat(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
            <span>Mais Suave</span>
            <span>Padrão</span>
            <span>Mais Alto</span>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300">Dica:</span> Use fones de ouvido para evitar que o som dos autofalantes interfira na detecção de tom.
          </div>
        </div>
      )}

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Mode: Home / Lesson Catalog */}
        {mode === 'home' && <LessonSelect />}

        {/* Mode: Tuner */}
        {mode === 'tuner' && <TunerOverlay />}

        {/* Mode: Gameplay */}
        {mode === 'gameplay' && (
          <div className="relative w-full h-full">
            <FretboardScene />
            <GameHUD />
          </div>
        )}

        {/* Mode: Results Victory Screen */}
        {mode === 'results' && (
          <div className="relative w-full h-full">
            <FretboardScene />
            <ResultsModal />
          </div>
        )}
      </main>

      {/* FOOTER HINT FOR GAMEPLAY */}
      {mode === 'gameplay' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-zinc-900/60 border border-zinc-800/60 text-[11px] text-zinc-400 pointer-events-none z-30 flex items-center gap-1.5 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Toque a nota no violão ou pressione [Espaço] para testar</span>
        </div>
      )}
    </div>
  );
};

export default App;
