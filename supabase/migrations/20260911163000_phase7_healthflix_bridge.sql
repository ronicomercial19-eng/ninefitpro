create or replace view public.vw_fitpro_healthflix_assignments
with (security_invoker = true)
as
select a.id as athlete_id, a.coach_id,
 coalesce(x.id,p.id) as assignment_id,
 coalesce(x.healthflix_content_id,p.healthflix_content_id) as content_id,
 coalesce(x.title,'') as title, x.category,
 coalesce(p.progress_percent,x.progress_percent,0) as progress_percent,
 coalesce(p.started_at,x.assigned_at) as started_at,
 coalesce(p.completed_at,x.completed_at) as completed_at,
 p.last_event_at, x.status as assignment_status, x.assigned_at
from public.athletes a
left join lateral (
 select z.* from public.fitpro_healthflix_assignments z
 where z.fitpro_student_id=a.id or z.fitpro_student_id=a.aluno_id
 order by z.updated_at desc nulls last limit 1
) x on true
left join lateral (
 select q.* from public.fitpro_healthflix_progress q
 where (q.fitpro_student_id=a.id or q.fitpro_student_id=a.aluno_id)
 and (x.healthflix_content_id is null or q.healthflix_content_id=x.healthflix_content_id)
 order by q.updated_at desc nulls last limit 1
) p on true;
comment on view public.vw_fitpro_healthflix_assignments is 'Fase 7: atribuições HealthFlix e progresso unificados para Professor e Aluno.';
grant select on public.vw_fitpro_healthflix_assignments to authenticated;
