import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIVATION_PROFILE_KEYS, hasConfirmedProfile } from '../activationProfile';

test('timestamp alone or old five-answer ficha cannot bypass full profile confirmation', () => {
  assert.equal(hasConfirmedProfile(null), false);
  assert.equal(hasConfirmedProfile({ pdi_completed_at: '2026-10-28T00:00:00Z' }), false);
  assert.equal(hasConfirmedProfile({ pdi_completed_at: '2026-10-28T00:00:00Z', declared_keys: ['goal', 'peak_window', 'time_horizon', 'injury_zones', 'dietary_restrictions'] }), false);
});
test('persisted answers still require final confirmation; complete profile can enter app', () => {
  assert.equal(hasConfirmedProfile({ declared_keys: [...ACTIVATION_PROFILE_KEYS] }), false);
  assert.equal(hasConfirmedProfile({ pdi_completed_at: '2026-10-28T00:00:00Z', declared_keys: [...ACTIVATION_PROFILE_KEYS] }), true);
});
