create or replace view public.vw_fitpro_operational_health
with (security_invoker = true)
as
select
 (select count(*) from public.logs_sincronizacao where created_at >= now() - interval '24 hours') as sync_events_24h,
 (select count(*) from public.logs_sincronizacao where created_at >= now() - interval '24 hours' and lower(coalesce(status,'')) in ('error','failed','erro','falha')) as sync_errors_24h,
 (select count(*) from public.vw_fitpro_ecosystem_status where availability='attention') as modules_attention,
 (select data_divergences from public.vw_fitpro_release_readiness limit 1) as data_divergences,
 now() as checked_at;
comment on view public.vw_fitpro_operational_health is 'Fase 13: saúde operacional de integrações e sincronizações.';
grant select on public.vw_fitpro_operational_health to authenticated;
