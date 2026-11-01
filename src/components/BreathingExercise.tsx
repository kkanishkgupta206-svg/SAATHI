import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Wind } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../translations';

interface BreathingExerciseProps {
  language: Language;
}

type Phase = 'ready' | 'inhale' | 'hold' | 'exhale';

const PHASE_DURATIONS: Record<Phase, number> = {
  ready: 0,
  inhale: 4, // 4s inhale
  hold: 4,   // 4s hold
  exhale: 6, // 6s exhale
};

export const BreathingExercise: React.FC<BreathingExerciseProps> = ({ language }) => {
  const t = translations[language];

  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [cycles, setCycles] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Play a very soft, calming organic tone when phase transitions
  const playCalmTone = (freq: number = 380) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.3);
    } catch (e) {
      // Audio is optional enhancement
    }
  };

  useEffect(() => {
    let interval: any = null;

    if (isActive) {
      if (phase === 'ready') {
        setPhase('inhale');
        setSecondsLeft(PHASE_DURATIONS.inhale);
        playCalmTone(392); // G4
      } else {
        interval = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              // Transition to next phase
              if (phase === 'inhale') {
                setPhase('hold');
                playCalmTone(440); // A4
                return PHASE_DURATIONS.hold;
              } else if (phase === 'hold') {
                setPhase('exhale');
                playCalmTone(349); // F4
                return PHASE_DURATIONS.exhale;
              } else if (phase === 'exhale') {
                setCycles((c) => c + 1);
                setPhase('inhale');
                playCalmTone(392); // G4
                return PHASE_DURATIONS.inhale;
              }
              return 4;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, phase, soundEnabled]);

  const handleStart = () => {
    setIsActive(true);
    if (phase === 'ready') {
      setPhase('inhale');
      setSecondsLeft(PHASE_DURATIONS.inhale);
      playCalmTone(392);
    }
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setPhase('ready');
    setSecondsLeft(4);
    setCycles(0);
  };

  // Determine circle scale and background styling based on phase
  let circleScale = 'scale-75';
  let phaseText = t.ready;
  let phaseColor = 'text-teal-700';
  let ringColor = 'border-teal-200';
  let glowColor = 'shadow-teal-500/10';

  if (phase === 'inhale') {
    circleScale = 'scale-110';
    phaseText = t.inhale;
    phaseColor = 'text-teal-700';
    ringColor = 'border-teal-400';
    glowColor = 'shadow-teal-500/25';
  } else if (phase === 'hold') {
    circleScale = 'scale-110 ring-8 ring-indigo-200/60';
    phaseText = t.hold;
    phaseColor = 'text-indigo-700';
    ringColor = 'border-indigo-400';
    glowColor = 'shadow-indigo-500/25';
  } else if (phase === 'exhale') {
    circleScale = 'scale-75';
    phaseText = t.exhale;
    phaseColor = 'text-emerald-700';
    ringColor = 'border-emerald-300';
    glowColor = 'shadow-emerald-500/15';
  }

  // Calculate transition duration
  let transitionDuration = 'duration-1000';
  if (phase === 'inhale') transitionDuration = 'duration-[4000ms]';
  if (phase === 'hold') transitionDuration = 'duration-300';
  if (phase === 'exhale') transitionDuration = 'duration-[6000ms]';

  return (
    <div className="flex-1 flex flex-col items-center justify-between max-w-xl w-full mx-auto px-4 py-6 text-center animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-200">
          <Wind className="w-3.5 h-3.5 text-teal-600" />
          <span>4-4-6 Technique</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          {t.breathingTitle}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          {t.breathingSubtitle}
        </p>
      </div>

      {/* Main Breathing Circle Animation Container */}
      <div className="relative my-6 flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80">
        {/* Outer subtle guide ring */}
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200/80" />

        {/* Outer glowing halo */}
        <div
          className={`absolute w-60 h-60 rounded-full bg-gradient-to-tr from-teal-100/50 via-emerald-100/40 to-indigo-100/50 blur-xl transition-all ${transitionDuration} ${
            isActive && phase !== 'ready' ? 'opacity-100 scale-125' : 'opacity-40 scale-90'
          }`}
        />

        {/* Breathing animated circle */}
        <div
          className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center text-center p-4 transition-transform ease-in-out ${transitionDuration} ${circleScale} bg-gradient-to-br from-teal-50 via-emerald-50 to-indigo-50 border-4 ${ringColor} shadow-2xl ${glowColor}`}
        >
          {/* Phase title */}
          <span className={`text-base sm:text-lg font-bold ${phaseColor} transition-colors duration-300`}>
            {phaseText}
          </span>

          {/* Countdown timer */}
          {isActive && phase !== 'ready' && (
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-800 mt-1 tabular-nums animate-in fade-in">
              {secondsLeft}s
            </span>
          )}

          {phase === 'ready' && (
            <span className="text-xs text-slate-400 mt-1">
              4s • 4s • 6s
            </span>
          )}
        </div>
      </div>

      {/* Control Actions & Stats */}
      <div className="w-full space-y-4">
        {/* Buttons */}
        <div className="flex items-center justify-center gap-3">
          {!isActive ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-sm sm:text-base shadow-md shadow-teal-600/20 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{t.startBreathing}</span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-sm sm:text-base shadow-md transition-all"
            >
              <Pause className="w-4 h-4" />
              <span>{t.pauseBreathing}</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
            title={t.resetBreathing}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl border transition-colors ${
              soundEnabled
                ? 'bg-teal-50 text-teal-700 border-teal-300'
                : 'bg-white text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? t.soundToggleOff : t.soundToggleOn}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Cycles Count */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-slate-600">
          <Sparkles className="w-4 h-4 text-teal-500" />
          <span>
            {cycles} {t.cyclesCompleted}
          </span>
        </div>

        {/* Calming Tip */}
        <p className="text-xs text-slate-500 italic max-w-md mx-auto pt-2 border-t border-slate-200/60">
          {t.breathingTip}
        </p>
      </div>
    </div>
  );
};
