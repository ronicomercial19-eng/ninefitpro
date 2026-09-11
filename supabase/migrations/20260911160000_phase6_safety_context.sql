create or replace view public.vw_fitpro_safety_context
with (security_invoker = true)
as
select a.id as athlete_id, a.coach_id, a.restricoes as athlete_restrictions,
 ps.id as latest_postura_scan_id, ps.status as postura_status, ps.result as postura_result,
 ps.notes as postura_notes, ps.updated_at as postura_updated_at,
 case when lower(coalesce(ps.status,'')) in ('approved','aprovado','reviewed') then true else false end as posture_approved,
 a.injuries_limitations
from public.athletes a
left join lateral (
 select s.* from public.postura_scans s
 where s.athlete_id = a.id or s.user_id = a.user_id
 order by s.updated_at desc nulls last, s.created_at desc nulls last limit 1
) ps on true;
comment on view public.vw_fitpro_safety_context is
'Fase 6: contexto de segurança do atleta para Postura Pro, treino e RON; somente leitura e protegido por RLS.';
grant select on public.vw_fitpro_safety_context to authenticated;
