export interface PaymentReference { order_nsu: string; transaction_nsu?: string; slug?: string }
const key = '9fit:payment-return:v1';
const identifier = (value: string | null) => value != null && /^[A-Za-z0-9_-]{1,160}$/.test(value);
export function parsePaymentReturn(search: string): PaymentReference | null {
  const params = new URLSearchParams(search);
  for (const name of ['order_nsu', 'transaction_nsu', 'slug']) if (params.getAll(name).length > 1) return null;
  const order = params.get('order_nsu');
  if (!identifier(order)) return null;
  const transaction = params.get('transaction_nsu'), slug = params.get('slug');
  if ((transaction && !identifier(transaction)) || (slug && !identifier(slug))) return null;
  return { order_nsu: order!, ...(transaction ? { transaction_nsu: transaction } : {}), ...(slug ? { slug } : {}) };
}
export function pendingPayment(): PaymentReference | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!saved || typeof saved.at !== 'number' || Date.now() - saved.at > 4*3600000 || saved.at > Date.now()) return null;
    return parsePaymentReturn(new URLSearchParams(saved.reference).toString());
  } catch { return null; }
}
export function rememberPayment(reference: PaymentReference) {
  try { sessionStorage.setItem(key, JSON.stringify({ reference, at: Date.now() })); } catch { /* The URL remains usable. */ }
}
export function clearPayment() { try { sessionStorage.removeItem(key); } catch { /* Optional storage. */ } }
