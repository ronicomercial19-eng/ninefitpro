import { supabase } from '@/integrations/supabase/client';
import { businessDate } from './dailyContextRules';
import { withTimeout } from '@/lib/withTimeout';

export async function loadActivitySummary(athleteId: string) {
  const today = businessDate();
  const day = new Date(`${today}T12:00:00`);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  const monday = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
  const results = await withTimeout(Promise.all([
    supabase.from('workout_executions').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId).eq('status', 'completed').eq('completion_valid', true),
    supabase.from('workout_executions').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId).eq('status', 'completed').eq('completion_valid', true).gte('workout_date', monday).lte('workout_date', today),
    supabase.from('workout_executions').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId).eq('status', 'completed').eq('completion_valid', true).eq('workout_date', today),
    supabase.from('workout_executions').select('id,workout_date,status').eq('athlete_id', athleteId).eq('status', 'completed').eq('completion_valid', true).order('workout_date', { ascending: false }).limit(10),
  ]));
  results.forEach(result => { if (result.error) throw result.error; });
  return { total: results[0].count ?? 0, week: results[1].count ?? 0, today: results[2].count ?? 0, recent: results[3].data ?? [] };
}

export async function loadProgressScreen(athleteId: string) {
  const { data, error } = await withTimeout(supabase.rpc('fn_get_ron_progresso_screen', { p_athlete_id: athleteId }));
  if (error) throw error;
  return data;
}
