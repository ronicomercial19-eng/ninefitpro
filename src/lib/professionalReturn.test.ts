import test from 'node:test';
import assert from 'node:assert/strict';
import { postLoginDestination, PROFESSIONAL_PAYMENT_RETURN } from './professionalReturn';

test('only a professional account resumes a recent payment check', () => {
  const original = globalThis.sessionStorage;
  let saved: string | null = '100';
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: () => saved,
    removeItem: () => { saved = null; },
  } });
  try {
    assert.equal(postLoginDestination('/app', 200), PROFESSIONAL_PAYMENT_RETURN);
    assert.equal(postLoginDestination('/app', 200), '/app');
    saved = '100';
    assert.equal(postLoginDestination('/9fit/hub', 200), '/9fit/hub');
    saved = '100';
    assert.equal(postLoginDestination('/app', 4 * 3600000 + 200), '/app');
  } finally {
    if (original === undefined) Reflect.deleteProperty(globalThis, 'sessionStorage');
    else Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: original });
  }
});
