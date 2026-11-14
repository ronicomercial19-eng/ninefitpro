export const CHECKOUT_PRODUCTS = {
  basic: { product: 'ninefitpro', amountCents: 9700, months: 1, name: 'NINE PRO · Mensal', returnPath: '/9fit/pagamento/retorno' },
  annual: { product: 'ninefitpro', amountCents: 99700, months: 12, name: 'NINE PRO · Anual', returnPath: '/9fit/pagamento/retorno' },
  core_monthly: { product: 'ninecore', amountCents: 11900, months: 1, name: 'NINE CORE · Mensal', returnPath: '/app/pagamento/retorno' },
  core_quarterly: { product: 'ninecore', amountCents: 29709, months: 3, name: 'NINE CORE · Trimestral', returnPath: '/app/pagamento/retorno' },
} as const;
export type CheckoutPeriod = keyof typeof CHECKOUT_PRODUCTS;
export function checkoutProduct(period: unknown) {
  return typeof period === 'string' && Object.hasOwn(CHECKOUT_PRODUCTS, period)
    ? CHECKOUT_PRODUCTS[period as CheckoutPeriod] : null;
}