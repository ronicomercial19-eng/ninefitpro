create or replace view public.vw_fitpro_athlete_canonical
with (security_invoker = true)
as
select
  a.id as athlete_id,
  a.user_id,
  a.aluno_id,
  a.coach_id,
  a.name,
  a.email,
  a.sync_score,
  a.total_xp as canonical_xp,
  a.xp_total as legacy_xp,
  (a.total_xp is not null and a.xp_total is not null and a.total_xp <> a.xp_total) as xp_conflict,
  a.level,
  a.primary_goal,
  a.training_environment,
  a.injuries_limitations,
  a.activated,
  a.onboarding_completed_at,
  a.updated_at
from public.athletes a;

grant select on public.vw_fitpro_athlete_canonical to authenticated;;
