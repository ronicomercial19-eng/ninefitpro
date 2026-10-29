export interface TrainingRead<T> { data: T[] | null; error: unknown; }

/** Optional templates may fail without hiding valid daily/assigned workouts. */
export async function resolveTrainingSources<A, D, T>(
  assignments: PromiseLike<TrainingRead<A>>,
  daily: PromiseLike<TrainingRead<D>>,
  templates: PromiseLike<T[]>,
) {
  const [a, d, t] = await Promise.allSettled([assignments, daily, templates]);
  if (a.status === 'rejected') throw a.reason;
  if (d.status === 'rejected') throw d.reason;
  if (a.value.error) throw a.value.error;
  if (d.value.error) throw d.value.error;
  return {
    assignments: a.value.data || [],
    daily: d.value.data || [],
    templates: t.status === 'fulfilled' ? t.value : [],
    templatesUnavailable: t.status === 'rejected',
  };
}

export function activeTrainingOnDate(training: { start_date?: string | null; end_date?: string | null }, today: string) {
  return (!training.start_date || training.start_date <= today) && (!training.end_date || training.end_date >= today);
}
