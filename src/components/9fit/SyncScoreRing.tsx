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

export function SyncScoreRing({ score, breakdown }: Props) {
  const navigate = useNavigate();
  const radius = 72;
  const stroke = 10;
  const c = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score));
  const offset = c - (safeScore / 100) * c;
  const isZero = safeScore === 0;

  // Estado zero: tela acolhedora com CTA claro em vez de número frio.
  if (isZero) {
    return (
      <div className="surface-card p-5 relative overflow-hidden">
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none"
          style={{ background: 'hsl(var(--primary) / 0.18)' }}
        />
        <div className="relative flex flex-col sm:flex-row items-center gap-5">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative w-[160px] h-[160px] shrink-0 flex items-center justify-center"
          >
            <svg width="160" height="160" viewBox="0 0 180 180" className="-rotate-90 absolute inset-0">
              <circle
                cx="90" cy="90" r={radius}
                stroke="hsl(0 0% 100% / 0.06)"
                strokeWidth={stroke}
                fill="none"
                strokeDasharray="4 6"
              />
            </svg>
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute w-20 h-20 rounded-full"
              style={{ background: 'hsl(var(--primary) / 0.18)', filter: 'blur(20px)' }}
            />
            <div className="relative flex flex-col items-center">
              <Sparkles className="w-6 h-6 text-primary mb-1" />
              <span className="text-label">CALIBRANDO</span>
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
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs font-bold tracking-wide px-4 py-2.5 rounded-full hover:opacity-90 transition shadow-[0_8px_24px_-6px_hsl(var(--primary)/0.5)]"
            >
              Começar avaliação
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-5">
        <div className="relative w-[180px] h-[180px] shrink-0">
          <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
            <circle cx="90" cy="90" r={radius} stroke="hsl(0 0% 100% / 0.06)" strokeWidth={stroke} fill="none" />
            <motion.circle
              cx="90" cy="90" r={radius}
              stroke="hsl(var(--primary))"
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-label">SYNC</span>
            <span className="text-hero text-5xl text-foreground">{Math.round(score)}</span>
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
