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
      and p.proname ~ '^(prescrever|registrar|salvar|gerar|sync_|recalc|recalculate|regenerar|ajustar_|aplicar_|consumir|fn_|deliver_|calcular_|check_and_create|detect_pr|ensure_|find_exercises|resolve_aluno|notificar_)'
  loop
    execute format('revoke execute on function public.%s from public, anon', r.signature);
    execute format('grant execute on function public.%s to authenticated', r.signature);
  end loop;
end $$;
