import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTIVATION_PROFILE_KEYS, hasConfirmedProfile } from '../activationProfile';
import { setupDestination } from '../customerEntry';

test('timestamp alone or old five-answer ficha cannot bypass full profile confirmation', () => {
  assert.equal(hasConfirmedProfile(null), false);
  assert.equal(hasConfirmedProfile({ pdi_completed_at: '2026-10-28T00:00:00Z' }), false);
  assert.equal(hasConfirmedProfile({ pdi_completed_at: '2026-10-28T00:00:00Z', declared_keys: ['goal', 'peak_window', 'time_horizon', 'injury_zones', 'dietary_restrictions'] }), false);
});
test('post-payment entry completes the profile even when legacy workout activation finished', () => {
  const state = { roleHome: '/9fit/hub', athleteId: 'existing-athlete', firstAccessDone: true, googleIdentity: false, activationDone: true, profileDone: false, intent: 'payment_return' as const };
  assert.equal(setupDestination(state), '/9fit/ativacao');
  assert.equal(setupDestination({ ...state, profileDone: true }), '/9fit/os');
  assert.equal(setupDestination({ ...state, intent: 'start' }), '/9fit/os');
});
test('persisted answers still require final confirmation; complete profile can enter app', () => {
  assert.equal(hasConfirmedProfile({ declared_keys: [...ACTIVATION_PROFILE_KEYS] }), false);
  assert.equal(hasConfirmedProfile({ pdi_completed_at: '2026-10-28T00:00:00Z', declared_keys: [...ACTIVATION_PROFILE_KEYS] }), true);
});
