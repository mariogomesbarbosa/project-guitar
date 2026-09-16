import React, { useMemo } from 'react';
import { useGameStore } from '../store/useGameStore.ts';
import { GUITAR_STRING_STYLES } from '../lessons/types.ts';
import { Mic, MicOff, Volume2, ArrowLeft, Zap, CheckCircle2 } from 'lucide-react';

export const TunerOverlay: React.FC = () => {
  const {
    currentPitch,
    micRms,
    isMicActive,
    setDeviceSelectorOpen,
    targetTunerString,
    setTargetTunerString,
    setMode,
  } = useGameStore();

  // Selected or auto-detected string
  const activeString = useMemo(() => {
    if (targetTunerString !== null) {
      return GUITAR_STRING_STYLES.find((s) => s.index === targetTunerString) || null;
    }
    if (currentPitch?.stringGuess) {
      return GUITAR_STRING_STYLES.find((s) => s.index === currentPitch.stringGuess) || null;
    }
    return null;
  }, [targetTunerString, currentPitch?.stringGuess]);

  // Cents calculation: if a specific string is selected, calculate cents relative to its open frequency
  const { cents, isInTune, tuneMessage, tuneColor } = useMemo(() => {
    if (!currentPitch || currentPitch.freq <= 0) {
      return {
        cents: 0,
        isInTune: false,
        tuneMessage: 'Toque uma corda...',
        tuneColor: 'text-zinc-500',
      };
    }

    let diffCents = currentPitch.cents;

    // If string is manually selected, calculate relative to that target frequency
    if (activeString) {
      const targetFreq = activeString.openFreq;
      diffCents = Math.round(1200 * Math.log2(currentPitch.freq / targetFreq));
      // Clamp between -50 and 50 cents for visual meter
      diffCents = Math.max(-50, Math.min(50, diffCents));
    }

    const inTune = Math.abs(diffCents) <= 4;
    let message = 'Perfeito!';
    let color = 'text-emerald-400';

    if (inTune) {
      message = 'Perfeito! Afinado';
      color = 'text-emerald-400';
    } else if (diffCents < -15) {
      message = 'Muito Baixo (Aperte a corda ⤴)';
      color = 'text-amber-400';
    } else if (diffCents < -3) {
      message = 'Ligeiramente Baixo (Aperte)';
      color = 'text-yellow-300';
    } else if (diffCents > 15) {
      message = 'Muito Alto (Afrouxe a corda ⤵)';
      color = 'text-red-400';
    } else if (diffCents > 3) {
      message = 'Ligeiramente Alto (Afrouxe)';
      color = 'text-orange-400';
    }

    return {
      cents: diffCents,
      isInTune: inTune,
      tuneMessage: message,
      tuneColor: color,
    };
  }, [currentPitch, activeString]);

  const toggleMic = () => {
    setDeviceSelectorOpen(true);
  };

  // Needle angle for analog meter (-50 cents = -45 deg, +50 cents = +45 deg)
  const needleAngle = (cents / 50) * 45;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 sm:p-8 bg-zinc-950/95 backdrop-blur-xl text-zinc-100 select-none overflow-y-auto">
      {/* Background glow effects */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[550px] h-[350px] rounded-full blur-3xl opacity-20 transition-all duration-300"
        style={{
          backgroundColor: isInTune ? '#10b981' : activeString?.colorHex || '#3b82f6',
        }}
      />

      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <button
          onClick={() => setMode('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 transition-all cursor-pointer text-sm font-medium hover:border-zinc-500"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Menu
        </button>

        <div className="flex items-center gap-3">
          {/* Signal Level Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
            <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-75"
                style={{ width: `${Math.min(100, Math.round(micRms * 1200))}%` }}
              />
            </div>
          </div>

          {/* Mic Toggle Button */}
          <button
            onClick={toggleMic}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-medium text-xs sm:text-sm transition-all cursor-pointer ${
              isMicActive
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            {isMicActive ? (
              <>
                <Mic className="w-4 h-4 animate-pulse" />
                Mic Ativo
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4" />
                Ativar Mic
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Tuner Display */}
      <div className="w-full max-w-2xl flex flex-col items-center justify-center my-auto py-6 z-10">
        <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-1">
          Afinador de Violão
        </h1>
        <p className="text-xs text-zinc-400 mb-6">
          Afinação Padrão (E A D G B e) • Resolução por Cents
        </p>

        {/* Analog Dial / Gauge */}
        <div className="relative w-72 h-44 sm:w-96 sm:h-52 flex items-end justify-center overflow-hidden">
          {/* Arc Background */}
          <svg className="w-full h-full" viewBox="0 0 200 110">
            {/* Base Meter Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#27272a"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* In-Tune Center Zone Marker */}
            <path
              d="M 94 20.4 A 80 80 0 0 1 106 20.4"
              fill="none"
              stroke="#10b981"
              strokeWidth="14"
              strokeLinecap="round"
              className={isInTune ? 'filter drop-shadow-[0_0_8px_#10b981]' : ''}
            />

            {/* Gauge Tick Marks */}
            {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map((val) => {
              const angleRad = ((val / 50) * 45 * Math.PI) / 180;
              const x1 = 100 + 72 * Math.sin(angleRad);
              const y1 = 100 - 72 * Math.cos(angleRad);
              const x2 = 100 + 84 * Math.sin(angleRad);
              const y2 = 100 - 84 * Math.cos(angleRad);
              return (
                <line
                  key={val}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={val === 0 ? '#10b981' : '#52525b'}
                  strokeWidth={val === 0 ? '2' : '1.5'}
                />
              );
            })}
          </svg>

          {/* Needle */}
          <div
            className="absolute bottom-0 w-1.5 h-36 sm:h-44 origin-bottom rounded-full transition-transform duration-100 ease-out"
            style={{
              transform: `rotate(${needleAngle}deg)`,
              backgroundColor: isInTune ? '#34d399' : '#f43f5e',
              boxShadow: isInTune
                ? '0 0 14px #10b981, 0 0 28px #10b981'
                : '0 0 10px #f43f5e',
            }}
          >
            {/* Needle Pivot Cap */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-600 shadow-md" />
          </div>
        </div>

        {/* Note & Pitch Details Card */}
        <div className="mt-4 flex flex-col items-center">
          {/* Big Detected Note Display */}
          <div className="relative flex items-center justify-center">
            <div
              className={`text-6xl sm:text-7xl font-black font-mono tracking-tight transition-all duration-150 ${
                isInTune
                  ? 'text-emerald-400 scale-110 drop-shadow-[0_0_24px_rgba(16,185,129,0.6)]'
                  : 'text-zinc-100'
              }`}
            >
              {currentPitch ? currentPitch.noteName : '--'}
            </div>
            {currentPitch && (
              <span className="text-xl sm:text-2xl font-semibold text-zinc-400 ml-1.5 -mb-6">
                {currentPitch.octave}
              </span>
            )}

            {isInTune && (
              <CheckCircle2 className="absolute -right-10 top-2 w-8 h-8 text-emerald-400 animate-bounce" />
            )}
          </div>

          {/* Frequency & Cents Pill */}
          <div className="mt-3 flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs sm:text-sm font-mono text-zinc-300">
              {currentPitch ? `${currentPitch.freq.toFixed(1)} Hz` : '0.0 Hz'}
            </div>

            <div
              className={`px-3 py-1 rounded-full font-mono text-xs sm:text-sm font-bold border transition-colors ${
                isInTune
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              {cents > 0 ? `+${cents}` : cents} cents
            </div>
          </div>

          {/* Guidance Message */}
          <div className={`mt-3 font-semibold text-sm sm:text-base ${tuneColor} transition-colors flex items-center gap-1.5`}>
            {isInTune && <Zap className="w-4 h-4 fill-emerald-400 text-emerald-400" />}
            {tuneMessage}
          </div>
        </div>

        {/* Digital Slider Meter (-50 to +50) */}
        <div className="w-full max-w-md mt-6 px-4">
          <div className="relative h-2 w-full bg-zinc-800/80 rounded-full overflow-hidden">
            {/* Center Zero Line */}
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-zinc-400 -translate-x-1/2 z-10" />

            {/* Deviation Fill Bar */}
            <div
              className={`absolute top-0 h-full transition-all duration-100 ${
                isInTune ? 'bg-emerald-400' : cents < 0 ? 'bg-amber-400' : 'bg-red-400'
              }`}
              style={{
                left: cents < 0 ? `${50 + (cents / 50) * 50}%` : '50%',
                width: `${Math.abs((cents / 50) * 50)}%`,
              }}
            />
          </div>

          <div className="flex justify-between text-[11px] font-mono text-zinc-500 mt-1.5 px-1">
            <span>-50¢ (Grave)</span>
            <span className={isInTune ? 'text-emerald-400 font-bold' : ''}>0¢</span>
            <span>+50¢ (Agudo)</span>
          </div>
        </div>
      </div>

      {/* String Selection Bar */}
      <div className="w-full max-w-2xl bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 z-10">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Selecione a corda ou deixe em Auto:
          </div>
          <button
            onClick={() => setTargetTunerString(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              targetTunerString === null
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Auto Detect
          </button>
        </div>

        <div className="grid grid-cols-6 gap-2 sm:gap-3">
          {GUITAR_STRING_STYLES.map((str) => {
            const isSelected = activeString?.index === str.index;
            return (
              <button
                key={str.index}
                onClick={() => setTargetTunerString(str.index)}
                className={`relative flex flex-col items-center justify-center py-2.5 sm:py-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-zinc-300 scale-105 shadow-lg'
                    : 'border-zinc-800/80 bg-zinc-950/40 hover:bg-zinc-800/60'
                }`}
                style={{
                  backgroundColor: isSelected ? `${str.colorHex}22` : undefined,
                  borderColor: isSelected ? str.colorHex : undefined,
                  boxShadow: isSelected ? `0 0 16px ${str.colorGlow}` : undefined,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full mb-1.5"
                  style={{ backgroundColor: str.colorHex }}
                />
                <span className="text-base sm:text-lg font-black font-mono">
                  {str.label}
                </span>
                <span className="text-[10px] sm:text-xs text-zinc-400">
                  {str.index}ª ({str.noteName})
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  {str.openFreq.toFixed(0)}Hz
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
