import assert from 'node:assert/strict';
import { assertDeliveryTransition, type LoopDelivery } from '../src/types/fitproLoop';
const delivery: LoopDelivery = {
  request: { schemaVersion: 1, loop: 'ron_task', athleteId: 'athlete-1', actor: { kind: 'ron', userId: 'user-1' }, idempotencyKey: 'request-1', origin: 'chat', requestedAt: '2026-10-05T18:00:00Z' },
  reference: { id: 'delivery-1', module: 'planning', revision: 2 }, state: 'approved', requiresApproval: true, approvedRevision: 1, confirmation: null, failure: null,
};
assert.throws(() => assertDeliveryTransition(delivery, 'executing'), /current_revision_approval_required/);
assert.doesNotThrow(() => assertDeliveryTransition({ ...delivery, approvedRevision: 2 }, 'executing'));
assert.throws(() => assertDeliveryTransition({ ...delivery, state: 'preparing' }, 'confirmed'), /invalid_loop_transition/);
assert.throws(() => assertDeliveryTransition({ ...delivery, state: 'executing' }, 'confirmed'), /backend_confirmation_required/);
assert.doesNotThrow(() => assertDeliveryTransition({ ...delivery, state: 'executing', confirmation: { entityId: 'calendar-1', confirmedAt: '2026-10-05T18:01:00Z' } }, 'confirmed'));
assert.throws(() => assertDeliveryTransition({ ...delivery, state: 'cancelled' }, 'executing'), /invalid_loop_transition/);
assert.throws(() => assertDeliveryTransition({ ...delivery, state: 'blocked' }, 'executing'), /invalid_loop_transition/);
assert.doesNotThrow(() => assertDeliveryTransition({ ...delivery, state: 'blocked' }, 'preparing'));
console.log('Loop contract passed: stale approvals, confirmation evidence, cancellation and blocked/review transitions.');

// Missing server configuration must never make a missing header authenticate.
import { webhookSecretFailure } from '../src/services/infinitepayWebhookPolicy';
assert.equal(webhookSecretFailure(undefined, undefined), 503);
assert.equal(webhookSecretFailure(' ', ' '), 503);
assert.equal(webhookSecretFailure('secret', undefined), 403);
assert.equal(webhookSecretFailure('secret', ['secret']), 403);
assert.equal(webhookSecretFailure('secret', 'wrong'), 403);
assert.equal(webhookSecretFailure('secret', 'secret'), null);
console.log('Webhook auth passed: missing configuration, absent/ambiguous/invalid headers and valid secret.');
