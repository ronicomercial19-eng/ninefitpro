export const CUSTOMER_ENTRY = '/9fit/entrada';
export const PAYMENT_RETURN = '/9fit/pagamento/retorno';
const KEY = '9fit:entry-intent:v1';
export type EntryIntent = 'start' | 'payment_return' | 'purchase';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function rememberEntry(store: Store | undefined, intent: EntryIntent, now = Date.now()) {
  try { store?.setItem(KEY, JSON.stringify({ intent, at: now })); } catch { /* Optional browser storage. */ }
}
export function readEntry(store: Store | undefined, now = Date.now()): EntryIntent | null {
  try {
    const value = JSON.parse(store?.getItem(KEY) || 'null');
    if (!value || !['start','payment_return','purchase'].includes(value.intent) || typeof value.at !== 'number' || value.at > now || now - value.at > 86400000) return null;
    return value.intent;
  } catch { return null; }
}
export function clearEntry(store?: Store) { try { store?.removeItem(KEY); } catch { /* Optional. */ } }
export function entryStorage(): Store | undefined { try { return localStorage; } catch { return undefined; } }
export interface EntryState { roleHome: string; firstAccessDone: boolean; googleIdentity: boolean; athleteId: string | null; activationDone: boolean; profileDone: boolean; intent: EntryIntent; }
// Routing only: payment status/query params never confer entitlement.
export function setupDestination(state: EntryState) {
  if (state.roleHome === '/app') return '/app';
  if (state.intent === 'purchase') return '/9fit/planos';
  if (!state.athleteId) return '/9fit/hub';
  if (!state.firstAccessDone && !state.googleIdentity) return '/9fit/first-access';
  if (state.intent === 'payment_return' && !state.profileDone) return '/9fit/ativacao';
  return state.activationDone || state.profileDone ? '/9fit/os' : '/9fit/ativacao';
}
export function confirmedAccess(subscription: { status?: string; expires_at?: string | null } | null, now = Date.now()) {
  if (!subscription || !['active','trialing'].includes(subscription.status || '')) return false;
  if (subscription.expires_at == null) return true;
  const expires = Date.parse(subscription.expires_at);
  return Number.isFinite(expires) && expires > now;
}
