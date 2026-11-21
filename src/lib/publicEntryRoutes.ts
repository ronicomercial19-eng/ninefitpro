const exact = new Set(['/', '/treinar', '/auth', '/auth/callback', '/login', '/register', '/forgot-password', '/9fit/login', '/9fit', '/9fit/onboarding', '/9fit/first-access', '/sales', '/suporte', '/whatsapp-redirect', '/assessment', '/app/pagamento/retorno', '/9fit/entrada', '/9fit/pagamento/retorno']);

/** A guest can view these pages; individual actions still check the account. */
export function isPublicEntryRoute(path: string) {
  return exact.has(path) || path.startsWith('/9fit/checkout/');
}
