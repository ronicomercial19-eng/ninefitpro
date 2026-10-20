import { loadAssessmentHub } from './assessmentHubService';
import { businessDate } from './dailyContextRules';

export async function loadActivitySummary(athleteId: string) {
  const today = businessDate();
  const day = new Date(`${today}T12:00:00`);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  const monday = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const hub = await loadAssessmentHub(athleteId);
  const workouts = hub.workouts.filter(w => w.source === 'FitPro');
  return { total: workouts.length, week: workouts.filter(w => w.date >= monday && w.date <= today).length, today: workouts.filter(w => w.date === today).length, recent: [...workouts].reverse().slice(0,10).map(w => ({ id:w.id.replace('fitpro:',''), workout_date:w.date, status:'completed' })) };
}

export async function loadProgressScreen(athleteId: string) {
  const hub = await loadAssessmentHub(athleteId);
  return hub.legacy_screen;
}
