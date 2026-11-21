const key = '9fit:professional-payment-return';
export const PROFESSIONAL_PAYMENT_RETURN = '/app/pagamento/retorno';

export function rememberProfessionalReturn() {
  try { sessionStorage.setItem(key, String(Date.now())); } catch { /* Optional storage. */ }
}

export function postLoginDestination(destination: string, now = Date.now()) {
  try {
    const timestamp = Number(sessionStorage.getItem(key));
    if (!timestamp) return destination;
    sessionStorage.removeItem(key);
    return destination === '/app' && timestamp <= now && now - timestamp < 4 * 3600000
      ? PROFESSIONAL_PAYMENT_RETURN : destination;
  } catch { return destination; }
}
