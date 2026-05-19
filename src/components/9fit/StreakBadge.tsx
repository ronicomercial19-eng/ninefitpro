import { Flame, AlertTriangle } from "lucide-react";

export function StreakBadge({ streak, hoursSinceLast }: { streak: number; hoursSinceLast?: number }) {
  const atRisk = hoursSinceLast !== undefined && hoursSinceLast > 20 && streak > 0;
  const glow = streak >= 12;

  return (
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
    </div>
  );
}
