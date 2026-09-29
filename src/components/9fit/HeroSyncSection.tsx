import { motion } from "framer-motion";
import { SyncScoreRing } from "./SyncScoreRing";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";

interface Props {
  name: string;
  syncScore: number | null;
  scoreStatus?: HubScoreStatus;
  breakdown: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
  lastUpdate?: string;
}

export function HeroSyncSection({ name, syncScore, scoreStatus = "calibrating", breakdown, lastUpdate }: Props) {
  const measured = typeof syncScore === "number" && (scoreStatus === "available" || scoreStatus === "stale");
  const headline =
    scoreStatus === "offline" ? "Você está sem conexão. O último estado não será recalculado." :
    scoreStatus === "error" ? "Não foi possível atualizar seus dados agora." :
    scoreStatus === "loading" ? "Atualizando seus sinais biométricos…" :
    !measured ? "Seu sistema ainda está em calibração." :
    scoreStatus === "stale" ? "Seus dados precisam de uma nova leitura." :
    syncScore >= 80 ? "Seu plano está em máxima consistência." :
    syncScore >= 60 ? "Seu ritmo está estável. Vamos manter a consistência." :
    `Olá, ${name}. Sinto falta dos seus sinais! Vamos retomar o registro para calibrar seu plano com precisão?`;

  const timestamp = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : scoreStatus === "offline" ? "OFFLINE"
    : scoreStatus === "error" ? "ERRO"
    : scoreStatus === "loading" ? "ATUALIZANDO"
    : "CALIBRANDO";

  return (
    <section className="relative w-full px-4 pt-4 pb-2">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-muted-foreground uppercase">
          <span className="text-primary font-bold">NINE PRO · FIT OS</span>
          <span>{timestamp}</span>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
            {name ? `Olá, ${name}` : "Sincronia diária"}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-0.5 leading-tight">
            {headline}
          </h1>
        </div>

        <SyncScoreRing score={syncScore} status={scoreStatus} breakdown={breakdown} />
      </motion.div>
    </section>
  );
}
