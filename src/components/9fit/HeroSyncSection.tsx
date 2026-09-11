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
    scoreStatus === "loading" ? "Atualizando seus sinais…" :
    !measured ? "Seu sistema ainda está em calibração." :
    scoreStatus === "stale" ? "Seus dados precisam de uma nova leitura." :
    syncScore >= 80 ? "Seu plano está em boa consistência." :
    syncScore >= 60 ? "Seu ritmo está estável. Vamos manter a consistência." :
    "Há pouco sinal recente para ajustar seu plano com segurança.";

  const timestamp = lastUpdate
    ? new Date(lastUpdate).toLocaleString("pt-BR")
    : scoreStatus === "offline" ? "offline"
    : scoreStatus === "error" ? "erro de atualização"
    : scoreStatus === "loading" ? "atualizando"
    : "calibrando";

  return <section className="journey-card relative w-full overflow-hidden">
    <div className="relative aspect-[3/4] sm:aspect-[16/9] w-full">
      <div className="absolute inset-0 bg-cover bg-center grayscale"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80')" }} aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
      <div className="absolute inset-0 opacity-80" style={{ background: "var(--halo-primary)", mixBlendMode: "screen" }} aria-hidden />
      <div className="relative h-full flex flex-col justify-end pb-10 px-6">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-[10px] tracking-[0.4em] uppercase text-primary/80 font-data mb-2">
          9FIT · HUB · {timestamp}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="text-display text-3xl sm:text-5xl leading-tight max-w-md mb-6 text-foreground">{headline}</motion.h1>
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-end gap-4">
          <div className="w-40 h-40 sm:w-48 sm:h-48">
            <SyncScoreRing score={syncScore} status={scoreStatus} breakdown={breakdown} />
          </div>
          <div className="pb-4">
            <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">{name}</p>
            <p className="text-xs text-muted-foreground max-w-[180px] leading-snug">HRV · sono · treino · nutrição · hidratação</p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>;
}
