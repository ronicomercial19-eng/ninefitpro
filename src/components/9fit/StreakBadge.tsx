import { useState } from "react";
import { Flame, AlertTriangle, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ShareableCard } from "@/components/9fit/ShareableCard";

/** Marcos de streak que valem compartilhar — evita oferecer o botão todo dia. */
const SHARE_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

export function StreakBadge({ streak, hoursSinceLast }: { streak: number; hoursSinceLast?: number }) {
  const atRisk = hoursSinceLast !== undefined && hoursSinceLast > 20 && streak > 0;
  const glow = streak >= 12;
  const [showShare, setShowShare] = useState(false);
  const isMilestone = SHARE_MILESTONES.includes(streak);

  return (
    <>
      <div className={`surface-card p-4 flex items-center gap-3 ${glow ? "ring-primary-soft" : ""}`}>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Flame className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-label">STREAK</p>
          <p className="text-display text-2xl">{streak} <span className="text-sm text-muted-foreground font-normal">dias</span></p>
        </div>
        {atRisk && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/15 text-destructive text-[10px] font-semibold">
            <AlertTriangle className="w-3 h-3" /> EM RISCO
          </div>
        )}
        {!atRisk && isMilestone && (
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase"
          >
            <Share2 className="w-3 h-3" /> Compartilhar
          </button>
        )}
      </div>

      <AnimatePresence>
        {showShare && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowShare(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-primary/30 bg-background p-5 pb-8 sm:pb-5"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ShareableCard
                contentType="streak_7"
                title={`${streak} dias seguidos`}
                subtitle="Consistência é o que constrói resultado"
                stat={{ label: "STREAK", value: `${streak}d` }}
              />
              <button
                onClick={() => setShowShare(false)}
                className="w-full mt-3 rounded-full border border-white/15 py-2.5 text-xs text-muted-foreground"
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
