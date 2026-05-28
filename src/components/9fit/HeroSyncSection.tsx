import { motion } from "framer-motion";
import { SyncScoreRing } from "./SyncScoreRing";

interface Props {
  name: string;
  syncScore: number;
  breakdown: { treino: number; nutri: number; sono: number; mob: number; hidr: number };
  lastUpdate?: string;
}

/**
 * Hero cinematográfico do Hub.
 * Imagem B&W full-bleed + overlay pesado + halo accent + Sync Score gigante.
 */
export function HeroSyncSection({ name, syncScore, breakdown, lastUpdate = "agora" }: Props) {
  const headline =
    syncScore >= 80
      ? "Seu organismo está operando acima da média."
      : syncScore >= 60
      ? "Sistema em equilíbrio. Mantenha o ritmo."
      : syncScore > 0
      ? "Sinais de sobrecarga detectados."
      : "O sistema ainda está te calibrando.";

  return (
    <section className="relative w-full overflow-hidden">
      {/* B&W full-bleed background */}
      <div className="relative aspect-[3/4] sm:aspect-[16/9] w-full">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80')",
          }}
          aria-hidden
        />
        {/* Overlay duplo */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div
          className="absolute inset-0 opacity-80"
          style={{ background: "var(--halo-primary)", mixBlendMode: "screen" }}
          aria-hidden
        />

        {/* Conteúdo */}
        <div className="relative h-full flex flex-col justify-end pb-10 px-6">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[10px] tracking-[0.4em] uppercase text-primary/80 font-data mb-2"
          >
            9FIT · NEURAL OS · {lastUpdate}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-display text-3xl sm:text-5xl leading-tight max-w-md mb-6 text-foreground"
          >
            {headline}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="flex items-end gap-4"
          >
            <div className="w-40 h-40 sm:w-48 sm:h-48">
              <SyncScoreRing score={syncScore} breakdown={breakdown} />
            </div>
            <div className="pb-4">
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-1">
                {name}
              </p>
              <p className="text-xs text-muted-foreground max-w-[180px] leading-snug">
                HRV · sono · treino · nutrição · hidratação
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
