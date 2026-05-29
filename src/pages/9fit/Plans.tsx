import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowLeft, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackMonetizationEvent } from '@/services/monetization';
import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  is_recommended: boolean;
  display_order: number;
}

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subscription_plans' as any)
        .select('*')
        .order('display_order');
      setPlans((data as any) || []);
      setLoading(false);
      trackMonetizationEvent('view_paywall', null, 'dedicated_screen');
    })();
  }, []);

  const handleSelect = async (plan: Plan) => {
    await trackMonetizationEvent('select_plan', plan.id, 'dedicated_screen', { cycle });
    if (plan.id === 'starter') {
      navigate('/9fit/hub');
      return;
    }
    await trackMonetizationEvent('start_trial', plan.id, 'dedicated_screen', { cycle });
    // TODO: redirecionar para 9Pay quando integrado
    navigate('/9fit/hub');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 py-8 pb-32">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground text-xs tracking-[0.2em] uppercase flex items-center gap-2 mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        <header className="text-center mb-10">
          <p className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-semibold mb-3">9FIT PRO • Planos</p>
          <h1 className="text-4xl md:text-5xl font-display tracking-tight text-foreground mb-3 leading-[1.05]">
            Escolha seu nível de<br />performance e longevidade.
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Planos desenhados para quem quer resultados reais e recorrentes.
          </p>
        </header>

        {/* Cycle toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-card/40 border border-white/[0.06] rounded-full p-1">
            <button
              onClick={() => setCycle('monthly')}
              className={cn(
                'px-5 py-2 rounded-full text-xs tracking-[0.2em] uppercase font-semibold transition-all',
                cycle === 'monthly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={cn(
                'px-5 py-2 rounded-full text-xs tracking-[0.2em] uppercase font-semibold transition-all relative',
                cycle === 'yearly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              Anual
              <span className="ml-2 text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">−25%</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground text-sm">Carregando planos...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {plans.map((plan, idx) => {
              const price = cycle === 'monthly' ? plan.price_monthly : plan.price_yearly / 12;
              const yearlyTotal = plan.price_yearly;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    'relative rounded-3xl p-7 backdrop-blur-xl transition-all',
                    plan.is_recommended
                      ? 'bg-gradient-to-b from-primary/10 to-card/40 border-2 border-primary/40 shadow-[0_24px_80px_-24px_hsl(var(--primary)/0.4)]'
                      : 'bg-card/40 border border-white/[0.06] hover:border-white/15',
                  )}
                >
                  {plan.is_recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] tracking-[0.2em] uppercase font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Recomendado
                    </div>
                  )}
                  <div className="text-center mb-6">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-primary/80 font-semibold mb-2">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-5xl font-display tracking-tight text-foreground">
                        {plan.price_monthly === 0 ? '0' : Math.round(price)}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-xs text-muted-foreground">/mês</span>
                      )}
                    </div>
                    {cycle === 'yearly' && yearlyTotal > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">R$ {yearlyTotal}/ano</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-7 min-h-[180px]">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelect(plan)}
                    className={cn(
                      'w-full py-3.5 rounded-full font-semibold text-sm tracking-wide transition-opacity hover:opacity-90',
                      plan.is_recommended
                        ? 'bg-primary text-primary-foreground'
                        : plan.id === 'starter'
                          ? 'bg-white/5 text-foreground border border-white/10'
                          : 'bg-foreground text-background',
                    )}
                  >
                    {plan.id === 'starter' ? 'Começar grátis' : 'Testar 7 dias grátis'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Pagamentos seguros via 9Pay • Cancele a qualquer momento
        </footer>
      </div>
    </div>
  );
}
