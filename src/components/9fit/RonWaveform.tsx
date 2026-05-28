import { motion } from "framer-motion";

/**
 * Waveform animado do RON — 5 barras com altura senoidal,
 * easing premium (não bounce/pulse gamer).
 */
export function RonWaveform({ active = true, size = 40 }: { active?: boolean; size?: number }) {
  const bars = [0, 1, 2, 3, 4];
  return (
    <div
      className="flex items-center justify-center gap-1"
      style={{ height: size }}
      aria-hidden
    >
      {bars.map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-primary"
          initial={{ height: size * 0.3 }}
          animate={
            active
              ? {
                  height: [
                    size * 0.3,
                    size * (0.4 + Math.sin(i) * 0.3 + 0.3),
                    size * 0.3,
                  ],
                }
              : { height: size * 0.3 }
          }
          transition={{
            duration: 1.4 + i * 0.12,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
            delay: i * 0.08,
          }}
        />
      ))}
    </div>
  );
}
