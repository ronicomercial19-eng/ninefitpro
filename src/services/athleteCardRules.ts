export function positiveGoal(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
export function dietGoals(data: Record<string, unknown> = {}) {
  return {
    calories: positiveGoal(data.calories_goal ?? data.daily_calories),
    protein: positiveGoal(data.protein_goal ?? data.daily_protein),
    water: positiveGoal(data.water_goal_ml ?? data.hydration_goal_ml),
  };
}
export function serviceCreditBalance(row: {total_credits: number; used_credits: number; expires_at?: string | null} | null, today: string): number {
  if (!row || row.expires_at && row.expires_at < today) return 0;
  return Math.max(0, row.total_credits - row.used_credits);
}
export function isPreviousPrescription(row: {is_active: boolean; start_date: string; end_date?: string | null}, today: string) {
  return row.start_date <= today && (!row.is_active || !!row.end_date && row.end_date < today);
}
export function weeklyAdherence(days: Array<{date:string;status:string;exerciseCount:number}>,today:string):number|null{
  const due=days.filter(d=>d.date<=today&&d.status!=='rest'&&d.exerciseCount>0);
  return due.length?Math.round(due.filter(d=>d.status==='completed').length/due.length*100):null;
}
export function comparableLoadProgress(sets: Array<{exercise_name: string; actual_weight: number | null; actual_reps: number | null; completed: boolean; workout_executions: {workout_date: string; status: string}}>) {
  const groups = new Map<string, Map<string, {weight:number; reps:number}>>();
  for (const set of sets) {
    if (!set.completed || set.workout_executions.status !== 'completed' || set.actual_weight === null || !set.actual_reps || set.actual_weight <= 0) continue;
    const days = groups.get(set.exercise_name) ?? new Map();
    const key = `${set.workout_executions.workout_date}:${set.actual_reps}`;
    const previous = days.get(key);
    if (!previous || previous.weight < set.actual_weight) days.set(key, {weight:set.actual_weight,reps:set.actual_reps});
    groups.set(set.exercise_name, days);
  }
  for (const [exercise, days] of groups) {
    const entries = [...days.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
    for (const [key,latest] of entries) {
      if(key.slice(0,10)!==entries[0][0].slice(0,10))continue;
      const earlier = entries.find(([other,value])=>other.slice(0,10)<key.slice(0,10) && value.reps===latest.reps);
      if (earlier && latest.weight > earlier[1].weight) return {exercise,latest:latest.weight,previous:earlier[1].weight,reps:latest.reps,date:key.slice(0,10),previousDate:earlier[0].slice(0,10)};
    }
  }
  return null;
}
