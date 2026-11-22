import test from 'node:test';
import assert from 'node:assert/strict';
import { studentEvidence, effortFeedback } from '../studentGuidance';
import type { DailyContext } from '../../services/dailyContextRules';

const context = { date: '2026-11-22', calibration: { complete: false }, today: { workout_completed: false, workout_in_progress: false, rest_day: false, meals: 0, water_ml: 0 } } as DailyContext;
test('missing or previous-day data cannot become current guidance evidence', () => {
  assert.deepEqual(studentEvidence(null, context.date), []);
  assert.deepEqual(studentEvidence(context, '2026-11-23'), []);
});
test('evidence distinguishes pending check-in, started session and declared rest', () => {
  assert.equal(studentEvidence(context, context.date)[0].value, 'Check-in pendente');
  assert.equal(studentEvidence({ ...context, today: { ...context.today, workout_in_progress: true } }, context.date)[1].value, 'Treino em andamento');
  assert.equal(studentEvidence({ ...context, today: { ...context.today, rest_day: true } }, context.date)[1].value, 'Descanso registrado');
});
test('habit quantities are evidence, not nutrition approval or prescription changes', () => {
  const result = studentEvidence({ ...context, today: { ...context.today, meals: 2, water_ml: 750 } }, context.date)[2];
  assert.equal(result.value, '2 refeições · 750 ml de água');
  assert.match(result.use, /não comprova/);
  assert.match(result.use, /nem altera/);
});
test('effort descriptions do not reward high intensity or prescribe an increase', () => {
  assert.match(effortFeedback(2), /leve/);
  assert.match(effortFeedback(6), /moderado/);
  assert.match(effortFeedback(9), /alto/);
  for (const score of [1, 5, 10]) assert.doesNotMatch(effortFeedback(score), /aument|melhor|superou/i);
});
