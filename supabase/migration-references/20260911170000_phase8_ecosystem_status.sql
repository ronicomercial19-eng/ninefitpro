create or replace view public.vw_fitpro_ecosystem_status
with (security_invoker = true)
as
select m.key as module_key,m.name,m.description,m.category,m.cta_label,m.cta_route,m.display_order,
 m.status as module_status,m.lock_reason,m.connector_key,c.id as connector_id,c.provider,c.endpoint,c.iframe_url,
 c.auth_mode,c.status as connector_status,
 case when lower(coalesce(m.status,'')) in ('active','online') and lower(coalesce(c.status,'')) in ('active','online') then 'online'
 when c.id is null then 'not_configured' else 'attention' end as availability
from public.physio_modules m
left join public.api_connectors c on c.key=m.connector_key
order by m.display_order nulls last,m.name;
comment on view public.vw_fitpro_ecosystem_status is 'Fase 8: catálogo operacional do ecossistema para NEXUS e Hub.';
grant select on public.vw_fitpro_ecosystem_status to authenticated;
