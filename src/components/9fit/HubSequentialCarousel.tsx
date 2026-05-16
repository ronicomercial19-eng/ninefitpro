import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BarChart3, Droplet, Dumbbell, Utensils, Award, Brain, Play, Pause } from "lucide-react";

type ModuleDef = {
  id: string;
  label: string;
  display: string;
  style: "outline-orange" | "outline-white" | "solid-white" | "solid-orange";
  route: string;
  Front: () => JSX.Element;
};

const StatsFront = () => (
  <div className="flex items-end gap-1.5 h-20">
    {[40, 65, 55, 80, 70, 95, 88].map((h, i) => (
      <motion.span
        key={i}
        initial={{ height: 4 }}
        animate={{ height: `${h}%` }}
        transition={{ delay: i * 0.05, duration: 0.4 }}
        className="w-3 rounded-t bg-gradient-to-t from-primary to-primary/40 shadow-[0_0_12px_hsla(20,100%,50%,0.6)]"
      />
    ))}
  </div>
);

const HabitFront = () => (
  <div className="flex gap-3">
    {[Droplet, Dumbbell, Utensils].map((Icon, i) => (
      <motion.div
        key={i}
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
        className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 backdrop-blur-sm border border-primary/40 flex items-center justify-center shadow-[0_8px_24px_-6px_hsla(20,100%,50%,0.5)]"
      >
        <Icon className="w-6 h-6 text-primary" />
      </motion.div>
    ))}
  </div>
);

const TribosFront = () => (
  <div className="relative w-20 h-20">
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-transparent border border-primary/40 flex items-center justify-center shadow-[0_8px_32px_-8px_hsla(20,100%,50%,0.6)]">
      <Award className="w-10 h-10 text-primary" />
    </div>
    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-display">
      #1
    </div>
  </div>
);

const IntelFront = () => (
  <motion.div
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ duration: 2, repeat: Infinity }}
    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 via-primary/15 to-transparent backdrop-blur-sm border border-primary/40 flex items-center justify-center shadow-[0_0_32px_-4px_hsla(20,100%,50%,0.7)]"
  >
    <Brain className="w-10 h-10 text-primary" />
  </motion.div>
);

const PlayFront = () => (
  <div className="relative w-28 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-black border border-primary/40 shadow-[0_8px_28px_-6px_hsla(20,100%,50%,0.5)]">
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
        <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
      </div>
    </div>
  </div>
);

const MODULES: ModuleDef[] = [
  { id: "stats",  label: "Performance",    display: "STATS",  style: "outline-orange", route: "/9fit/stats",      Front: StatsFront },
  { id: "habit",  label: "Daily Protocol", display: "HABIT",  style: "solid-white",    route: "/9fit/os",         Front: HabitFront },
  { id: "tribos", label: "Comunidade",     display: "TRIBOS", style: "outline-white",  route: "/9fit/community",  Front: TribosFront },
  { id: "intell", label: "SmartTreino",    display: "INTELL", style: "solid-white",    route: "/9fit/train",      Front: IntelFront },
  { id: "play",   label: "HealthFlix",     display: "PLAY",   style: "outline-orange", route: "/9fit/healthflix", Front: PlayFront },
];

const AUTO_MS = 4000;

export function HubSequentialCarousel() {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % MODULES.length), AUTO_MS);
    return () => clearInterval(t);
  }, [playing]);

  const m = MODULES[idx];

  const textStyle: React.CSSProperties =
    m.style === "outline-orange"
      ? { WebkitTextStroke: "1.5px hsl(20 100% 50%)", color: "transparent" }
      : m.style === "outline-white"
      ? { WebkitTextStroke: "1.5px hsl(0 0% 96%)", color: "transparent" }
      : m.style === "solid-orange"
      ? { color: "hsl(20 100% 50%)" }
      : { color: "hsl(0 0% 96%)" };

  return (
    <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black border border-primary/20">
      {/* gradient bg */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsla(20,100%,50%,0.18),transparent_60%)]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={m.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          {/* Layer 1: display typography (background, slower parallax) */}
          <motion.h2
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
            transition={{ duration: 0.55 }}
            className="absolute inset-0 flex items-center justify-center select-none pointer-events-none font-display font-black uppercase leading-none tracking-tighter"
            style={{ ...textStyle, fontSize: "clamp(72px, 26vw, 220px)" }}
          >
            {m.display}
          </motion.h2>

          {/* Layer 2: floating front asset (faster parallax) */}
          <motion.button
            onClick={() => {
              setPlaying(false);
              navigate(m.route);
            }}
            initial={{ x: 80, opacity: 0, scale: 0.85 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -60, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, delay: 0.08, type: "spring", stiffness: 160, damping: 18 }}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 drop-shadow-[0_12px_28px_rgba(255,107,0,0.55)] scale-75 origin-center"
            aria-label={`Abrir ${m.label}`}
          >
            <m.Front />
          </motion.button>

          {/* Bottom-left label */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <p className="text-[9px] font-data tracking-[0.4em] text-primary/80">
              {String(idx + 1).padStart(2, "0")} / {String(MODULES.length).padStart(2, "0")}
            </p>
            <p className="text-sm font-display uppercase text-foreground tracking-wider">{m.label}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls + progress */}
      <button
        onClick={() => setPlaying((p) => !p)}
        className="absolute top-3 right-3 z-30 w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center text-foreground/80 hover:text-primary"
        aria-label={playing ? "Pausar" : "Continuar"}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>

      {/* Step dots */}
      <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
        {MODULES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setPlaying(false); }}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-2 bg-white/20"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Linear progress */}
      {playing && (
        <motion.div
          key={`pg-${idx}`}
          className="absolute bottom-0 left-0 h-0.5 bg-primary z-20"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: AUTO_MS / 1000, ease: "linear" }}
        />
      )}
    </div>
  );
}
