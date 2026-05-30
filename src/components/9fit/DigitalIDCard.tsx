import { Shield, Zap } from 'lucide-react';

interface Props {
  name: string;
  level: number;
  classTier?: string;
  syncScore: number;
  totalXP: number;
  streak: number;
}

export function DigitalIDCard({ name, level, classTier = 'Diamante', syncScore, totalXP, streak }: Props) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const levelProgress = (totalXP % 1000) / 10;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-card shadow-elevated">
      {/* Holographic gradient */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.35), transparent 55%), radial-gradient(circle at 100% 100%, hsl(var(--neural) / 0.25), transparent 60%)',
        }}
      />
      <div className="relative p-6 space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-data tracking-[0.3em] text-muted-foreground">9FIT · ID CARD</span>
          <Shield className="w-4 h-4 text-primary" />
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-elevated border border-white/10 flex items-center justify-center">
            <span className="font-display text-2xl text-foreground">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-xl truncate">{name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                LVL {level}
              </span>
              <span className="text-[10px] tracking-widest uppercase text-muted-foreground">· {classTier}</span>
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] tracking-widest uppercase text-muted-foreground">XP NEXT LEVEL</span>
            <span className="text-[10px] font-data text-foreground">{totalXP.toLocaleString('pt-BR')} XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${levelProgress}%`, background: 'hsl(var(--primary))' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <Stat label="Sync" value={syncScore} suffix="%" />
          <Stat label="Streak" value={streak} suffix="d" />
          <Stat label="Class" value={classTier.slice(0, 4).toUpperCase()} icon={<Zap className="w-3 h-3 text-primary" />} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix, icon }: { label: string; value: number | string; suffix?: string; icon?: React.ReactNode }) {
  return (
    <div className="surface-elevated p-3">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[9px] tracking-widest uppercase text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="font-display text-lg text-foreground">
        {value}
        {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}
