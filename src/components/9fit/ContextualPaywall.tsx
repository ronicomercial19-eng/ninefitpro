import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackMonetizationEvent, type MonetizationContext } from '@/services/monetization';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  context: MonetizationContext;
  headline?: string;
  subline?: string;
}

interface Plan {
  id: string; name: string; price_monthly: number; price_yearly: number;
  features: string[]; is_recommended: boolean;
}

export function ContextualPaywall({ open, onClose, context, headline, subline }: Props) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);

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
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 30 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-card/95 backdrop-blur-2xl border border-primary/20 rounded-3xl p-7 shadow-[0_40px_120px_-30px_hsl(var(--primary)/0.5)]"
          >
            <button onClick={handleClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-display tracking-tight text-foreground mb-2 leading-tight">
                {headline || 'Desbloqueie seu próximo nível'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {subline || '7 dias de teste • Cancele quando quiser'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={cn(
                    'text-left p-4 rounded-2xl border transition-all',
                    p.is_recommended
                      ? 'bg-primary/10 border-primary/40 shadow-[0_12px_36px_-12px_hsl(var(--primary)/0.4)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/15',
                  )}
                >
                  <p className="text-[10px] tracking-[0.25em] uppercase text-primary/80 font-semibold mb-1">{p.name}</p>
                  <p className="text-2xl font-display tracking-tight text-foreground mb-2">
                    R$ {p.price_monthly}<span className="text-xs text-muted-foreground">/mês</span>
                  </p>
                  <ul className="space-y-1.5">
                    {p.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                        <Check className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <button
              onClick={() => { trackMonetizationEvent('dismiss_paywall', null, context); onClose(); navigate('/9fit/planos'); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition"
            >
              Ver todos os planos →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
