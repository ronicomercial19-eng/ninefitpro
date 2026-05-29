import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackMonetizationEvent, type MonetizationContext } from '@/services/monetization';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  context: MonetizationContext;
  headline?: string;
  subline?: string;
  /** Data opcional (ISO) usada em copy dinâmica de post_assessment. */
  contextDate?: string;
}

interface Plan {
  id: string; name: string; price_monthly: number; price_yearly: number;
  features: string[]; is_recommended: boolean;
}

// Copy dinâmica por contexto
function buildCopy(context: MonetizationContext, contextDate?: string) {
  const dateStr = contextDate
    ? new Date(contextDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : 'hoje';
  switch (context) {
    case 'post_assessment':
      return {
        headline: 'Sua avaliação revelou o próximo passo.',
        subline: `Com base na sua avaliação de ${dateStr}, o plano PRIME foi feito para você.`,
      };
    case 'feature_locked':
      return {
        headline: 'Esta feature faz parte do PRIME.',
        subline: 'Desbloqueie agentes IA completos, protocolos premium e muito mais.',
      };
    case 'hub_upsell':
      return {
        headline: 'Acelere seus resultados em 7 dias.',
        subline: 'Você está pronto para o próximo nível. Teste o PRIME sem compromisso.',
      };
    case 'onboarding':
      return {
        headline: 'Bem-vindo ao próximo nível.',
        subline: 'Comece com 7 dias grátis no plano que faz sentido pra você.',
      };
    default:
      return {
        headline: 'Desbloqueie seu próximo nível.',
        subline: '7 dias grátis · cancele quando quiser.',
      };
  }
}

const OUTCOMES: Record<string, string[]> = {
  pro: [
    'Periodização que evolui com você',
    'RON adaptativo + avaliações 360',
    'Protocolos de recuperação',
  ],
  prime: [
    'Tudo do PRO incluso',
    'RON v9 completo + memória longa',
    'Protocolos premium + concierge',
  ],
};

export function ContextualPaywall({ open, onClose, context, headline, subline, contextDate }: Props) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const dynamicCopy = useMemo(() => buildCopy(context, contextDate), [context, contextDate]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('subscription_plans' as any)
        .select('*')
        .in('id', ['pro', 'prime'])
        .order('display_order');
      setPlans((data as any) || []);
      trackMonetizationEvent('view_paywall', null, context);
    })();
  }, [open, context]);

  const handleSelect = async (plan: Plan) => {
    await trackMonetizationEvent('select_plan', plan.id, context);
    await trackMonetizationEvent('start_trial', plan.id, context);
    onClose();
    navigate('/9fit/planos');
  };

  const handleClose = () => {
    trackMonetizationEvent('dismiss_paywall', null, context);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 40 }}
            transition={{ type: 'spring', stiffness: 230, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-gradient-to-b from-card/95 to-card/80 backdrop-blur-2xl border border-primary/25 rounded-3xl p-6 sm:p-7 shadow-[0_40px_120px_-30px_hsl(var(--primary)/0.6)]"
          >
            {/* Halo accent */}
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/[0.18] rounded-full blur-[80px] pointer-events-none" />

            <button
              onClick={handleClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition z-10"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="relative text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl md:text-[28px] font-display tracking-tight text-foreground mb-2 leading-[1.15]">
                {headline || dynamicCopy.headline}
              </h2>
              <p className="text-sm text-muted-foreground leading-snug max-w-[360px] mx-auto">
                {subline || dynamicCopy.subline}
              </p>
            </div>

            <div className="relative grid grid-cols-2 gap-3 mb-5">
              {plans.map((p) => {
                const bullets = OUTCOMES[p.id] || p.features.slice(0, 3);
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className={cn(
                      'text-left p-4 rounded-2xl border transition-all relative',
                      p.is_recommended
                        ? 'bg-gradient-to-b from-primary/15 to-primary/5 border-primary/45 shadow-[0_16px_44px_-14px_hsl(var(--primary)/0.45)]'
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20',
                    )}
                  >
                    {p.is_recommended && (
                      <span className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[8px] tracking-[0.2em] uppercase font-black px-2 py-0.5 rounded-full">
                        Top
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {p.is_recommended ? (
                        <Sparkles className="w-3 h-3 text-primary" />
                      ) : (
                        <Zap className="w-3 h-3 text-muted-foreground" />
                      )}
                      <p className="text-[10px] tracking-[0.25em] uppercase font-bold text-foreground/90">
                        {p.name}
                      </p>
                    </div>
                    <p className="text-2xl font-display tracking-tight text-foreground mb-2 tabular-nums">
                      R$ {p.price_monthly}
                      <span className="text-xs text-muted-foreground font-sans">/mês</span>
                    </p>
                    <ul className="space-y-1.5">
                      {bullets.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80 leading-snug">
                          <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="relative flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground mb-3">
              <Shield className="w-3 h-3" />
              <span>7 dias grátis · cancele em 1 clique · sem fidelidade</span>
            </div>

            <button
              onClick={() => { trackMonetizationEvent('dismiss_paywall', null, context); onClose(); navigate('/9fit/planos'); }}
              className="relative w-full text-xs text-muted-foreground hover:text-foreground transition py-1"
            >
              Ver todos os planos →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
