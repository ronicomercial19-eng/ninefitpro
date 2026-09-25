import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, X, ArrowUpRight, Flame, Share2 } from "lucide-react";

export interface PersonalRecordData {
  id?: string;
  exerciseName: string;
  newValue: number;
  previousValue?: number | null;
  unit?: string;
  date?: string;
  athleteName?: string;
}

// Global event bus for Personal Record Toasts
type PRListener = (data: PersonalRecordData) => void;
const listeners = new Set<PRListener>();

export function triggerPersonalRecordToast(data: PersonalRecordData) {
  listeners.forEach((fn) => fn(data));
}

// Optional audio feedback using Web Audio API (gentle triumph chord)
function playVictoryChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Frequencies for a bright triumph arpeggio (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.7);
    });
  } catch {
    // Audio contexts might be blocked until user gesture, safely ignore
  }
}

export function PersonalRecordToastContainer() {
  const [activeRecord, setActiveRecord] = useState<PersonalRecordData | null>(null);

  useEffect(() => {
    const handlePR: PRListener = (data) => {
      setActiveRecord(data);
      playVictoryChime();

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {
          // ignore
        }
      }
    };

    listeners.add(handlePR);
    return () => {
      listeners.delete(handlePR);
    };
  }, []);

  useEffect(() => {
    if (!activeRecord) return;
    const timer = setTimeout(() => {
      setActiveRecord(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeRecord]);

  if (!activeRecord) return null;

  const unit = activeRecord.unit || "kg";
  const prev = activeRecord.previousValue;
  const current = activeRecord.newValue;
  const delta = prev != null && prev > 0 ? current - prev : null;
  const pct = prev != null && prev > 0 ? ((current - prev) / prev) * 100 : null;

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-0 right-0 z-[9999] flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl border border-[#FF6600]/50 bg-gradient-to-br from-[#1b1c24] via-[#121318] to-[#0a0a0d] p-4 text-white shadow-2xl shadow-[#FF6600]/25 backdrop-blur-xl"
        >
          {/* Glowing Aura Effect */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#FF6600]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Top Laser Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6600] to-transparent" />

          <div className="relative z-10 flex items-start gap-3.5">
            {/* Trophy Icon with Halo */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6600] to-amber-600 flex items-center justify-center shadow-lg shadow-[#FF6600]/40">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-1 rounded-xl border border-amber-400/40 pointer-events-none"
              />
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 text-[9.5px] font-mono font-bold tracking-[0.2em] uppercase text-[#FF6600] bg-[#FF6600]/15 px-2 py-0.5 rounded-full border border-[#FF6600]/30">
                  <Flame className="w-3 h-3 text-[#FF6600] fill-[#FF6600]" />
                  NOVO RECORDE PESSOAL!
                </span>
              </div>

              <h4 className="font-display text-base sm:text-lg font-black text-white truncate leading-tight">
                {activeRecord.exerciseName}
              </h4>

              {/* Metric Breakdown */}
              <div className="flex items-baseline gap-2 mt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                    {current}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
                    {unit}
                  </span>
                </div>

                {delta !== null && delta > 0 ? (
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    +{delta} {unit}
                    {pct !== null && (
                      <span className="opacity-80">({pct > 0 ? `+${pct.toFixed(1)}%` : ""})</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] font-mono text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Primeiro Marco Oficial
                  </span>
                )}
              </div>

              {prev !== undefined && prev !== null && prev > 0 && (
                <p className="text-[11px] font-mono text-neutral-400 mt-1">
                  Marca anterior: <span className="line-through text-neutral-500">{prev} {unit}</span>
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setActiveRecord(null)}
              className="absolute top-3 right-3 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Fechar notificação de recorde"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Progress Bar */}
          <div className="mt-3 w-full bg-white/10 h-0.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 7, ease: "linear" }}
              className="h-full bg-gradient-to-r from-amber-400 to-[#FF6600]"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
