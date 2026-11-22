create or replace view public.vw_fitpro_coach_student_performance
with (security_invoker = true)
as
select
  a.coach_id,
  a.id as athlete_id,
  a.name as athlete_name,
  a.email as athlete_email,
  a.activated,
  a.primary_goal,
  a.level,
  a.sync_score,
  p.plan_id,
  p.plan_title,
  p.plan_status,
  p.periodization_id,
  p.periodization_title,
  p.current_phase,
  p.total_phases,
  p.latest_workout_date,
  p.completed_workouts,
  p.total_volume_kg,
  p.avg_rpe
from public.athletes a
left join public.vw_fitpro_performance_overview p on p.athlete_id = a.id;

comment on view public.vw_fitpro_coach_student_performance is
'Fase 5: mesma visão de performance para Painel do Professor e App do Aluno, filtrável por coach_id e protegida por RLS via security_invoker.';

grant select on public.vw_fitpro_coach_student_performance to authenticated;
