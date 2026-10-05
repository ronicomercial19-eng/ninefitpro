import assert from 'node:assert/strict';
import { businessDate, dayProgress, selectDayCommand, type DailyContext } from '../src/services/dailyContextRules';

const base: DailyContext = {
  version: 2, status: 'available', date: '2026-10-05', generated_at: '',
  profile: { complete: true, completed_at: '', declared: {}, preferences: {}, observed: { active_days_30d: 0, completed_workouts_30d: 0, training_windows: [] }, inferred: { training_window: null, source: '', requires_confirmation: true } },
  calibration: { complete: true, sleep: 5, energy: 5, mood: 5, motivation: 5, pain: 1, pain_location: null, observed_at: '' },
  safety: { review_required: false, reason: null, is_medical_clearance: false },
  today: { workout_completed: false, workout_in_progress: false, workout_scheduled: true, rest_day: false, meals: 0, water_ml: 0, review: null },
  sync: { value: 100, readiness: 100, record_coverage: 100, coverage_dimensions: {}, formula: '', source: '', is_medical_clearance: false }, streak: 0,
};
function scenario(patch: Partial<DailyContext> = {}): DailyContext { return structuredClone({ ...base, ...patch }); }
assert.equal(businessDate(new Date('2026-10-06T02:59:59Z')), '2026-10-05');
assert.equal(businessDate(new Date('2026-10-06T03:00:00Z')), '2026-10-06');
assert.equal(selectDayCommand(scenario({ calibration: { ...base.calibration, complete: false } })).key, 'calibration');
assert.equal(selectDayCommand(scenario({ profile: { ...base.profile, complete: false } })).key, 'profile');
assert.equal(selectDayCommand(scenario({ safety: { ...base.safety, review_required: true } })).key, 'safety', '100 SYNC cannot override pain');
assert.equal(selectDayCommand(base).key, 'training', 'Weekly completion cannot replace today');
assert.equal(selectDayCommand(scenario({ today: { ...base.today, workout_in_progress: true } })).label, 'Retomar treino');
assert.equal(selectDayCommand(scenario({ today: { ...base.today, workout_completed: true } })).key, 'nutrition');
assert.equal(selectDayCommand(scenario({ today: { ...base.today, rest_day: true } })).key, 'nutrition');
assert.equal(selectDayCommand(scenario({ safety: { ...base.safety, review_required: true }, today: { ...base.today, rest_day: true } })).key, 'nutrition', 'Rest avoids prescribing activity; it does not certify medical clearance');
const recorded = { ...base.today, rest_day: true, meals: 1 };
assert.equal(selectDayCommand(scenario({ today: recorded })).key, 'hydration');
assert.equal(selectDayCommand(scenario({ today: { ...recorded, water_ml: 250 } })).key, 'review');
const completed = scenario({ today: { ...recorded, water_ml: 250, review: 1 } });
assert.equal(selectDayCommand(completed).key, 'complete', 'A poor day review still closes the day');
assert.deepEqual(dayProgress(completed), { completed: 6, total: 6 });
assert.equal(dayProgress(base).completed, 2);
console.log('PASS Macro 02: business date, calibration, profile, safety, resume, rest, nutrition, hydration, review and closure');
