import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowLeft, Shield, ChevronDown, Star, Zap, Crown } from 'lucide-react';
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

// Outcome-driven copy overrides (em vez de "AI Coach v9" → "Treinos que evoluem com você").
const OUTCOME_FEATURES: Record<string, { tagline: string; bullets: string[]; accent: string; Icon: any }> = {
  starter: {
    tagline: 'Comece sem fricção. Sinta o sistema.',
    bullets: [
      'Avaliação inicial guiada',
      'Treinos base para começar hoje',
      'Hub diário com seu progresso',
      'RON em modo introdutório',
    ],
    accent: 'hsl(220 9% 65%)',
    Icon: Star,
  },
  pro: {
    tagline: 'Para quem leva o corpo a sério.',
    bullets: [
      'Periodização que evolui com você',
      'Avaliações 360 + leitura de progresso',
      'RON adaptativo (Power/Low/Balanced)',
      'Protocolos de recuperação e nutrição',
      'Smartwatch básico',
    ],
    accent: 'hsl(190 95% 50%)',
    Icon: Zap,
  },
  prime: {
    tagline: 'Performance + longevidade em outro patamar.',
    bullets: [
      'Tudo do PRO incluso',
      'RON v9 completo com memória de longo prazo',
      'Protocolos premium (biohacking, sono profundo)',
      'Comunidade fechada + eventos exclusivos',
      'Smartwatch full + concierge humano',
      'Prioridade absoluta no suporte',
    ],
    accent: 'hsl(38 95% 60%)',
    Icon: Crown,
  },
};

const FAQ = [
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Cancele em 1 clique direto pelo app. Sem multa, sem fidelidade, sem ligação.' },
  { q: 'Como funciona o teste grátis?', a: 'Você tem 7 dias completos para usar todas as features do plano escolhido. Se cancelar dentro do período, não é cobrado nada.' },
  { q: 'Posso trocar de plano depois?', a: 'Pode subir ou descer de plano a qualquer momento. A cobrança é ajustada proporcionalmente.' },
  { q: 'Quais formas de pagamento aceitam?', a: 'Cartão de crédito, PIX e boleto (anual). Pagamentos processados com segurança via 9Pay.' },
  { q: 'Preciso de equipamentos?', a: 'Não. O sistema adapta os planos para academia, casa ou ar livre. Você escolhe.' },
];

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
    navigate('/9fit/primepass?plan=' + encodeURIComponent(plan.id) + '&cycle=' + cycle);
  };

  // QA Fase F (16/09): o toggle de ciclo mostrava "ECONOMIZE 25%" fixo pra
  // qualquer plano, mas o desconto real do anual varia por plano (~24% no
  // PRO, ~17% no PRIME hoje). Calculado a partir do plano com maior desconto
  // real em vez de um número fixo que nem sempre bate.
  const maxYearlyDiscountPct = plans.length
    ? Math.max(
        0,
        ...plans
          .filter((p) => p.price_monthly > 0)
          .map((p) => Math.round(100 - (p.price_yearly / (p.price_monthly * 12)) * 100)),
      )
    : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient halo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/[0.08] rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-amber-500/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-5 py-8 pb-28">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground text-xs tracking-[0.2em] uppercase flex items-center gap-2 mb-8 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        <header className="text-center mb-10">
          <p className="text-[10px] tracking-[0.4em] uppercase text-primary/80 font-semibold mb-3">
            9FIT PRO • Planos
          </p>
          <h1 className="text-4xl md:text-6xl font-display tracking-tight text-foreground mb-4 leading-[1.02]">
            Escolha o nível da<br />sua próxima versão.
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Resultados reais, mensuráveis e adaptados ao seu corpo. Cancele em 1 clique, sem fidelidade.
          </p>
        </header>

        {/* Cycle toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-card/40 border border-white/[0.06] rounded-full p-1 backdrop-blur-xl">
            <button
              onClick={() => setCycle('monthly')}
              className={cn(
                'px-6 py-2.5 rounded-full text-xs tracking-[0.2em] uppercase font-semibold transition-all',
                cycle === 'monthly' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={cn(
                'px-6 py-2.5 rounded-full text-xs tracking-[0.2em] uppercase font-semibold transition-all relative flex items-center gap-2',
                cycle === 'yearly' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Anual
              {maxYearlyDiscountPct > 0 && (
                <span className="text-[9px] bg-green-500/25 text-green-300 px-2 py-0.5 rounded-full font-bold">
                  ECONOMIZE ATÉ {maxYearlyDiscountPct}%
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground text-sm">Carregando planos...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mb-16">
            {plans.map((plan, idx) => {
              const meta = OUTCOME_FEATURES[plan.id] || OUTCOME_FEATURES.pro;
              const Icon = meta.Icon;
              const monthlyPrice = plan.price_monthly;
              const yearlyMonthly = plan.price_yearly / 12;
              const price = cycle === 'monthly' ? monthlyPrice : yearlyMonthly;
              const savings = cycle === 'yearly' && monthlyPrice > 0
                ? Math.round((monthlyPrice * 12 - plan.price_yearly))
                : 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={cn(
                    'relative rounded-3xl p-7 backdrop-blur-xl transition-all flex flex-col',
                    plan.is_recommended
                      ? 'bg-gradient-to-b from-primary/[0.12] via-card/60 to-card/40 border-2 border-primary/40 shadow-[0_30px_100px_-24px_hsl(var(--primary)/0.45)] md:-translate-y-3 md:scale-[1.02]'
                      : 'bg-card/40 border border-white/[0.07] hover:border-white/15',
                  )}
                  style={plan.is_recommended ? { '--ring': meta.accent } as any : {}}
                >
                  {plan.is_recommended && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-[10px] tracking-[0.25em] uppercase font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                      <Sparkles className="w-3 h-3" /> Recomendado
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: meta.accent + '18', border: `1px solid ${meta.accent}30` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: meta.accent }} />
                      </div>
                      <p className="text-[10px] tracking-[0.3em] uppercase font-bold" style={{ color: meta.accent }}>
                        {plan.name}
                      </p>
                    </div>
                    <p className="text-[13px] text-foreground/90 leading-snug mb-5">{meta.tagline}</p>

                    <div className="flex items-baseline gap-1">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <span className="text-5xl font-display tracking-tight text-foreground tabular-nums">
                        {monthlyPrice === 0 ? '0' : Math.round(price)}
                      </span>
                      {monthlyPrice > 0 && (
                        <span className="text-xs text-muted-foreground">/mês</span>
                      )}
                    </div>
                    {cycle === 'yearly' && monthlyPrice > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        R$ {plan.price_yearly}/ano · você economiza R$ {savings}
                      </p>
                    )}
                    {monthlyPrice === 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">Para sempre. Sem cartão.</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-7 flex-1">
                    {meta.bullets.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] text-foreground/90 leading-snug">
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: meta.accent }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelect(plan)}
                    className={cn(
                      'w-full py-3.5 rounded-full font-bold text-sm tracking-wide transition-all',
                      plan.is_recommended
                        ? 'bg-primary text-primary-foreground hover:opacity-95 shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.5)]'
                        : plan.id === 'starter'
                          ? 'bg-white/5 text-foreground border border-white/10 hover:bg-white/10'
                          : 'bg-foreground text-background hover:opacity-90',
                    )}
                  >
                    {plan.id === 'starter' ? 'Começar grátis agora' : 'Testar 7 dias grátis'}
                  </button>
                  {monthlyPrice > 0 && (
                    <p className="text-center text-[10px] text-muted-foreground mt-2">
                      Sem cobrança nos primeiros 7 dias
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* FAQ */}
        <section className="mb-16 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-semibold mb-2">
              FAQ
            </p>
            <h2 className="text-2xl md:text-3xl font-display tracking-tight text-foreground">
              Perguntas frequentes
            </h2>
          </div>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.06] bg-card/30 backdrop-blur-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
                >
                  <span className="text-sm font-semibold text-foreground">{item.q}</span>
                  <ChevronDown
                    className={cn('w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-3', openFaq === i && 'rotate-180')}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </motion.div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Pagamentos seguros via 9Pay • Cancele a qualquer momento • Sem fidelidade
        </footer>
      </div>
    </div>
  );
}
