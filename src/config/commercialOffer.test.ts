import test from 'node:test';
import assert from 'node:assert/strict';
import { COMMERCIAL_PLANS, OFFER_BENEFITS, OFFER_SCOPE, SUPPORT_EMAIL } from './commercialOffer';
import { readFileSync } from 'node:fs';

test('um produto, dois períodos, links existentes e suporte definido', () => {
  assert.equal(COMMERCIAL_PLANS.length, 2);
  assert.deepEqual(COMMERCIAL_PLANS.map(p => p.price), ['R$ 97,00', 'R$ 997,00']);
  for (const plan of COMMERCIAL_PLANS) assert.equal(new URL(plan.link).hostname, 'invoice.infinitepay.io');
  assert.equal(SUPPORT_EMAIL, '9fit.nine@gmail.com');
  assert.ok(OFFER_BENEFITS.some(b => b.includes('24 horas')));
  assert.match(OFFER_SCOPE, /separadamente via Staff/);
});
test('oferta não inicia teste fictício nem mantém catálogo divergente', () => {
  const modal = readFileSync('src/components/9fit/ContextualPaywall.tsx', 'utf8');
  const page = readFileSync('src/pages/9fit/PrimePass.tsx', 'utf8');
  for (const text of [modal, page]) {
    assert.match(text, /COMMERCIAL_PLANS/);
    assert.doesNotMatch(text, /start_trial|7 dias grátis|149|Bio-Scan|concierge 1:1/i);
  }
});
test('suporte exige autenticação e não declara e-mail enviado sem confirmação', () => {
  const handler = readFileSync('supabase/functions/fitpro-support/index.ts', 'utf8');
  assert.match(handler, /auth.getUser/);
  assert.match(handler, /emailSent = response.ok/);
  assert.match(handler, /email_sent: emailSent/);
  assert.match(handler, /SUPPORT_FROM_EMAIL/);
});
