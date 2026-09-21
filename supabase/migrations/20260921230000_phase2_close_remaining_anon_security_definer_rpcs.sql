do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')
  loop
    execute format('revoke execute on function public.%s from public, anon', r.signature);
    execute format('grant execute on function public.%s to authenticated', r.signature);
  end loop;
end $$;

-- Explicitly preserve the intentionally public partner-key validation endpoint.
grant execute on function public.validate_partner_key(text) to anon;
