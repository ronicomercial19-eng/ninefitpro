import { useEffect, useState } from 'react';
import { Award, Zap } from 'lucide-react';

interface OverlayState {
  open: boolean;
  xp: number;
  action?: string;
  leveledUp?: boolean;
  newLevel?: number;
}

/**
 * Global overlay that listens to 9fit:xp_awarded / 9fit:level_up and shows
 * a premium mission-complete burst. Mounted once at the App root.
 */
export function MissionCompleteOverlay() {
  const [s, setS] = useState<OverlayState>({ open: false, xp: 0 });

  useEffect(() => {
    const onXp = (e: any) => {
      const xp = e?.detail?.xp ?? 0;
      // Only show overlay for meaningful awards (>=50) to avoid noise
      if (xp >= 50) {
        setS({
          open: true,
          xp,
          action: e?.detail?.action,
          leveledUp: !!e?.detail?.leveledUp,
          newLevel: e?.detail?.newLevel,
        });
      }
    };
    window.addEventListener('9fit:xp_awarded', onXp);
    return () => window.removeEventListener('9fit:xp_awarded', onXp);
  }, []);

  useEffect(() => {
    if (!s.open) return;
    const t = setTimeout(() => setS(prev => ({ ...prev, open: false })), 2800);
    return () => clearTimeout(t);
  }, [s.open]);

  if (!s.open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/85 backdrop-blur-xl animate-fade-in"
      onClick={() => setS(prev => ({ ...prev, open: false }))}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full blur-[100px] animate-pulse"
             style={{ background: 'hsl(var(--primary) / 0.22)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-8 space-y-5 animate-slide-up">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-60 animate-ping"
               style={{ background: 'hsl(var(--primary))' }} />
          <Award size={72} className="text-primary relative z-10" strokeWidth={1.6} />
        </div>

        <div>
          <h2 className="text-3xl font-display tracking-tight text-foreground mb-2">
            {s.leveledUp ? `Level Up · LVL ${s.newLevel}` : 'Missão Concluída'}
          </h2>
          <div className="w-32 h-px mx-auto mb-3" style={{ background: 'hsl(var(--primary) / 0.6)' }} />
          <p className="text-2xl font-data font-bold text-primary tracking-widest flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 fill-primary" /> +{s.xp} XP
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          Sincronizando interface neural…
        </p>
      </div>
    </div>
  );
}
