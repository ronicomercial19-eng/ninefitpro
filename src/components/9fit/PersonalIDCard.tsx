import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { useState } from "react";

interface Props {
  name: string;
  level: number;
  classTier: string;
  syncScore: number; // 0-100
  streak: number;
  totalXP: number;
}

export function PersonalIDCard({ name, level, classTier, syncScore, streak, totalXP }: Props) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full h-44 cursor-pointer [perspective:1200px]"
      onClick={() => setFlipped((f) => !f)}
    >
      <motion.div
        className="relative w-full h-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* FRONT */}
        <div className="absolute inset-0 [backface-visibility:hidden] glass-mission rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 gradient-mission opacity-50 pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <h2 className="text-editorial text-3xl text-foreground">{name}</h2>
              <p className="text-[10px] font-data text-muted-foreground mt-0.5">
                LV.{level} • CLASS {classTier.toUpperCase()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-primary">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-xs font-data font-bold">{streak}d</span>
              </div>
              <div className="flex items-center gap-1 text-foreground/70">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-xs font-data">{totalXP} XP</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-[9px] font-data tracking-[0.25em] text-muted-foreground">SYNC SCORE</span>
              <span className="text-massive text-2xl text-primary">{syncScore}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary/70 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${syncScore}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <p className="text-[9px] font-data text-muted-foreground mt-1">Toque para detalhes</p>
          </div>
        </div>

        {/* BACK */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] glass-mission rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-[10px] font-data tracking-[0.3em] text-primary/80">DIAGNOSTIC // NEURAL</p>
          <div className="space-y-2">
            <Row label="Aderência" value="87%" />
            <Row label="Recuperação" value="92%" />
            <Row label="Bio-Sync" value="ONLINE" highlight />
            <Row label="Protocolo" value={classTier.toUpperCase()} />
          </div>
          <p className="text-[9px] font-data text-muted-foreground">Toque para voltar</p>
        </div>
      </motion.div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-1">
      <span className="text-[10px] font-data tracking-widest text-muted-foreground uppercase">{label}</span>
      <span className={`text-xs font-data ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
