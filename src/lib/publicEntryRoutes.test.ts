import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicEntryRoute } from './publicEntryRoutes';

test('visitors can reach both offers and payment returns before logging in', () => {
  for (const path of ['/treinar', '/sales', '/9fit/checkout/basic', '/9fit/checkout/annual', '/app/pagamento/retorno', '/9fit/pagamento/retorno']) {
    assert.equal(isPublicEntryRoute(path), true, path);
  }
});

test('student and professor workspaces still require a session', () => {
  for (const path of ['/app', '/app/alunos', '/app/assinatura', '/9fit/train', '/9fit/os']) {
    assert.equal(isPublicEntryRoute(path), false, path);
  }
});
