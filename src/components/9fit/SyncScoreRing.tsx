import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  score: number;              // 0-100
  breakdown?: {
    treino: number;
    nutri: number;
    sono: number;
    mob: number;
    hidr: number;
  };
}

// Tokens canônicos (PROMPT 4)
const COLOR_LOW = "#E8571A";    // 0-29 sem glow / 30-59 com glow 6px
const COLOR_MID = "#F2C94C";    // 60-79
const COLOR_HIGH = "#27AE60";   // 80-100

function getRingStyle(score: number) {
  let color = COLOR_LOW;
  let glow = "none";
  if (score >= 80) { color = COLOR_HIGH; glow = `drop-shadow(0 0 14px ${COLOR_HIGH})`; }
  else if (score >= 60) { color = COLOR_MID; glow = `drop-shadow(0 0 10px ${COLOR_MID})`; }
  else if (score >= 30) { color = COLOR_LOW; glow = `drop-shadow(0 0 6px ${COLOR_LOW})`; }
  else { color = COLOR_LOW; glow = "none"; }
  // Cor do arco conforme faixa (60-100 verde)
  const arcColor = score >= 60 ? COLOR_HIGH : score >= 30 ? COLOR_MID : COLOR_LOW;
  return { color, arcColor, glow };
}

export function SyncScoreRing({ score, breakdown }: Props) {
  const navigate = useNavigate();
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const isCalibrating = safeScore === 0;
  const { arcColor, glow } = getRingStyle(safeScore);

  // Estado calibrando: pulso neon
  if (isCalibrating) {
    return (
      <div className="surface-card p-5 relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-[180px] h-[180px] shrink-0 flex items-center justify-center"
          >
            {/* Anel pulsante neon laranja durante calibração */}
            <motion.div
              animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.96, 1.02, 0.96] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from -90deg, ${COLOR_LOW} 0deg 90deg, transparent 90deg 360deg)`,
                filter: `drop-shadow(0 0 10px ${COLOR_LOW})`,
                WebkitMask: "radial-gradient(circle, transparent 62%, black 63%)",
                mask: "radial-gradient(circle, transparent 62%, black 63%)",
                transition: "all 0.6s ease",
              }}
            />
            <div className="relative flex flex-col items-center text-center">
              <Sparkles className="w-6 h-6 mb-1" style={{ color: COLOR_LOW }} />
              <span className="text-[10px] font-data tracking-[0.3em] uppercase" style={{ color: COLOR_LOW }}>CALIBRANDO</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Aguardando você</span>
            </div>
          </motion.div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-display text-xl text-foreground leading-tight mb-1.5">
              Seu sistema está pronto<br />para começar a sentir você.
            </h3>
            <p className="text-xs text-muted-foreground leading-snug mb-4 max-w-[280px] mx-auto sm:mx-0">
              Faça sua avaliação inicial em 3 minutos e o RON começa a calibrar seu Sync Score em tempo real.
            </p>
            <button
              onClick={() => navigate('/9fit/onboarding')}
              className="inline-flex items-center gap-2 text-xs font-bold tracking-wide px-4 py-2.5 rounded-full transition"
              style={{
                background: COLOR_LOW,
                color: "#0a0a0a",
                boxShadow: `0 8px 24px -6px ${COLOR_LOW}88`,
              }}
            >
              Começar avaliação
              <ArrowRight className="w-3.5 h-3.5" />
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
    transition: "all 0.6s ease",
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-5">
        <div className="relative w-[180px] h-[180px] shrink-0">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={ringStyle}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-data tracking-[0.3em] uppercase" style={{ color: arcColor }}>SYNC</span>
            <span className="text-hero text-5xl text-foreground">{Math.round(safeScore)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-sm">
          {breakdown ? (
            <>
              <Row label="Treino" v={breakdown.treino} />
              <Row label="Nutrição" v={breakdown.nutri} />
              <Row label="Sono" v={breakdown.sono} />
              <Row label="Mobilidade" v={breakdown.mob} />
              <Row label="Hidratação" v={breakdown.hidr} />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aderência composta dos últimos 7 dias.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${Math.min(100, v)}%` }} />
      </div>
      <span className="text-[10px] font-data text-foreground w-8 text-right">{Math.round(v)}</span>
    </div>
  );
}
