create or replace view public.vw_current_relationships
with (security_invoker = true)
as
select
  coalesce(ath.aluno_id, a.id) as aluno_id,
  ath.id as athlete_id,
  coalesce(ath.coach_id, a.professor_id) as professional_user_id,
  p.full_name as professional_name,
  coalesce(ath.name, a.nome) as student_name,
  coalesce(ath.email, a.email) as student_email,
  case
    when aal.user_id = auth.uid() then 'student'
    when coalesce(ath.coach_id, a.professor_id) = auth.uid() then 'professional'
    else 'unrelated'
  end as relationship_role
from public.athletes ath
left join public.alunos a on a.id = ath.aluno_id
left join public.athlete_auth_link aal on aal.athlete_id = ath.id
left join public.profiles p on p.user_id = coalesce(ath.coach_id, a.professor_id)
where aal.user_id = auth.uid()
   or coalesce(ath.coach_id, a.professor_id) = auth.uid();

revoke all on public.vw_current_relationships from anon;
grant select on public.vw_current_relationships to authenticated;
