import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Flame, Utensils, Zap, ChevronDown, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import { useTiltCard } from "@/hooks/useTiltCard";

interface Props {
  score: number | null;
  status: HubScoreStatus;
  breakdown?: {
    treino: number | null;
    nutri: number | null;
    sono: number | null;
    mob: number | null;
    hidr: number | null;
  };
}

const COLOR_LOW = "#FF3B30";
const COLOR_MID = "#FF6600";
const COLOR_HIGH = "#27AE60";

function getStatusTheme(score: number | null, status: HubScoreStatus) {
  if (status === "offline" || status === "error") {
    return {
      color: COLOR_LOW,
      bgGlow: "rgba(255, 59, 48, 0.2)",
      label: status === "offline" ? "OFFLINE" : "ERRO",
      badgeClass: "bg-red-500/10 text-red-400 border-red-500/30",
      dotClass: "bg-red-500 shadow-[0_0_8px_#FF3B30]",
    };
  }
  if (score === null || status === "calibrating" || status === "loading") {
    return {
      color: "#00E5FF",
      bgGlow: "rgba(0, 229, 255, 0.2)",
      label: status === "loading" ? "ATUALIZANDO" : "CALIBRANDO",
      badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
      dotClass: "bg-cyan-400 shadow-[0_0_8px_#00E5FF]",
    };
  }
  if (status === "stale") {
    return { color: COLOR_MID, bgGlow: "rgba(255, 102, 0, 0.2)", label: "LEITURA ANTERIOR", badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/30", dotClass: "bg-orange-400" };
  }
  if (score >= 80) {
    return {
      color: COLOR_HIGH,
      bgGlow: "rgba(39, 174, 96, 0.25)",
      label: "ALTA SINCRONIA",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      dotClass: "bg-emerald-400 shadow-[0_0_10px_#27AE60]",
    };
  }
  if (score >= 60) {
    return {
      color: COLOR_MID,
      bgGlow: "rgba(255, 102, 0, 0.25)",
      label: "ESTÁVEL",
      badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/30",
      dotClass: "bg-[#FF6600] shadow-[0_0_10px_#FF6600]",
    };
  }
  return {
    color: COLOR_LOW,
    bgGlow: "rgba(255, 59, 48, 0.25)",
    label: "ATENÇÃO",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/30",
    dotClass: "bg-red-500 shadow-[0_0_10px_#FF3B30]",
  };
}

export function SyncScoreRing({ score, status, breakdown }: Props) {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const measured = typeof score === "number" && Number.isFinite(score);
  const safeScore = measured ? Math.max(0, Math.min(100, score)) : 0;
  const theme = getStatusTheme(score, status);

  const unmeasuredTiltRef = useTiltCard<HTMLDivElement>({
    haloColor: "rgba(0, 229, 255, 0.22)",
    maxTilt: 4.5,
    scale: 1.012,
  });

  const measuredTiltRef = useTiltCard<HTMLDivElement>({
    haloColor: `${theme.color}35`,
    maxTilt: 4.8,
    scale: 1.012,
  });

  if (!measured) {
    return (
      <div
        ref={unmeasuredTiltRef}
        tabIndex={0}
        className="hub-card-interactive rounded-2xl border border-white/10 bg-gradient-to-b from-[#121318] to-[#0a0a0c] p-5 relative overflow-hidden shadow-xl shadow-black/60 group"
      >
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <span className="absolute w-20 h-20 rounded-full border border-cyan-500/30 animate-ping-slow" />
            <div className="relative flex flex-col items-center text-center">
              <Sparkles className="w-6 h-6 mb-1 text-cyan-400 animate-pulse" />
              <span className="text-[9px] font-mono tracking-widest uppercase text-cyan-400 font-bold">{theme.label}</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm text-white font-bold font-display leading-snug mb-1">
              {status === "offline" ? "Você está sem conexão." : status === "error" ? "Não foi possível atualizar seu Sync." : status === "loading" ? "Atualizando seus registros…" : "Seu Sync começa com seus registros."}
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              {status === "offline" || status === "error" ? "Seus registros não foram apagados. Atualize o painel quando a conexão estiver disponível." : "Registre refeições, treinos e recuperação para acompanhar sua consistência."}
            </p>
            {status === "calibrating" && <button
              onClick={() => navigate("/9fit/onboarding")}
              className="inline-flex items-center gap-2 text-xs font-bold tracking-wide px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Iniciar Calibração <ArrowRight className="w-3.5 h-3.5" />
            </button>}
          </div>
        </div>
      </div>
    );
  }

  // These are dimension scores, not measured duration or energy expenditure.
  const formatDimension = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value)
      ? `${Math.round(Math.max(0, Math.min(100, value)))}/100` : "Sem dados";
  const treinoTime = formatDimension(breakdown?.treino);
  const nutriKcal = formatDimension(breakdown?.nutri);
  const moveKcal = formatDimension(breakdown?.mob);

  return (
    <div
      ref={measuredTiltRef}
      tabIndex={0}
      role="region"
      aria-label="Performance Sync"
      className="hub-card-interactive rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#13141a] via-[#0d0e12] to-[#08080a] p-5 sm:p-6 relative overflow-hidden shadow-2xl shadow-black/80 group cursor-pointer"
      onClick={() => setShowDetails(!showDetails)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setShowDetails(!showDetails);
        }
      }}
    >
      {/* Luz ambiente superior sincronizada com o status */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-30 group-hover:opacity-60"
        style={{ background: theme.color }}
      />

      {/* Hairline luminoso dinâmico no topo do card */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-500 opacity-60 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${theme.color}, transparent)`,
        }}
      />

      {/* Cabeçalho do Card com Título e Status de Performance */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#FF6600]" />
          <span className="text-[11px] font-mono tracking-[0.2em] uppercase font-bold text-white/90">
            Performance Sync
          </span>
        </div>

        <div className={`flex items-center px-2 py-0.5 rounded-full border text-[9px] font-mono uppercase font-bold tracking-wider ${theme.badgeClass}`}>
          <span>{theme.label}</span>
        </div>
      </div>

      {/* Arco Central Biomecânico de Alta Resolução */}
      <div className="relative z-10 flex flex-col items-center justify-center my-2 sm:my-3">
        <div className="relative w-48 h-36 flex items-center justify-center">
          {/* Segmentos de tick do semicírculo */}
          <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
            {/* Trilha de fundo */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.07)"
              strokeWidth="7"
              strokeDasharray="188 251"
              strokeLinecap="round"
            />
            {/* Arco Ativo com Brilho Neon */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke={theme.color}
              strokeWidth="7"
              strokeDasharray={`${(safeScore / 100) * 188} 251`}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${theme.color})`,
                transition: "stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </svg>

          {/* Display central numérico */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <div className="flex items-baseline">
              <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-white">
                {Math.round(safeScore)}
              </span>
              <span className="text-xs font-mono text-neutral-400 ml-1">/100</span>
            </div>
            <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-neutral-400 mt-0.5">
              SYNC SCORE
            </span>
          </div>
        </div>
      </div>

      {/* Sinais Vitais & Telemetria em Tempo Real (Inspirado no mockup) */}
      <div className="relative z-10 grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-center">
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:border-[#FF6600]/30 transition-all">
          <div className="flex items-center justify-center gap-1 text-[#FF6600] mb-0.5">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Treino</span>
          </div>
          <span className="text-xs font-bold font-mono text-white">{treinoTime}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:border-[#FF6600]/30 transition-all">
          <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5">
            <Utensils className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Nutri</span>
          </div>
          <span className="text-xs font-bold font-mono text-white">{nutriKcal}</span>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] group-hover:border-[#FF6600]/30 transition-all">
          <div className="flex items-center justify-center gap-1 text-cyan-400 mb-0.5">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Mobilidade</span>
          </div>
          <span className="text-xs font-bold font-mono text-white">{moveKcal}</span>
        </div>
      </div>

      {/* Detalhamento Expansível com Análise Neuromotora */}
      <div className="relative z-10 mt-3 pt-1 flex items-center justify-center">
        <button
          type="button"
          aria-expanded={showDetails}
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-400 hover:text-white transition-colors uppercase tracking-widest"
        >
          <span>{showDetails ? "Ocultar 5 Pilares" : "Explorar 5 Pilares Neuromotores"}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showDetails ? "rotate-180 text-[#FF6600]" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {showDetails && breakdown && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 pt-3 mt-2 border-t border-white/[0.06] space-y-2 overflow-hidden"
          >
            <BreakdownRow label="Treino Neuromotor" value={breakdown.treino} color="#FF6600" />
            <BreakdownRow label="Balanço Nutricional" value={breakdown.nutri} color="#27AE60" />
            <BreakdownRow label="Sono & Recuperação" value={breakdown.sono} color="#8A2BE2" />
            <BreakdownRow label="Mobilidade & Fáscia" value={breakdown.mob} color="#00E5FF" />
            <BreakdownRow label="Hidratação Celular" value={breakdown.hidr} color="#3B82F6" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number | null; color: string }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-xs">
      <span className="w-36 shrink-0 truncate text-[11px] font-medium text-neutral-300">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-white w-8 text-right font-bold">
        {value === null ? "—" : `${Math.round(value)}%`}
      </span>
    </div>
  );
}

