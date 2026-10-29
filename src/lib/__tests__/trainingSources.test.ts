import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activeTrainingOnDate, resolveTrainingSources } from '../trainingSources';

test('a template outage preserves valid daily and assigned workouts with an explicit warning', async () => {
  const result = await resolveTrainingSources(
    Promise.resolve({ data: [{ id: 'assigned' }], error: null }),
    Promise.resolve({ data: [{ id: 'daily' }], error: null }),
    Promise.reject(new Error('templates offline')),
  );
  assert.equal(result.daily[0].id, 'daily');
  assert.equal(result.assignments[0].id, 'assigned');
  assert.equal(result.templatesUnavailable, true);
});

test('failed authoritative reads cannot be represented as an empty successful workout list', async () => {
  await assert.rejects(resolveTrainingSources(
    Promise.resolve({ data: null, error: new Error('assignment denied') }),
    Promise.resolve({ data: [], error: null }), Promise.resolve([]),
  ), /assignment denied/);
});

test('undated assignments remain available and scheduled/expired assignments respect the business date', () => {
  const today = '2026-10-29';
  assert.equal(activeTrainingOnDate({ start_date: null }, today), true);
  assert.equal(activeTrainingOnDate({ start_date: '2026-10-30' }, today), false);
  assert.equal(activeTrainingOnDate({ end_date: '2026-10-28' }, today), false);
  assert.equal(activeTrainingOnDate({ start_date: today, end_date: today }, today), true);
});
