import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Timer,
  Dumbbell,
  Check,
  Zap,
  Gauge,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExerciseVideoPlayer, getYoutubeEmbedUrl } from "@/components/exercises/ExerciseVideoPlayer";

export interface FocusModeExercise {
  exercise_id?: string;
  name?: string;
  sets?: number;
  reps?: string | number;
  rest_seconds?: number;
  tempo?: string;
  target_muscles?: string[];
  notes?: string;
  video_url?: string;
  gif_url?: string;
  override_locked?: boolean;
  [key: string]: unknown;
}

export interface FocusModeProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: FocusModeExercise;
  currentIdx: number;
  totalExercises: number;
  currentWeight: number;
  onWeightChange: (newWeight: number) => void;
  completedSets: boolean[];
  onToggleSet: (setIdx: number) => void;
  onNextExercise: () => void;
  onPrevExercise: () => void;
  canNext: boolean;
  canPrev: boolean;
  timerSeconds: number;
  timerRunning: boolean;
  timerInitial: number;
  onResetTimer: () => void;
  onToggleTimer: () => void;
  onSetTimerPreset: (seconds: number) => void;
  workoutSeconds: number;
  onFinishWorkout?: () => void;
  persisting?: boolean;
  assistance?: React.ReactNode;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function FocusMode({
  isOpen,
  onClose,
  exercise,
  currentIdx,
  totalExercises,
  currentWeight,
  onWeightChange,
  completedSets,
  onToggleSet,
  onNextExercise,
  onPrevExercise,
  canNext,
  canPrev,
  timerSeconds,
  timerRunning,
  timerInitial,
  onResetTimer,
  onToggleTimer,
  onSetTimerPreset,
  workoutSeconds,
  onFinishWorkout,
  persisting = false,
  assistance,
}: FocusModeProps) {
  // ESC key listener to exit focus mode
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !exercise) return null;

  const totalSets = exercise.sets || 3;
  const setsDoneCount = completedSets.filter(Boolean).length;
  const isAllSetsDone = totalSets > 0 && setsDoneCount >= totalSets;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 z-[9990] bg-[#050608] text-white flex flex-col select-none overflow-hidden"
      >
        {/* Top Minimal Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[180px] bg-[#FF6600]/[0.08] blur-[120px] pointer-events-none" />

        {assistance && <div className="relative z-20 px-4 py-2">{assistance}</div>}
        {/* 1. Ultra-clean Focus Mode Header */}
        <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#08090d]/90 backdrop-blur-md">
          {/* Exit Focus Mode button */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-colors text-xs font-mono tracking-wider font-semibold"
            aria-label="Sair do Modo Foco"
          >
            <Minimize2 className="w-4 h-4 text-[#FF6600]" />
            <span className="hidden sm:inline">SAIR DO FOCO</span>
            <span className="text-[10px] text-neutral-500 hidden sm:inline">[ESC]</span>
          </button>

          {/* Mode Indicator & Workout Clock */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#FF6600]/10 border border-[#FF6600]/30 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6600] animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#FF6600]">
                MODO FOCO
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-xs">
              <Timer className="w-3.5 h-3.5 text-neutral-500" />
              <span>{formatDuration(workoutSeconds)}</span>
            </div>
          </div>

          {/* Exercise Index Stepper */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onPrevExercise}
              disabled={!canPrev}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
              aria-label="Exercício anterior"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-200" />
            </button>
            <span className="font-mono text-xs text-neutral-300 font-bold px-1.5">
              {currentIdx + 1} / {totalExercises}
            </span>
            <button
              onClick={onNextExercise}
              disabled={!canNext}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-white/5 transition-colors"
              aria-label="Próximo exercício"
            >
              <ChevronRight className="w-4 h-4 text-neutral-200" />
            </button>
          </div>
        </header>

        {/* 2. Maximized Central Exercise Stage */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col items-center justify-start max-w-4xl mx-auto w-full">
          {/* Main Visual & Media - Expanded and Maximized */}
          <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0e13] shadow-2xl shadow-black/80 flex flex-col">
            {/* Video / GIF Player */}
            {exercise.exercise_id ? (
              <div className="w-full aspect-video max-h-[46vh] bg-black">
                <ExerciseVideoPlayer
                  exerciseId={exercise.exercise_id}
                  exerciseName={exercise.name}
                  className="w-full h-full"
                  showGif={true}
                />
              </div>
            ) : exercise.video_url ? (
              <div className="w-full aspect-video max-h-[46vh] bg-black">
                {getYoutubeEmbedUrl(exercise.video_url) ? (
                  <iframe
                    src={getYoutubeEmbedUrl(exercise.video_url) as string}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={exercise.name}
                  />
                ) : (
                  <video
                    src={exercise.video_url}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                    title={exercise.name}
                  />
                )}
              </div>
            ) : exercise.gif_url ? (
              <div className="w-full max-h-[46vh] flex items-center justify-center bg-black/40 overflow-hidden">
                <img
                  src={exercise.gif_url}
                  alt={exercise.name}
                  className="w-full h-64 sm:h-72 object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-24 sm:h-28 flex items-center justify-center bg-gradient-to-r from-neutral-900 to-[#121318] border-b border-white/5">
                <Dumbbell className="w-10 h-10 text-neutral-600" />
              </div>
            )}

            {/* Exercise Details Overlay Strip */}
            <div className="p-4 sm:p-5 bg-gradient-to-b from-[#111218] to-[#0d0e13]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                    {exercise.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {exercise.target_muscles?.map((m: string) => (
                      <span
                        key={m}
                        className="text-[10px] font-mono uppercase tracking-wider text-neutral-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full"
                      >
                        {m}
                      </span>
                    ))}
                    {exercise.override_locked && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        🔒 Bloqueado pelo Treinador
                      </span>
                    )}
                  </div>
                </div>

                {/* Technical Prescription Badges */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">SÉRIES</p>
                    <p className="text-lg font-mono font-black text-white">{exercise.sets || 3}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                    <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">REPS</p>
                    <p className="text-lg font-mono font-black text-[#FF6600]">{exercise.reps || "—"}</p>
                  </div>
                  {exercise.tempo && (
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center">
                      <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">TEMPO</p>
                      <p className="text-base font-mono font-black text-white">{exercise.tempo}</p>
                    </div>
                  )}
                </div>
              </div>

              {exercise.notes && (
                <p className="text-xs text-neutral-400 mt-2.5 bg-white/[0.03] border border-white/[0.06] p-2.5 rounded-lg">
                  💡 <span className="font-semibold text-neutral-300">Nota técnica:</span> {exercise.notes}
                </p>
              )}
            </div>
          </div>
        </main>

        {/* 3. Essential Bottom Dock Controls */}
        <footer className="relative z-20 w-full max-w-4xl mx-auto border-t border-white/[0.08] bg-[#08090d]/95 backdrop-blur-xl px-4 sm:px-6 py-3.5 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            {/* Control A: Séries Completadas (Large tactile set circles) */}
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-neutral-400 mb-1.5">
                SÉRIES ({setsDoneCount}/{totalSets})
              </span>
              <div className="flex gap-2">
                {Array.from({ length: totalSets }).map((_, i) => {
                  const done = completedSets[i] || false;
                  return (
                    <button
                      key={i}
                      onClick={() => onToggleSet(i)}
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-mono font-black text-base transition-all transform active:scale-95 ${
                        done
                          ? "bg-[#FF6600] text-white shadow-lg shadow-[#FF6600]/30 border-2 border-[#FF6600]"
                          : "bg-white/5 border-2 border-white/15 text-neutral-400 hover:border-[#FF6600]/50 hover:text-white"
                      }`}
                      aria-label={`Série ${i + 1} ${done ? "concluída" : "pendente"}`}
                    >
                      {done ? <Check className="w-5 h-5 stroke-[3]" /> : i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control B: Carga Atual (Weight Adjuster) */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-neutral-400 mb-1.5 flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-[#FF6600]" /> CARGA ATUAL
              </span>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => onWeightChange(Math.max(0, currentWeight - 2.5))}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors active:scale-90"
                  aria-label="Diminuir 2.5 kg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-20 text-center font-mono font-black text-xl text-white">
                  {currentWeight}
                  <span className="text-xs text-neutral-400 ml-0.5">kg</span>
                </div>
                <button
                  onClick={() => onWeightChange(currentWeight + 2.5)}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center transition-colors active:scale-90"
                  aria-label="Aumentar 2.5 kg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Control C: Descanso (Rest Countdown) */}
            <div className="flex flex-col items-center sm:items-end">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-neutral-400 mb-1.5 flex items-center gap-1">
                <Timer className="w-3 h-3 text-[#FF6600]" /> DESCANSO
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onResetTimer}
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 flex items-center justify-center transition-colors"
                  aria-label="Reiniciar descanso"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onToggleTimer}
                  className={`px-3 h-9 rounded-lg font-mono font-bold text-sm flex items-center gap-1.5 transition-all ${
                    timerRunning
                      ? "bg-[#FF6600]/20 text-[#FF6600] border border-[#FF6600]/50"
                      : "bg-[#FF6600] text-white shadow-md shadow-[#FF6600]/30 hover:bg-[#FF6600]/90"
                  }`}
                  aria-label={timerRunning ? "Pausar descanso" : "Iniciar descanso"}
                >
                  {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span className="font-mono text-base">{formatDuration(timerSeconds)}</span>
                </button>
              </div>

              {/* Timer Quick Presets */}
              <div className="flex gap-1 mt-1.5">
                {[30, 45, 60, 90].map((s) => (
                  <button
                    key={s}
                    onClick={() => onSetTimerPreset(s)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                      timerInitial === s
                        ? "bg-[#FF6600]/20 border-[#FF6600]/60 text-[#FF6600]"
                        : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    {s}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Quick Action Button: Next Exercise or Finish */}
          <div className="pt-2">
            {canNext ? (
              <Button
                onClick={onNextExercise}
                className="w-full bg-gradient-to-r from-[#FF6600] to-amber-600 hover:from-[#FF6600]/90 hover:to-amber-600/90 text-white font-display font-black uppercase py-5 text-sm tracking-wider shadow-lg shadow-[#FF6600]/20 flex items-center justify-center gap-2 rounded-xl"
              >
                <span>Próximo Exercício ({currentIdx + 2} de {totalExercises})</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : onFinishWorkout ? (
              <Button
                onClick={onFinishWorkout}
                disabled={persisting}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black uppercase py-5 text-sm tracking-wider shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 rounded-xl"
              >
                {persisting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Concluir Treino Completo</span>
              </Button>
            ) : null}
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
