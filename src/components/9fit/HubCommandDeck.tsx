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
  const headline = hasWorkout ? "Seu ritmo está em movimento." : hasPlan ? "Seu próximo passo está pronto." : "Vamos calibrar seu primeiro passo.";
  const primaryLabel = hasWorkout ? "Abrir treino de hoje" : hasPlan ? "Abrir meu plano" : "Começar ativação";
  const primaryRoute = hasWorkout ? "/9fit/train" : hasPlan ? "/9fit/planejamento" : "/9fit/ativacao";
  const consistency = Math.min(100, Math.round((weekly.treinos / 5) * 100));

  return (
    <section className="w-full" aria-label="Comando do dia">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0c0d10] p-3.5 sm:p-4.5 shadow-xl transition-all">
        {/* Hairline subtle top light */}
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative">
          {/* Header do Card */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
                <Sparkles className="h-3 w-3 text-primary" />
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.22em] text-primary">
                Comando do Dia
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${scoreReady ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-neutral-400 font-medium">
                {scoreReady ? `SYNC ${Math.round(syncScore!)}` : "CALIBRANDO"}
              </span>
            </div>
          </div>

          {/* Grid Principal: Chamada + Dial Compacto */}
          <div className="mt-2.5 grid grid-cols-[1fr_96px] sm:grid-cols-[1fr_104px] items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug font-display">
                {name}, {headline}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-neutral-400 leading-normal">
                Uma ação agora recalibra a leitura do seu próximo ciclo.
              </p>
            </div>
            <SyncDial score={scoreReady ? Math.round(syncScore!) : null} />
          </div>

          {/* Botão de Ação Primária */}
          <button
            type="button"
            onClick={() => navigate(primaryRoute)}
            className="mt-3 flex w-full items-center justify-between gap-2.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2.5 text-left text-xs font-semibold tracking-wide text-primary-foreground transition-all active:scale-[0.99] shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Dumbbell className="h-3.5 w-3.5" />
              <span>{primaryLabel}</span>
            </span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          {/* Métricas Semanais — Números Elegantes & Labels Nítidos */}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <CommandMetric label="Treinos" value={weekly.treinos} suffix="sem" progress={consistency} />
            <CommandMetric label="Minutos" value={weekly.minutos} suffix="min" progress={Math.min(100, Math.round((weekly.minutos / 180) * 100))} />
            <CommandMetric label="Nutrição" value={weekly.nutri} suffix="reg" progress={Math.min(100, weekly.nutri * 20)} />
          </div>

          {/* Ações Secundárias Compactas */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate("/9fit/ron?context=hub_command")}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <Brain className="h-3.5 w-3.5 text-primary" />
              <span>Perguntar ao RON</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/9fit/ativacao")}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] px-3 py-2 text-[11px] font-medium text-neutral-300 hover:text-white transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>Registrar sinal</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SyncDial({ score }: { score: number | null }) {
  const value = score ?? 0;
  const circumference = 2 * Math.PI * 36;
  return (
    <div className="relative mx-auto h-24 w-24">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
        <circle
          cx="44"
          cy="44"
          r="36"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-primary transition-all duration-700"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">SYNC</span>
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums font-mono leading-none my-0.5">
          {score === null ? "—" : score}
        </span>
        <span className="font-mono text-[8.5px] text-neutral-500 tracking-wider font-medium">/ 100</span>
      </div>
    </div>
  );
}

function CommandMetric({ label, value, suffix, progress }: { label: string; value: number; suffix: string; progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 sm:p-2.5 transition-all"
    >
      <p className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-base sm:text-lg font-bold tracking-tight text-white tabular-nums font-mono leading-none">
          {value}
        </span>
        <span className="text-[9.5px] font-mono font-medium text-neutral-500 lowercase">
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </motion.div>
  );
}
