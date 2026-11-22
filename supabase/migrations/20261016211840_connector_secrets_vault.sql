-- A API Key digitada em ApiConnectorCard nunca era persistida (só o hint de 4 chars e um
-- secret_ref inventado), então todos os proxies liam uma variável de ambiente inexistente.
-- Passa a guardar a chave no Supabase Vault, escrita só por admin e lida só pelo service_role.

create or replace function public.set_connector_secret(p_key text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_id uuid;
  v_name text := 'connector:' || p_key;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_key is null or p_key !~ '^[a-z0-9_]+$' or coalesce(length(p_secret), 0) < 8 then
    raise exception 'invalid connector key or secret';
  end if;

  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then
    perform vault.create_secret(p_secret, v_name, 'API connector secret');
  else
    perform vault.update_secret(v_id, p_secret, v_name, 'API connector secret');
  end if;

  update public.api_connectors set secret_ref = v_name where key = p_key;
end;
$$;

revoke all on function public.set_connector_secret(text, text) from public, anon;
grant execute on function public.set_connector_secret(text, text) to authenticated;

create or replace function public.get_connector_secret(p_key text)
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'connector:' || p_key limit 1
$$;

revoke all on function public.get_connector_secret(text) from public, anon, authenticated;
grant execute on function public.get_connector_secret(text) to service_role;;
