-- Reversão. Depois de aplicar no banco duas alterações de NINE/LIMA (mapa tag->goal com seleção balanceada, e entrega automática
-- de infoproduto), vi nos PRs #72 e #73 que o time removeu de propósito (a) o botão NINE/LIMA da tela de Protocolo, para não
-- substituir conteúdo do coach por treino aleatório, e (b) o fallback de exercícios sem correspondência nas tags do protocolo.
-- O mapa que criei reabria esse fallback e a entrega automática contrariava a regra. Esta migration restaura
-- fn_aplicar_protocolo_9x9x9 como estava (PR #73) e deixa fn_aplicar_nine_lima apenas com o fallback de nível e a
-- tentativa do próximo protocolo quando um é incompatível por modalidade. Idempotente a partir de qualquer um dos dois estados.
CREATE OR REPLACE FUNCTION public.fn_aplicar_protocolo_9x9x9(p_athlete_id uuid, p_protocol_id text, p_data date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_protocolo RECORD;
  v_workout_type TEXT;
  v_sets INT4;
  v_reps TEXT;
  v_rest INT4;
  v_rpe INT4;
  v_daily_workout_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (
      a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = a.id AND l.user_id = auth.uid())
    )
  ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_data::text, 0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id = p_athlete_id AND workout_date = p_data AND status IN ('in_progress', 'completed')) THEN
    RAISE EXCEPTION 'O treino deste dia já foi iniciado. Use Ajustar treino para preservar o histórico.';
  END IF;
  SELECT * INTO v_protocolo
  FROM public.smart_treino_protocols
  WHERE id = p_protocol_id;

  IF v_protocolo IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'protocolo_nao_encontrado');
  END IF;

  IF NOT public.fn_protocol_strength_compatible(p_protocol_id) THEN
    RETURN json_build_object('success', false, 'error', 'protocolo_modalidade_incompativel',
      'description', 'Este protocolo usa distância, duração ou estrutura específica. Não pode ser aplicado como repetições de musculacao.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.exercises e WHERE e.video_url IS NOT NULL
    AND (v_protocolo.goal_tags IS NULL OR EXISTS (
      SELECT 1 FROM unnest(v_protocolo.goal_tags) tag WHERE e.goal ILIKE '%' || tag || '%'
    ))
  ) THEN
    RETURN json_build_object('success',false,'error','sem_exercicios_compativeis');
  END IF;

  -- Mapeamento pilar -> workout_type (CHECK constraint real de daily_workouts)
  -- Decisão provisória, ajustável: estrutural=hypertrophy, performance=endurance, longevidade=recovery
  v_workout_type := CASE v_protocolo.pillar
    WHEN 'estrutural' THEN 'hypertrophy'
    WHEN 'performance' THEN 'endurance'
    WHEN 'longevidade' THEN 'recovery'
    ELSE 'hypertrophy'
  END;

  v_sets := NULLIF(v_protocolo.block_9_template->>'sets', '')::INT4;
  v_reps := v_protocolo.block_9_template->>'reps';
  v_rest := NULLIF(v_protocolo.block_9_template->>'rest', '')::INT4;
  v_rpe := NULLIF(v_protocolo.block_9_template->>'rpe', '')::INT4;

  -- Remove treino já existente nessa data pra não duplicar (idempotente)
  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (
    SELECT id FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = p_data
  );
  DELETE FROM public.daily_workouts WHERE athlete_id = p_athlete_id AND workout_date = p_data;

  INSERT INTO public.daily_workouts (athlete_id, day_number, day_name, focus_muscles, workout_type, workout_date)
  VALUES (p_athlete_id, 1, v_protocolo.protocol_name || ' (' || v_protocolo.variation_name || ')', ARRAY['full_body'], v_workout_type, p_data)
  RETURNING id INTO v_daily_workout_id;

  INSERT INTO public.workout_exercises (daily_workout_id, exercise_id, exercise_order, sets, reps_range, rest_seconds, rpe_target)
  SELECT v_daily_workout_id, ex.id, row_number() OVER (), v_sets, v_reps, v_rest, v_rpe
  FROM (
    SELECT id FROM public.exercises
    WHERE video_url IS NOT NULL
      AND (
        v_protocolo.goal_tags IS NULL
        OR EXISTS (
          SELECT 1 FROM unnest(v_protocolo.goal_tags) AS tag
          WHERE goal ILIKE '%' || tag || '%'
        )
      )
    ORDER BY random() LIMIT 6
  ) ex;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'protocol_name', v_protocolo.protocol_name,
    'pillar', v_protocolo.pillar,
    'workout_type_aplicado', v_workout_type
  );
END;
$function$;

DROP FUNCTION IF EXISTS public.fn_pick_balanced_exercises(uuid, date, text[], integer);
DROP FUNCTION IF EXISTS public.fn_protocol_exercise_goals(text[]);

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
  v_try int;
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

  -- rotaciona entre os protocolos do pilar/nível conforme o dia do ano;
  -- se o do dia é incompatível com musculacao (distância/duração) ou sem exercícios correspondentes, tenta o próximo
  FOR v_try IN 0 .. v_count - 1 LOOP
    select id into v_protocol_id
    from smart_treino_protocols
    where pillar = v_pillar and v_level = any(recommended_for)
    order by protocol_id, variation_id, id
    offset ((extract(doy from p_data)::int + v_try) % v_count) limit 1;

    v_res := public.fn_aplicar_protocolo_9x9x9(p_athlete_id, v_protocol_id, p_data);
    EXIT WHEN coalesce((v_res->>'success')::boolean, false);
    EXIT WHEN coalesce(v_res->>'error', '') NOT IN ('sem_exercicios_compativeis', 'protocolo_modalidade_incompativel');
  END LOOP;

  return v_res;
end;
$function$;
