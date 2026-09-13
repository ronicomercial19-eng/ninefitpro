import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";

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

function getRingStyle(score: number) {
  let color = COLOR_LOW;
  let glow = "none";
  if (score >= 71) { color = COLOR_HIGH; glow = `drop-shadow(0 0 16px ${COLOR_HIGH})`; }
  else if (score >= 41) { color = COLOR_MID; glow = `drop-shadow(0 0 14px ${COLOR_MID})`; }
  else { glow = `drop-shadow(0 0 10px ${COLOR_LOW})`; }
  return { arcColor: color, glow };
}

export function SyncScoreRing({ score, status, breakdown }: Props) {
  const navigate = useNavigate();
  const measured = score !== null && (status === "available" || status === "stale");
  const safeScore = Math.max(0, Math.min(100, score ?? 0));
  const { arcColor, glow } = getRingStyle(safeScore);

  if (!measured) {
    const label = status === "offline" ? "SEM CONEXÃO" : status === "error" ? "INDISPONÍVEL" : "CALIBRANDO";
    return (
      <div className="surface-card p-5 relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="relative w-full h-full aspect-square shrink-0 flex items-center justify-center">
            <motion.div animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.96, 1.02, 0.96] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full"
              style={{ background: `conic-gradient(from -90deg, ${COLOR_MID} 0deg 90deg, transparent 90deg 360deg)`,
                filter: `drop-shadow(0 0 10px ${COLOR_MID})`,
                WebkitMask: "radial-gradient(circle, transparent 62%, black 63%)",
                mask: "radial-gradient(circle, transparent 62%, black 63%)" }} />
            <div className="relative flex flex-col items-center text-center">
              <Sparkles className="w-6 h-6 mb-1" style={{ color: COLOR_MID }} />
              <span className="text-[10px] font-data tracking-[0.3em] uppercase" style={{ color: COLOR_MID }}>{label}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Nenhuma leitura inventada</span>
            </div>
          </motion.div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-display text-xl text-foreground leading-tight mb-1.5">Precisamos de sinais reais para calcular seu Sync.</h3>
            <p className="text-xs text-muted-foreground leading-snug mb-4 max-w-[280px] mx-auto sm:mx-0">
              Registre sua avaliação e atividades. O painel será atualizado quando houver dados suficientes.
            </p>
            <button onClick={() => navigate("/9fit/onboarding")}
              className="inline-flex items-center gap-2 text-xs font-bold tracking-wide px-4 py-2.5 rounded-full"
              style={{ background: COLOR_MID, color: "#0a0a0a" }}>
              Começar avaliação <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ringStyle: React.CSSProperties = {
    background: `conic-gradient(from -90deg, ${arcColor} 0% ${safeScore}%, rgba(255,255,255,0.06) ${safeScore}% 100%)`,
    filter: glow,
    WebkitMask: "radial-gradient(circle, transparent 62%, black 63%)",
    mask: "radial-gradient(circle, transparent 62%, black 63%)",
  };

  return (
    <div className="surface-card p-4 sm:p-5">
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="relative h-32 w-32 sm:h-36 sm:w-36 shrink-0">
          <motion.div className="absolute inset-0 rounded-full" style={ringStyle}
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-data tracking-[0.3em] uppercase" style={{ color: arcColor }}>SYNC</span>
            <span className="text-hero text-5xl text-foreground">{Math.round(safeScore)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">/ 100{status === "stale" ? " · desatualizado" : ""}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 text-sm">
          {breakdown ? <>
            <Row label="Treino" value={breakdown.treino} />
            <Row label="Nutrição" value={breakdown.nutri} />
            <Row label="Sono" value={breakdown.sono} />
            <Row label="Mobilidade" value={breakdown.mob} />
            <Row label="Hidratação" value={breakdown.hidr} />
          </> : <p className="text-xs text-muted-foreground">Aderência dos últimos 7 dias.</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number | null }) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  return <div className="flex min-w-0 items-center justify-between gap-2">
    <span className="w-[70px] shrink-0 truncate text-xs text-muted-foreground">{label}</span>
    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
      <div className="h-full bg-primary" style={{ width: `${width}%` }} />
    </div>
    <span className="text-[10px] font-data text-foreground w-8 text-right">{value === null ? "—" : Math.round(value)}</span>
  </div>;
}
