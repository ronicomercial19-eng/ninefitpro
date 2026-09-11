create or replace view public.vw_fitpro_performance_overview
with (security_invoker = true)
as
select
  a.id as athlete_id,
  p.id as plan_id,
  p.title as plan_title,
  p.status as plan_status,
  p.start_date as plan_start_date,
  p.end_date as plan_end_date,
  per.id as periodization_id,
  per.title as periodization_title,
  per.current_phase,
  per.total_phases,
  prog.latest_workout_date,
  coalesce(prog.completed_workouts, 0)::bigint as completed_workouts,
  coalesce(prog.total_volume_kg, 0)::numeric as total_volume_kg,
  prog.avg_rpe,
  'v_athlete_workout_plans_canonical'::text as plan_source,
  'v_periodizations_canonical'::text as periodization_source,
  'vw_workout_progress_unified'::text as progress_source
from public.athletes a
left join lateral (
  select p0.*
  from public.v_athlete_workout_plans_canonical p0
  where p0.athlete_id = a.id
  order by
    case when lower(coalesce(p0.status, '')) in ('active','published','in_progress') then 0 else 1 end,
    p0.updated_at desc nulls last,
    p0.created_at desc nulls last
  limit 1
) p on true
left join lateral (
  select per0.*
  from public.v_periodizations_canonical per0
  where per0.athlete_id = a.id
  order by per0.updated_at desc nulls last, per0.created_at desc nulls last
  limit 1
) per on true
left join lateral (
  select
    max(w.date) as latest_workout_date,
    count(*) filter (where w.completed_at is not null) as completed_workouts,
    sum(coalesce(w.weight_kg, 0) * coalesce(w.sets, 0) * coalesce(w.reps, 0)) as total_volume_kg,
    avg(w.rpe) as avg_rpe
  from public.vw_workout_progress_unified w
  where w.resolved_athlete_id = a.id or w.athlete_id = a.id
) prog on true;

comment on view public.vw_fitpro_performance_overview is
'Fase 4: leitura canônica unificada de Planejamento, Ajuste de Treino e Progress Tracker. Não duplica dados; preserva os fronts e fontes originais.';

grant select on public.vw_fitpro_performance_overview to authenticated;
