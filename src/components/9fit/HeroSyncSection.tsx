import { motion } from "framer-motion";
import { SyncScoreRing } from "./SyncScoreRing";

interface Props {
  name: string;
  syncScore: number;
  breakdown: { treino: number; nutri: number; sono: number; mob: number; hidr: number };
  lastUpdate?: string;
}

// FIX #18 (QA Master): "O sistema ainda está te calibrando" aparecia
// repetido sem explicar o que falta nem quanto já foi coletado.
function calibrationDetail(breakdown: Props["breakdown"]) {
  const dims: { label: string; v: number }[] = [
    { label: "Perfil", v: breakdown.treino },
    { label: "Nutrição", v: breakdown.nutri },
    { label: "Sono", v: breakdown.sono },
    { label: "Mobilidade", v: breakdown.mob },
    { label: "Hidratação", v: breakdown.hidr },
  ];
  const collected = dims.filter((d) => d.v > 0).length;
  const missing = dims.filter((d) => d.v === 0).map((d) => d.label);
  return { collected, total: dims.length, missing };
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

  const isCalibrating = syncScore === 0;
  const calib = calibrationDetail(breakdown);

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
            className="text-display text-3xl sm:text-5xl leading-tight max-w-md mb-3 text-foreground"
          >
            {headline}
          </motion.h1>

          {isCalibrating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-4 max-w-xs"
            >
              <div className="flex items-center justify-between text-[10px] font-data text-muted-foreground mb-1">
                <span>{calib.collected}/{calib.total} sinais coletados</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(calib.collected / calib.total) * 100}%` }}
                />
              </div>
              {calib.missing.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Faltando: {calib.missing.join(", ")}
                </p>
              )}
            </motion.div>
          )}

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
