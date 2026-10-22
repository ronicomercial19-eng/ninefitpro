import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

function beep() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    setTimeout(() => ctx.close(), 500);
  } catch { /* sem áudio disponível */ }
}
const buzz = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

interface TimerProps {
  mode: "countdown" | "stopwatch";
  seconds?: number;
  /** countdown: chamado ao terminar com a duração; stopwatch: chamado ao parar com o tempo medido */
  onDone: (sec: number) => void;
}

/** Cronômetro de teste: 5 s para se posicionar, depois bipe e contagem. Reduz o erro de medir sozinho. */
export function TestTimer({ mode, seconds = 30, onDone }: TimerProps) {
  const [phase, setPhase] = useState<"idle" | "prep" | "run" | "done">("idle");
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);
  const t0 = useRef(0);

  const clear = () => { if (timer.current !== null) window.clearInterval(timer.current); timer.current = null; };
  useEffect(() => clear, []);

  const run = () => {
    t0.current = performance.now();
    timer.current = window.setInterval(() => {
      const el = (performance.now() - t0.current) / 1000;
      if (mode === "countdown") {
        const left = Math.max(0, seconds - el);
        setShown(Math.ceil(left));
        if (left <= 0) { clear(); setPhase("done"); beep(); buzz(400); onDone(seconds); }
      } else {
        setShown(Math.floor(el));
      }
    }, 100);
  };

  const start = () => {
    clear();
    setPhase("prep");
    const PREP = 5000;
    t0.current = performance.now();
    timer.current = window.setInterval(() => {
      const el = performance.now() - t0.current;
      if (el < PREP) { setShown(Math.ceil((PREP - el) / 1000)); return; }
      clear();
      setPhase("run");
      setShown(mode === "countdown" ? seconds : 0);
      beep(); buzz(150);
      run();
    }, 100);
  };

  const stopwatchStop = () => {
    const el = Math.round((performance.now() - t0.current) / 1000);
    clear();
    setShown(el);
    setPhase("done");
    beep(); buzz(200);
    onDone(el);
  };

  const reset = () => { clear(); setPhase("idle"); setShown(0); };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center space-y-2">
      <p className="text-3xl font-bold tabular-nums text-primary">
        {phase === "idle" ? (mode === "countdown" ? mmss(seconds) : "0:00") : phase === "prep" ? shown : mmss(shown)}
      </p>
      <p className="text-xs text-muted-foreground">
        {phase === "idle" && (mode === "countdown" ? "Toque em iniciar: você terá 5 s para se posicionar." : "Toque em iniciar, posicione-se e pare quando a técnica quebrar.")}
        {phase === "prep" && "Posicione-se. O teste começa no bipe."}
        {phase === "run" && (mode === "countdown" ? "Em andamento. Conte as repetições completas." : "Em andamento. Toque em parar quando não conseguir manter a forma.")}
        {phase === "done" && (mode === "countdown" ? "Tempo! Informe o resultado abaixo." : "Tempo registrado no campo abaixo.")}
      </p>
      <div className="flex gap-2 justify-center">
        {phase === "idle" && <button type="button" onClick={start} className="rounded-lg orange-satin px-4 py-2 text-sm font-bold">Iniciar</button>}
        {phase === "prep" && <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>}
        {phase === "run" && mode === "stopwatch" && <button type="button" onClick={stopwatchStop} className="rounded-lg orange-strong px-4 py-2 text-sm font-bold">Parar</button>}
        {phase === "run" && mode === "countdown" && <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>}
        {phase === "done" && <button type="button" onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm">Refazer</button>}
      </div>
    </div>
  );
}

/** Contador de repetições com botão grande, para tocar a cada repetição completa. */
export function RepCounter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value.replace(",", ".")) || 0;
  return (
    <div className="flex items-center justify-center gap-3">
      <button type="button" aria-label="Menos uma repetição" onClick={() => onChange(String(Math.max(0, n - 1)))} className="w-11 h-11 rounded-full border border-border flex items-center justify-center"><Minus className="w-4 h-4" /></button>
      <button type="button" aria-label="Mais uma repetição" onClick={() => onChange(String(n + 1))} className="h-16 px-8 rounded-2xl orange-satin text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5" /> {n}</button>
    </div>
  );
}
