-- P3: fonte única de atribuição e versão para os módulos do FitPro.
create or replace view public.vw_ninefit_assignment_with_version
with (security_invoker = true)
as
select
  a.id as assignment_id,
  a.athlete_id,
  a.content_type,
  a.content_ref,
  a.content_title,
  a.status as assignment_status,
  a.progress_pct,
  a.assigned_by,
  a.assigned_at,
  a.completed_at,
  a.template_version_id,
  coalesce(v.id, latest.id) as resolved_version_id,
  coalesce(v.version, latest.version) as resolved_version,
  coalesce(v.status, latest.status) as resolved_version_status,
  coalesce(v.prescription_schema, latest.prescription_schema) as prescription_schema,
  coalesce(v.protocol_schema, latest.protocol_schema) as protocol_schema,
  coalesce(v.design_tokens, latest.design_tokens) as design_tokens,
  coalesce(v.required_variables, latest.required_variables) as required_variables
from public.student_library_assignments a
left join public.ninefit_template_library t on t.slug = a.content_ref
left join public.ninefit_template_versions v on v.id = a.template_version_id
left join lateral (
  select tv.*
  from public.ninefit_template_versions tv
  where a.template_version_id is null
    and tv.template_id = t.id
    and tv.status = 'approved'
  order by tv.version desc
  limit 1
) latest on true;

grant select on public.vw_ninefit_assignment_with_version to authenticated;

comment on view public.vw_ninefit_assignment_with_version is
  'P3 fonte única para atribuição e versão de template; usa versão vinculada ou último aprovado para legado.';