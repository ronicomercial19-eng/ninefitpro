/** Metadata and exercise counts do not constitute an executable prescription. */
export function isExecutableTraining(training: {
  is_active?: boolean;
  prescription_issue?: unknown;
  training_type?: string | null;
  training_data?: { exercises?: unknown; prescription_issue?: unknown } | null;
} | null | undefined): boolean {
  if (!training || training.is_active === false || training.prescription_issue || training.training_data?.prescription_issue) return false;
  if (['html', 'link', 'periodization', 'pdf'].includes(training.training_type || '')) return false;
  const exercises = training.training_data?.exercises;
  return Array.isArray(exercises) && exercises.length > 0 && exercises.every(exercise => {
    if (!exercise || typeof exercise !== 'object') return false;
    const name = typeof exercise.name === 'string' ? exercise.name.trim() : '';
    const sets = Number(exercise.sets);
    const dose = exercise.reps ?? exercise.reps_range ?? exercise.duration_seconds;
    const validDose = typeof dose === 'number' ? Number.isFinite(dose) && dose > 0
      : typeof dose === 'string' && !!dose.trim() && !/^(?:0|[-–—]|null|undefined|n\/a)$/i.test(dose.trim()) && !/^-\d/.test(dose.trim());
    return Boolean(name && ['number', 'string'].includes(typeof exercise.sets) && Number.isInteger(sets) && sets > 0 && validDose);
  });
}
