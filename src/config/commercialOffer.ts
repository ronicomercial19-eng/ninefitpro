// One product, two billing periods. A click never confirms payment.
export const SUPPORT_EMAIL = '9fit.nine@gmail.com';
// Enable only after a verified payment creates the correct subscription.
export const CHECKOUT_READY = true;
export const OFFER_BENEFITS = [
  'Planejamento e execução dos treinos no app',
  'Registro de sessões, cargas e evolução',
  'Avaliação guiada e histórico das suas medidas',
  'Ajustes de treino conforme o contexto informado',
  'Suporte pelo app, com resposta por e-mail em até 24 horas',
];
export const COMMERCIAL_PLANS = [
  { id: 'basic', name: '9FIT PRO · Mensal', price: 'R$ 97,00', period: '/1 mês de acesso', link: 'https://checkout.infinitepay.io/ronynapoleao/2utdwtAthR' },
  { id: 'annual', name: '9FIT PRO · Anual', price: 'R$ 997,00', period: '/12 meses de acesso', link: 'https://checkout.infinitepay.io/ronynapoleao/y7bJTioTMm' },
] as const;
export const OFFER_SCOPE = 'Profissionais são contratados separadamente via Staff, conforme disponibilidade e condições de cada serviço. A assinatura não inclui consultas, acompanhamento individual humano ou atendimento de urgência.';

export type CommercialPlan = typeof COMMERCIAL_PLANS[number];
export function commercialPlanHref(plan: CommercialPlan) {
  return CHECKOUT_READY ? `/9fit/checkout/${plan.id}` : `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Interesse em ${plan.name} — ${plan.price}${plan.period}`)}`;
}

// Paywall visual: 3 benefícios curtos. A lista completa continua em OFFER_BENEFITS
// e aparece em "Ver tudo que está incluído".
export const PAYWALL_BENEFITS = [
  'Treinos planejados e executados no app',
  'Registro de cargas, sessões e evolução',
  'Avaliação guiada com histórico de medidas',
] as const;

const PLAN_MONTHS: Record<CommercialPlan['id'], number> = { basic: 1, annual: 12 };
const priceValue = (plan: CommercialPlan) => Number(plan.price.replace(/[^\d,]/g, '').replace(',', '.'));
const brl = (value: number) => `R$ ${Math.round(value).toLocaleString('pt-BR')}`;

/** Rótulos derivados do preço do plano: nada de valor duplicado à mão. */
export function planInsights(plan: CommercialPlan) {
  const months = PLAN_MONTHS[plan.id];
  const base = COMMERCIAL_PLANS.find(p => p.id === 'basic')!;
  const savings = priceValue(base) * months - priceValue(plan);
  return {
    shortName: months === 1 ? 'Mensal' : 'Anual',
    periodLabel: plan.period.replace(/^\//, ''),
    perMonth: months > 1 ? `${brl(priceValue(plan) / months)}/mês` : null,
    savings: savings > 0 ? `Economize ${brl(savings)}` : null,
  };
}
