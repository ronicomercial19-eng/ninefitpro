import type { DailyContext } from '../services/dailyContextRules';

const record = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Used by both RPC readers before data enters the shared query cache. */
export function parseDailyContext(value: unknown): DailyContext {
  if (!record(value) || ![2, 3].includes(value.version) || value.status !== 'available') throw new Error('Contexto do aluno indisponível. Tente novamente.');
  const { profile, calibration, safety, today, sync } = value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.date) || !record(profile) || !record(profile.declared) || !record(profile.preferences) || !record(profile.observed) || !record(profile.inferred)
    || typeof profile.complete !== 'boolean' || !record(calibration) || typeof calibration.complete !== 'boolean'
    || !record(safety) || typeof safety.review_required !== 'boolean' || !record(today) || !record(sync)
    || !['workout_completed', 'workout_in_progress', 'workout_scheduled', 'rest_day'].every(key => typeof today[key] === 'boolean')
    || !['active_days_30d', 'completed_workouts_30d', 'nutrition_days_30d', 'hydration_days_30d', 'review_days_30d'].every(key => count(profile.observed[key]))
    || !Array.isArray(profile.observed.training_windows) || !count(today.meals) || !count(today.water_ml) || !count(value.streak)
    || !record(sync.coverage_dimensions) || (sync.value !== null && (!count(sync.value) || sync.value > 100))) {
    throw new Error('A ficha retornou dados incompletos. Atualize e tente novamente.');
  }
  return value as DailyContext;
}
