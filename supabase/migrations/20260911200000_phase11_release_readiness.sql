create or replace view public.vw_fitpro_release_readiness
with (security_invoker = true)
as
select
 (select count(*) from public.vw_fitpro_ecosystem_status) as modules_total,
 (select count(*) from public.vw_fitpro_ecosystem_status where availability='online') as modules_online,
 (select count(*) from public.vw_fitpro_ecosystem_status where availability<>'online') as modules_attention,
 (select count(*) from public.vw_fitpro_consistency_audit where sync_score_divergence or xp_divergence) as data_divergences,
 (select count(*) from public.vw_fitpro_consistency_audit where has_performance_plan) as athletes_with_plan,
 (select count(*) from public.athletes) as athletes_total,
 now() as checked_at;
comment on view public.vw_fitpro_release_readiness is 'Fase 11: indicador técnico de prontidão para QA e publicação.';
grant select on public.vw_fitpro_release_readiness to authenticated;
