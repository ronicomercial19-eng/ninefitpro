
create or replace function public.fn_add_hydration(p_athlete_id uuid, p_amount_ml integer default 250)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_user_id uuid;
begin
  insert into public.hydration_logs (athlete_id, amount_ml)
  values (p_athlete_id, p_amount_ml);

  select coalesce(sum(amount_ml), 0) into v_total
  from public.hydration_logs
  where athlete_id = p_athlete_id
    and log_date = (now() at time zone 'America/Sao_Paulo')::date;

  -- alimenta o Radar 5D (eixo HIDR) e o resto do ecossistema que lê master_registry
  select user_id into v_user_id from public.athletes where id = p_athlete_id;
  if v_user_id is not null then
    insert into public.master_registry (user_id, event_type, source, payload)
    values (v_user_id, 'hydration_log', 'app', jsonb_build_object('amount_ml', p_amount_ml, 'athlete_id', p_athlete_id));
  end if;

  return v_total;
end;
$$;
;
