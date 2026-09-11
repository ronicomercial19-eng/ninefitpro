import { supabase } from "@/integrations/supabase/client";

export interface CoachStudentPerformance {
  coach_id: string;
  athlete_id: string;
  athlete_name: string | null;
  athlete_email: string | null;
  activated: boolean | null;
  primary_goal: string | null;
  level: number | null;
  sync_score: number | null;
  plan_id: string | null;
  plan_title: string | null;
  plan_status: string | null;
  periodization_id: string | null;
  periodization_title: string | null;
  current_phase: string | null;
  total_phases: number | null;
  latest_workout_date: string | null;
  completed_workouts: number | null;
  total_volume_kg: number | null;
  avg_rpe: number | null;
}

/**
 * Consulta a ponte Professor ↔ Aluno.
 * A autorização final permanece no security_invoker/RLS da view.
 */
export async function loadCoachStudentsPerformance(): Promise<CoachStudentPerformance[]> {
  const { data, error } = await (supabase as any)
    .from("vw_fitpro_coach_student_performance")
    .select("*")
    .order("athlete_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CoachStudentPerformance[];
}
