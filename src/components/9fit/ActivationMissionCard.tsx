import { motion } from 'framer-motion';
import { Check, Sparkles, ChevronRight } from 'lucide-react';
import { ACTIVATION_EVENTS, useActivationProgress } from '@/hooks/useActivationProgress';
import { cn } from '@/lib/utils';

export function ActivationMissionCard() {
  const { completed, percent, done, total, next, loading } = useActivationProgress();
  if (loading) return null;
  if (done >= total) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 bg-gradient-to-br from-primary/10 to-card/40 border border-primary/20 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-primary/90 font-bold">Sua ativação</p>
        </div>
        <span className="text-xs text-muted-foreground">{done}/{total}</span>
      </div>

      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.6 }}
          className="h-full bg-gradient-to-r from-primary to-primary/70"
        />
      </div>

      <div className="space-y-2">
        {ACTIVATION_EVENTS.map((ev) => {
          const isDone = completed.has(ev.key);
          const isNext = next?.key === ev.key;
          return (
            <div
              key={ev.key}
              className={cn(
                'flex items-center gap-2.5 text-xs transition-opacity',
                isDone ? 'opacity-60' : isNext ? 'opacity-100' : 'opacity-50',
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                isDone ? 'bg-primary border-primary' : 'border-white/20',
              )}>
                {isDone && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className={cn('flex-1', isDone && 'line-through')}>{ev.label}</span>
              {isNext && <ChevronRight className="w-3 h-3 text-primary" />}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
