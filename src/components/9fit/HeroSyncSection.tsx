import { motion } from "framer-motion";
import { SyncScoreRing } from "./SyncScoreRing";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";

interface Props {
  name: string;
  syncScore: number | null;
  scoreStatus?: HubScoreStatus;
  breakdown: { treino: number | null; nutri: number | null; sono: number | null; mob: number | null; hidr: number | null };
  lastUpdate?: string;
  onRefresh?: () => void;
}

export function HeroSyncSection({ name, syncScore, scoreStatus = "calibrating", breakdown, lastUpdate, onRefresh }: Props) {
  const measured = typeof syncScore === "number" && (scoreStatus === "available" || scoreStatus === "stale");
  const headline =
    scoreStatus === "offline" ? "Você está sem conexão. O último estado não será recalculado." :
    scoreStatus === "error" ? "Não foi possível atualizar seus dados agora." :
    scoreStatus === "loading" ? "Atualizando seus sinais biométricos…" :
    !measured ? "Seu sistema ainda está em calibração." :
    scoreStatus === "stale" ? "Seus dados precisam de uma nova leitura." :
    syncScore >= 80 ? "Seu plano está em máxima consistência." :
    syncScore >= 60 ? "Seu ritmo está estável. Vamos manter a consistência." :
    "Há pouco sinal recente para calibrar seu plano com precisão.";

  const validUpdate = lastUpdate && Number.isFinite(new Date(lastUpdate).getTime());
  const timestamp = scoreStatus === "offline" ? "OFFLINE"
    : scoreStatus === "error" ? "ERRO"
    : scoreStatus === "loading" ? "ATUALIZANDO"
    : validUpdate ? `Leitura ${new Date(lastUpdate).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
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
          <span role="status" aria-live="polite">{timestamp}</span>
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
        {onRefresh && <button type="button" onClick={onRefresh} disabled={scoreStatus === "loading"} className="text-xs text-primary disabled:opacity-50 min-h-10">
          {scoreStatus === "loading" ? "Atualizando…" : "Atualizar meus dados"}
        </button>}
      </motion.div>
    </section>
  );
}
