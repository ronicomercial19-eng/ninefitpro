-- Nine/Lima: se o pilar não tem protocolo pro nível do atleta (ex.: longevidade/avançado), usa o nível intermediário.
CREATE OR REPLACE FUNCTION public.fn_aplicar_nine_lima(p_athlete_id uuid, p_data date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid;
  v_goal text;
  v_pillar text;
  v_level text;
  v_lvl_raw text;
  v_protocol_id text;
  v_count int;
  v_res json;
begin
  -- posse do recurso
  if auth.uid() is null or not (
    exists (select 1 from athletes a where a.id = p_athlete_id and a.user_id = auth.uid())
    or exists (select 1 from athlete_auth_link al where al.athlete_id = p_athlete_id and al.user_id = auth.uid())
    or exists (select 1 from athletes a join auth.users u on u.email = a.email where a.id = p_athlete_id and u.id = auth.uid())
  ) then
    raise exception 'not authorized';
  end if;

  -- nunca sobrescrever treino já iniciado/concluído na data
  if exists (select 1 from workout_executions we where we.athlete_id = p_athlete_id and we.workout_date = p_data and we.status in ('in_progress','completed')) then
    return json_build_object('success', false, 'error', 'treino_do_dia_ja_iniciado');
  end if;

  select coalesce(a.user_id, al.user_id), lower(coalesce(a.training_level::text, a.experience_level::text, a.nivel::text, a.level::text, ''))
    into v_user, v_lvl_raw
  from athletes a left join athlete_auth_link al on al.athlete_id = a.id
  where a.id = p_athlete_id limit 1;

  select up.goal::text into v_goal from user_parameters up where up.user_id = v_user;

  v_pillar := case v_goal
    when 'aesthetics' then 'estrutural'
    when 'recomposition' then 'estrutural'
    when 'longevity' then 'longevidade'
    else 'performance' end;

  v_level := case
    when v_lvl_raw like 'inic%' or v_lvl_raw like 'begin%' then 'iniciante'
    when v_lvl_raw like 'avan%' or v_lvl_raw like 'adv%' then 'avancado'
    else 'intermediario' end;

  select count(*) into v_count from smart_treino_protocols where pillar = v_pillar and v_level = any(recommended_for);

  -- fallback: pilar sem protocolo pro nível usa o nível intermediário
  if v_count = 0 and v_level <> 'intermediario' then
    v_level := 'intermediario';
    select count(*) into v_count from smart_treino_protocols where pillar = v_pillar and v_level = any(recommended_for);
  end if;

  if v_count = 0 then
    return json_build_object('success', false, 'error', 'nenhum_protocolo_para_o_perfil');
  end if;

  -- rotaciona entre os protocolos do pilar/nível conforme o dia do ano
  select id into v_protocol_id
  from smart_treino_protocols
  where pillar = v_pillar and v_level = any(recommended_for)
  order by protocol_id, variation_id, id
  offset (extract(doy from p_data)::int % v_count) limit 1;

  v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);
  return v_res;
end;
$function$;
