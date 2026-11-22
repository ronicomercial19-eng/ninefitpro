create or replace view public.vw_current_identity
with (security_invoker = true)
as
select
  p.user_id,
  p.email,
  p.full_name,
  p.role as profile_role,
  p.is_active,
  p.first_access_completed,
  aal.athlete_id,
  ath.aluno_id,
  ath.coach_id,
  ath.name as athlete_name,
  ath.email as athlete_email,
  ath.activated as athlete_activated,
  a.professor_id as aluno_professor_id,
  a.nome as aluno_name,
  a.email as aluno_email,
  coalesce(
    (select jsonb_agg(jsonb_build_object('role', ur.role::text) order by ur.role::text)
     from public.user_roles ur
     where ur.user_id = p.user_id),
    '[]'::jsonb
  ) as roles
from public.profiles p
left join public.athlete_auth_link aal
  on aal.user_id = p.user_id
left join public.athletes ath
  on ath.id = aal.athlete_id
left join public.alunos a
  on a.id = ath.aluno_id
where p.user_id = auth.uid();

revoke all on public.vw_current_identity from anon;
grant select on public.vw_current_identity to authenticated;
