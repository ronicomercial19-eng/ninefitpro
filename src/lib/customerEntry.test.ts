import test from 'node:test';
import assert from 'node:assert/strict';
import { setupDestination, confirmedAccess, rememberEntry, readEntry, clearEntry } from './customerEntry';
const base = { roleHome: '/9fit/hub', firstAccessDone: false, googleIdentity: false, athleteId: 'athlete', activationDone: false, profileDone: false, intent: 'start' as const };
test('email novo e convite preservam primeiro acesso, Google não exige senha', () => {
  assert.equal(setupDestination(base), '/9fit/first-access');
  assert.equal(setupDestination({ ...base, googleIdentity: true }), '/9fit/ativacao');
});
test('pagamento não reinicia configuração concluída nem muda papéis', () => {
  assert.equal(setupDestination({ ...base, intent: 'payment_return', firstAccessDone: true }), '/9fit/ativacao');
  assert.equal(setupDestination({ ...base, firstAccessDone: true, profileDone: true }), '/9fit/os');
  assert.equal(setupDestination({ ...base, roleHome: '/app', intent: 'payment_return' }), '/app');
});
test('comprar antes de configurar e conta sem atleta não ficam em loop', () => {
  assert.equal(setupDestination({ ...base, intent: 'purchase' }), '/9fit/planos');
  assert.equal(setupDestination({ ...base, athleteId: null }), '/9fit/hub');
});
test('retorno não é confirmação; vencidos, inválidos e pendentes não dão acesso', () => {
  assert.equal(confirmedAccess(null), false);
  assert.equal(confirmedAccess({ status: 'paid' }), false);
  assert.equal(confirmedAccess({ status: 'active', expires_at: 'invalid' }), false);
  assert.equal(confirmedAccess({ status: 'active', expires_at: '2000-01-01' }), false);
  assert.equal(confirmedAccess({ status: 'active' }), true);
  assert.equal(confirmedAccess({ status: 'trialing', expires_at: '2099-01-01' }), true);
});
test('continuação é restrita, temporária, não guarda dados de pagamento e tolera storage fechado', () => {
  let value = ''; const store = { getItem: () => value, setItem: (_: string, v: string) => { value = v; }, removeItem: () => { value = ''; } };
  rememberEntry(store, 'payment_return', 100);
  assert.equal(readEntry(store, 200), 'payment_return');
  assert.equal(readEntry(store, 86400200), null);
  assert.equal(readEntry(store, 0), null);
  value = JSON.stringify({ intent: 'https://evil.test', at: 100 });
  assert.equal(readEntry(store, 200), null);
  clearEntry(store); assert.equal(readEntry(store), null);
  rememberEntry(undefined, 'start'); assert.equal(readEntry(undefined), null);
});
