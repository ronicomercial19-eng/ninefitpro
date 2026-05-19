import { motion } from "framer-motion";

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
  const radius = 72;
  const stroke = 10;
  const c = 2 * Math.PI * radius;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;

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
