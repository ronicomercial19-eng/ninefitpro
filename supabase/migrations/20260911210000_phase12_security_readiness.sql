create or replace view public.vw_fitpro_security_readiness
with (security_invoker = true)
as
select
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity) as rls_tables,
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and not exists (select 1 from pg_policies p where p.schemaname='public' and p.tablename=c.relname)) as rls_without_policy,
 (select count(*) from pg_policies where schemaname='public') as policies_total,
 now() as checked_at;
comment on view public.vw_fitpro_security_readiness is 'Fase 12: diagnóstico de prontidão RLS para QA; não altera políticas.';
grant select on public.vw_fitpro_security_readiness to authenticated;
