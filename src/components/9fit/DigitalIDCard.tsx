import { useState } from 'react';
import { Shield, Zap, Share2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ShareableCard } from '@/components/9fit/ShareableCard';

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
  const [showShare, setShowShare] = useState(false);

  return (
    <>
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowShare(true)}
                aria-label="Compartilhar ID Card"
                className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <Shield className="w-4 h-4 text-primary" />
            </div>
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
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-lg">Compartilhar ID Card</p>
                <button onClick={() => setShowShare(false)} className="w-7 h-7 rounded-lg border border-white/10 grid place-items-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ShareableCard
                contentType="id_card_upgrade"
                title={name}
                subtitle={`LVL ${level} · ${classTier}`}
                stat={{ label: 'SYNC SCORE', value: `${syncScore}%` }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
