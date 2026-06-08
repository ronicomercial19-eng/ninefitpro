import { motion } from 'framer-motion';
import { Check, Sparkles, ChevronRight, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ACTIVATION_EVENTS, useActivationProgress, type ActivationKey } from '@/hooks/useActivationProgress';
import { cn } from '@/lib/utils';

// Cada missão pendente leva o usuário para o lugar certo de completá-la.
const ROUTE_BY_KEY: Record<ActivationKey, string> = {
  profile_complete:  '/9fit/profile',
  first_assessment:  '/9fit/avaliacao-guiada',
  first_plan:        '/9fit/planejamento',
  first_workout:     '/9fit/train',
  hub_engagement:    '/9fit/hub',
  streak_7d:         '/9fit/hub',
};

const CTA_BY_KEY: Record<ActivationKey, string> = {
  profile_complete:  'Completar perfil',
  first_assessment:  'Fazer avaliação',
  first_plan:        'Gerar meu plano',
  first_workout:     'Iniciar treino',
  hub_engagement:    'Voltar amanhã',
  streak_7d:         'Manter consistência',
};

export function ActivationMissionCard() {
  const navigate = useNavigate();
  const { completed, percent, done, total, next, loading } = useActivationProgress();
  if (loading) return null;
  if (done >= total) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl p-5 bg-gradient-to-br from-primary/[0.12] via-card/60 to-card/40 border border-primary/25 backdrop-blur-xl overflow-hidden"
    >
      {/* Halo accent */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />

      <button
        onClick={() => navigate('/9fit/ativacao')}
        className="relative w-full flex items-center justify-between mb-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Rocket className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-black leading-none">Sua ativação</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ver todas as missões →</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-display tracking-tight text-foreground tabular-nums leading-none">
            {done}<span className="text-sm text-muted-foreground">/{total}</span>
          </p>
          <p className="text-[9px] tracking-wider uppercase text-muted-foreground mt-1">{percent}% completo</p>
        </div>
      </button>

      {/* Progress bar */}
      <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
        />
      </div>

      {/* Next mission highlighted */}
      {next && (
        <button
          onClick={() => navigate(ROUTE_BY_KEY[next.key])}
          className="relative w-full mb-3 rounded-xl p-3 bg-primary/[0.12] border border-primary/30 hover:bg-primary/[0.18] transition text-left flex items-center gap-3 group"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-7 h-7 rounded-full bg-primary/25 flex items-center justify-center shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] tracking-[0.25em] uppercase text-primary font-bold mb-0.5">Próxima missão</p>
            <p className="text-[13px] font-semibold text-foreground leading-tight">{next.label}</p>
          </div>
          <span className="text-[11px] font-bold text-primary mr-1 group-hover:translate-x-0.5 transition-transform">
            {CTA_BY_KEY[next.key]}
          </span>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        </button>
      )}

      {/* Full checklist */}
      <div className="relative space-y-1.5">
        {ACTIVATION_EVENTS.map((ev) => {
          const isDone = completed.has(ev.key);
          const isNext = next?.key === ev.key;
          if (isNext) return null; // já destacado acima
          return (
            <div
              key={ev.key}
              className={cn(
                'flex items-center gap-2.5 text-xs py-0.5',
                isDone ? 'opacity-50' : 'opacity-70',
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition',
                isDone ? 'bg-primary border-primary' : 'border-white/20',
              )}>
                {isDone && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className={cn('flex-1 text-foreground/80', isDone && 'line-through text-muted-foreground')}>
                {ev.label}
              </span>
              <span className="text-[9px] text-muted-foreground tabular-nums">d{ev.day}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
