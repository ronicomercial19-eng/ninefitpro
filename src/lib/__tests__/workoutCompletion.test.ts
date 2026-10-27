import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionLabel, completionReason } from '../workoutCompletion';

test('only an explicit database validation is described as a valid completion', () => {
  assert.equal(completionLabel({ completion_valid: true }), 'Conclusão válida');
  for (const completion_valid of [false, null, undefined]) {
    assert.equal(completionLabel({ completion_valid }), 'Registro não contabilizado');
    assert.ok(completionReason({ completion_valid }));
  }
  assert.equal(completionReason({ completion_valid: true, completion_validation_reason: 'no_completed_set' }), null);
});

test('historical invalid sessions keep their reason without inventing missing evidence', () => {
  assert.match(completionReason({ completion_valid: false, completion_validation_reason: 'no_completed_set' })!, /Sem série/);
  assert.match(completionReason({ completion_valid: false, completion_validation_reason: 'duration_under_5_minutes' })!, /cinco minutos/);
  assert.match(completionReason({ completion_valid: false, completion_validation_reason: 'future_reason' })!, /Não há confirmação/);
});
