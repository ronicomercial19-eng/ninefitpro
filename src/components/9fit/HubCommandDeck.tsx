import { motion } from "framer-motion";
import { ArrowUpRight, Brain, CheckCircle2, Dumbbell, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";

interface Props {
  name: string;
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  weekly: { treinos: number; nutri: number; minutos: number };
  hasPlan: boolean;
}

export function HubCommandDeck({ name, syncScore, scoreStatus, weekly, hasPlan }: Props) {
  const navigate = useNavigate();
  const hasWorkout = weekly.treinos > 0;
  const scoreReady = typeof syncScore === "number" && scoreStatus === "available";
  const headline = hasWorkout ? "Seu ritmo já está em movimento." : hasPlan ? "Seu próximo passo está pronto." : "Vamos calibrar seu primeiro passo.";
  const primaryLabel = hasWorkout ? "Abrir treino de hoje" : hasPlan ? "Abrir meu plano" : "Começar ativação";
  const primaryRoute = hasWorkout ? "/9fit/train" : hasPlan ? "/9fit/planejamento" : "/9fit/ativacao";
  const consistency = Math.min(100, Math.round((weekly.treinos / 5) * 100));

  return (
    <section className="px-4 mt-5" aria-label="Comando do dia">
      <div className="relative overflow-hidden border border-primary/30 bg-card/70 p-4 sm:p-5 nine-pro-clip">
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(hsl(var(--primary) / .08) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / .08) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center border border-primary/40 bg-primary/10 nine-pro-clip">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Comando do dia</p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              {scoreReady ? `sync ${Math.round(syncScore!)}` : "calibrando"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_112px] items-center gap-3">
            <div>
              <h2 className="text-lg font-black leading-tight text-foreground">{name}, {headline}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Uma ação agora muda a leitura do seu próximo ciclo.</p>
            </div>
            <SyncDial score={scoreReady ? Math.round(syncScore!) : null} />
          </div>

          <button type="button" onClick={() => navigate(primaryRoute)} className="mt-4 flex w-full items-center justify-between gap-3 bg-primary px-4 py-3 text-left font-bold text-primary-foreground transition-opacity hover:opacity-90 nine-pro-clip">
            <span className="flex items-center gap-2"><Dumbbell className="h-4 w-4" /> {primaryLabel}</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <CommandMetric label="Treinos" value={weekly.treinos} suffix="sem" progress={consistency} />
            <CommandMetric label="Minutos" value={weekly.minutos} suffix="sem" progress={Math.min(100, Math.round((weekly.minutos / 180) * 100))} />
            <CommandMetric label="Nutrição" value={weekly.nutri} suffix="reg" progress={Math.min(100, weekly.nutri * 20)} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => navigate("/9fit/ron?context=hub_command")} className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[11px] font-semibold text-foreground hover:border-primary/40 nine-pro-clip">
              <Brain className="h-3.5 w-3.5 text-primary" /> Perguntar ao RON
            </button>
            <button type="button" onClick={() => navigate("/9fit/ativacao")} className="flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-[11px] font-semibold text-foreground hover:border-primary/40 nine-pro-clip">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Registrar sinal
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SyncDial({ score }: { score: number | null }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 42;
  return <div className="relative mx-auto h-28 w-28">
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="5" className="text-white/10" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" className="text-primary transition-all duration-700" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
    </svg>
    <div className="absolute inset-0 grid place-content-center text-center">
      <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Sync</span>
      <strong className="text-2xl font-black text-foreground">{score === null ? "—" : score}</strong>
      <span className="font-mono text-[8px] text-muted-foreground">/100</span>
    </div>
  </div>;
}

function CommandMetric({ label, value, suffix, progress }: { label: string; value: number; suffix: string; progress: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="border border-white/10 bg-black/20 p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black text-foreground">{value}<span className="ml-1 text-[9px] font-normal text-muted-foreground">{suffix}</span></p>
      <div className="mt-1 h-1 overflow-hidden bg-white/10"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
    </motion.div>
  );
}
