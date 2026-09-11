create or replace view public.vw_fitpro_consistency_audit
with (security_invoker = true)
as
select a.id as athlete_id,a.name as athlete_name,a.sync_score as athlete_sync_score,
 h.sync_score as hub_sync_score,a.total_xp as athlete_total_xp,h.total_xp as hub_total_xp,
 p.completed_workouts as progress_completed_workouts,
 case when a.sync_score is not null and h.sync_score is not null and a.sync_score<>h.sync_score then true else false end as sync_score_divergence,
 case when a.total_xp is not null and h.total_xp is not null and a.total_xp<>h.total_xp then true else false end as xp_divergence,
 case when p.athlete_id is not null then p.plan_id is not null else false end as has_performance_plan,
 now() as audited_at
from public.athletes a
left join public.vw_hub_status h on h.athlete_id=a.id
left join public.vw_fitpro_performance_overview p on p.athlete_id=a.id;
comment on view public.vw_fitpro_consistency_audit is 'Fase 10: auditoria de consistência entre Hub, Performance e identidade canônica.';
grant select on public.vw_fitpro_consistency_audit to authenticated;
