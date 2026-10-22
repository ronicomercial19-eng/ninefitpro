// One product, two billing periods. A click never confirms payment.
export const SUPPORT_EMAIL = '9fit.nine@gmail.com';
// Enable only after a verified payment creates the correct subscription.
export const CHECKOUT_READY = false;
export const OFFER_BENEFITS = [
  'Planejamento e execução dos treinos no app',
  'Registro de sessões, cargas e evolução',
  'Avaliação guiada e histórico das suas medidas',
  'Ajustes de treino conforme o contexto informado',
  'Suporte pelo app, com resposta por e-mail em até 24 horas',
];
export const COMMERCIAL_PLANS = [
  { id: 'basic', name: '9FIT PRO · Mensal', price: 'R$ 97,00', period: '/mês', link: 'https://invoice.infinitepay.io/plans/ronynapoleao/kvfp4S0k42' },
  { id: 'annual', name: '9FIT PRO · Anual', price: 'R$ 997,00', period: '/ano', link: 'https://invoice.infinitepay.io/plans/ronynapoleao/TatHaBMsUX' },
] as const;
export const OFFER_SCOPE = 'Profissionais são contratados separadamente via Staff, conforme disponibilidade e condições de cada serviço. A assinatura não inclui consultas, acompanhamento individual humano ou atendimento de urgência.';
