import { supabase } from '@/integrations/supabase/client';

// Shared database contract for Progress Tracker and FitPro. The same file is kept
// in both repositories because the products ship independently.
export interface HistoryAssessment {
  id: string;
  data_avaliacao: string;
  origem: string | null;
  peso: number | null;
  gordura_corporal: number | null;
  massa_muscular: number | null;
  circunferencia_cintura: number | null;
  rm1_empurrar_superior: number | null;
  rm1_empurrar_perna: number | null;
  rm1_puxar_costas: number | null;
  score_global: number | null;
}

export interface HistoryWorkout {
  id: string;
  date: string;
  name: string;
  volumeKg: number | null;
  rpe: number | null;
  source: 'FitPro' | 'Progress Tracker';
}

export interface HistoryLoad {
  id: string;
  date: string;
  exercise: string;
  kg: number;
  reps: number | null;
  source: 'FitPro' | 'Progress Tracker';
}

export interface HistoryPR {
  id: string;
  date: string;
  exercise: string;
  value: number;
  unit: string;
}

export interface ProgressHistory {
  assessments: HistoryAssessment[];
  workouts: HistoryWorkout[];
  loads: HistoryLoad[];
  records: HistoryPR[];
}

const assessmentColumns = 'id,data_avaliacao,origem,peso,gordura_corporal,massa_muscular,circunferencia_cintura,rm1_empurrar_superior,rm1_empurrar_perna,rm1_puxar_costas,score_global';

function assertResult(result: { error: { message: string } | null }, source: string) {
  if (result.error) throw new Error(`${source}: ${result.error.message}`);
}

export async function loadProgressHistory(athleteId: string): Promise<ProgressHistory> {
  const [assessmentsResult, executionsResult, legacyWorkoutsResult, legacyLoadsResult, recordsResult] = await Promise.all([
    supabase.from('avaliacoes_unificadas').select(assessmentColumns).eq('athlete_id', athleteId).order('data_avaliacao', { ascending: true }),
    supabase.from('workout_executions').select('id,workout_date,phase_name,total_volume_kg,avg_rpe').eq('athlete_id', athleteId).eq('status', 'completed').order('workout_date', { ascending: true }),
    supabase.from('treinos_realizados').select('id,data_treino,nome,volume_total,pse_medio').eq('athlete_id', athleteId).order('data_treino', { ascending: true }),
    supabase.from('registros_carga').select('id,data_registro,exercicio,carga_max,reps').eq('athlete_id', athleteId).order('data_registro', { ascending: true }),
    supabase.from('personal_records').select('id,data_pr,exercicio,valor,unidade').eq('athlete_id', athleteId).order('data_pr', { ascending: true }),
  ]);
  assertResult(assessmentsResult, 'Avaliações');
  assertResult(executionsResult, 'Treinos FitPro');
  assertResult(legacyWorkoutsResult, 'Treinos Progress Tracker');
  assertResult(legacyLoadsResult, 'Cargas Progress Tracker');
  assertResult(recordsResult, 'Recordes');

  const executions = executionsResult.data ?? [];
  const executionIds = executions.map(row => row.id);
  const sets: Array<{ id: string; execution_id: string; exercise_name: string; actual_weight: number | null; actual_reps: number | null }> = [];
  // Keep the IN filter bounded while covering long training histories.
  for (let offset = 0; offset < executionIds.length; offset += 100) {
    const result = await supabase.from('workout_exercise_sets')
      .select('id,execution_id,exercise_name,actual_weight,actual_reps')
      .in('execution_id', executionIds.slice(offset, offset + 100))
      .eq('completed', true);
    assertResult(result, 'Séries FitPro');
    sets.push(...(result.data ?? []));
  }

  const dateByExecution = new Map(executions.map(row => [row.id, row.workout_date]));
  const assessments = (assessmentsResult.data ?? []) as unknown as HistoryAssessment[];
  const workouts: HistoryWorkout[] = [
    ...executions.map(row => ({ id: `fitpro:${row.id}`, date: row.workout_date, name: row.phase_name || 'Treino concluído', volumeKg: row.total_volume_kg, rpe: row.avg_rpe, source: 'FitPro' as const })),
    ...(legacyWorkoutsResult.data ?? []).map(row => ({ id: `progress:${row.id}`, date: row.data_treino, name: row.nome || 'Treino concluído', volumeKg: row.volume_total, rpe: row.pse_medio, source: 'Progress Tracker' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const loads: HistoryLoad[] = [
    ...sets.filter(row => row.actual_weight != null && Number(row.actual_weight) > 0 && dateByExecution.has(row.execution_id))
      .map(row => ({ id: `fitpro:${row.id}`, date: dateByExecution.get(row.execution_id)!, exercise: row.exercise_name, kg: Number(row.actual_weight), reps: row.actual_reps, source: 'FitPro' as const })),
    ...(legacyLoadsResult.data ?? []).filter(row => row.carga_max != null && Number(row.carga_max) > 0)
      .map(row => ({ id: `progress:${row.id}`, date: row.data_registro, exercise: row.exercicio, kg: Number(row.carga_max), reps: row.reps, source: 'Progress Tracker' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const records: HistoryPR[] = (recordsResult.data ?? []).map(row => ({ id: row.id, date: row.data_pr, exercise: row.exercicio, value: Number(row.valor), unit: row.unidade || 'kg' }));
  return { assessments, workouts, loads, records };
}
