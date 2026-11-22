-- Havia DOIS motores de Sync Score rodando sem se falar:
--   1) calcular_sync_score_real() -> escreve em athletes.sync_score (funciona de verdade)
--   2) fn_get_hub_snapshot() -> lia de aluno_score_composite, tabela SEMPRE VAZIA (0 linhas)
-- Resultado: telas diferentes mostravam números diferentes (16 vs 37) e
-- estados contraditórios (calibrando vs calibrada) pro mesmo instante.
-- Fix: athletes.sync_score vira a ÚNICA fonte de verdade. Adiciona timestamp
-- de atualização e faz fn_get_hub_snapshot() ler dali, com aluno_score_composite
-- mantida apenas como fallback histórico (caso um dia volte a ser populada).

alter table public.athletes
  add column if not exists sync_score_updated_at timestamptz;

create or replace function public.calcular_sync_score_real(p_athlete_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_score           int := 0;
  v_treinos_semana  int;
  v_tem_avaliacao   bool;
  v_tem_plano       bool;
  v_tem_pdi         bool;
  v_dias_consist    int;
  v_checkin_hoje    bool;
  v_checkin_media   numeric;
BEGIN
  SELECT COUNT(*) INTO v_treinos_semana
  FROM workout_executions
  WHERE athlete_id = p_athlete_id
    AND workout_date >= now() - interval '7 days'
    AND status = 'completed';
  v_score := v_score + LEAST(40, v_treinos_semana * 10);

  SELECT EXISTS(
    SELECT 1 FROM avaliacoes_unificadas WHERE athlete_id = p_athlete_id
  ) INTO v_tem_avaliacao;
  IF v_tem_avaliacao THEN v_score := v_score + 20; END IF;

  SELECT EXISTS(
    SELECT 1 FROM planos_de_treino_gerados
    WHERE athlete_id = p_athlete_id AND status = 'active'
  ) INTO v_tem_plano;
  IF v_tem_plano THEN v_score := v_score + 20; END IF;

  SELECT EXISTS(
    SELECT 1 FROM athlete_pdi_history WHERE athlete_id = p_athlete_id
  ) INTO v_tem_pdi;
  IF v_tem_pdi THEN v_score := v_score + 10; END IF;

  SELECT COUNT(DISTINCT workout_date) INTO v_dias_consist
  FROM workout_executions
  WHERE athlete_id = p_athlete_id
    AND workout_date >= now() - interval '30 days';
  v_score := v_score + LEAST(10, v_dias_consist);

  SELECT
    EXISTS(SELECT 1 FROM daily_checkins WHERE athlete_id = p_athlete_id AND checkin_date = CURRENT_DATE),
    AVG((COALESCE(sono,3) + COALESCE(energia,3) + COALESCE(alimentacao,3)) / 3.0)
  INTO v_checkin_hoje, v_checkin_media
  FROM daily_checkins
  WHERE athlete_id = p_athlete_id
    AND checkin_date >= CURRENT_DATE - 7;

  IF v_checkin_hoje THEN
    v_score := v_score + LEAST(10, ROUND(COALESCE(v_checkin_media, 3) * 2)::int);
  END IF;

  v_score := GREATEST(0, LEAST(100, v_score));

  UPDATE athletes SET sync_score = v_score, sync_score_updated_at = now() WHERE id = p_athlete_id;

  RETURN v_score;
END;
$function$;

create or replace function public.fn_get_hub_snapshot()
 returns jsonb
 language plpgsql
 stable
 set search_path to 'public'
as $function$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_athlete_id uuid := null;
  v_athlete_aluno_id uuid := null;
  v_athlete_name text := null;
  v_hub_treinos integer := null;
  v_hub_nutri integer := null;
  v_hub_minutos integer := null;
  v_sync_score integer := null;
  v_sync_score_updated_at timestamptz := null;
  v_hrv_value numeric := null;
  v_hrv_recorded_at timestamptz := null;
  v_heart_value numeric := null;
  v_heart_recorded_at timestamptz := null;
  v_activity_calories numeric := null;
  v_activity_recorded_at timestamptz := null;
  v_treino_count integer := 0;
  v_nutri_count integer := 0;
  v_sleep_count integer := 0;
  v_mobility_count integer := 0;
  v_hydration_count integer := 0;
  v_treino_observed_at timestamptz := null;
  v_nutri_observed_at timestamptz := null;
  v_sleep_observed_at timestamptz := null;
  v_mobility_observed_at timestamptz := null;
  v_hydration_observed_at timestamptz := null;
  v_sync_status text := 'calibrating';
  v_sync_value numeric := null;
  v_sync_observed_at timestamptz := null;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT a.id, a.aluno_id, a.name, a.sync_score, a.sync_score_updated_at
    INTO v_athlete_id, v_athlete_aluno_id, v_athlete_name, v_sync_score, v_sync_score_updated_at
    FROM public.athletes a
   WHERE a.user_id = v_user_id
      OR EXISTS (
        SELECT 1
          FROM public.athlete_auth_link aal
         WHERE aal.user_id = v_user_id
           AND aal.athlete_id = a.id
      )
   ORDER BY CASE WHEN a.user_id = v_user_id THEN 0 ELSE 1 END, a.created_at DESC
   LIMIT 1;

  IF v_athlete_id IS NULL THEN
    RETURN jsonb_build_object(
      'version', 1,
      'status', 'no_athlete_profile',
      'generated_at', now(),
      'sync', jsonb_build_object('value', null, 'status', 'not_collected', 'source', null, 'observed_at', null),
      'dimensions', '{}'::jsonb,
      'weekly', '{}'::jsonb,
      'vitals', '{}'::jsonb
    );
  END IF;

  SELECT treinos_semana, nutri_semana, minutos_semana
    INTO v_hub_treinos, v_hub_nutri, v_hub_minutos
    FROM public.vw_hub_status
   WHERE athlete_id = v_athlete_id
   LIMIT 1;

  -- Fonte única: athletes.sync_score (calcular_sync_score_real). A antiga
  -- leitura de aluno_score_composite foi removida — essa tabela nunca
  -- teve uma linha sequer em produção e mantinha o Hub preso em
  -- "calibrando" mesmo com dado real disponível em outro lugar.
  IF v_sync_score IS NOT NULL AND v_sync_score_updated_at IS NOT NULL THEN
    v_sync_value := v_sync_score;
    v_sync_observed_at := v_sync_score_updated_at;
    v_sync_status := CASE
      WHEN v_sync_observed_at < now() - interval '48 hours' THEN 'stale'
      ELSE 'available'
    END;
  END IF;

  SELECT
    count(*) FILTER (WHERE event_type IN ('workout_completed', 'workout_complete')),
    count(*) FILTER (WHERE event_type = 'nutrition_log'),
    count(*) FILTER (WHERE event_type = 'sleep_log'),
    count(*) FILTER (WHERE event_type = 'mobility_log'),
    count(*) FILTER (WHERE event_type = 'hydration_log'),
    max(created_at) FILTER (WHERE event_type IN ('workout_completed', 'workout_complete')),
    max(created_at) FILTER (WHERE event_type = 'nutrition_log'),
    max(created_at) FILTER (WHERE event_type = 'sleep_log'),
    max(created_at) FILTER (WHERE event_type = 'mobility_log'),
    max(created_at) FILTER (WHERE event_type = 'hydration_log')
  INTO v_treino_count, v_nutri_count, v_sleep_count, v_mobility_count, v_hydration_count,
       v_treino_observed_at, v_nutri_observed_at, v_sleep_observed_at,
       v_mobility_observed_at, v_hydration_observed_at
  FROM public.master_registry
  WHERE user_id = v_user_id
    AND created_at >= now() - interval '7 days';

  SELECT hrv_ms, recorded_at INTO v_hrv_value, v_hrv_recorded_at
    FROM public.bio_hrv_logs
   WHERE user_id = v_user_id
   ORDER BY recorded_at DESC LIMIT 1;

  SELECT bpm, recorded_at INTO v_heart_value, v_heart_recorded_at
    FROM public.bio_heart_rate_logs
   WHERE user_id = v_user_id
   ORDER BY recorded_at DESC LIMIT 1;

  SELECT calories, recorded_at INTO v_activity_calories, v_activity_recorded_at
    FROM public.bio_activity_logs
   WHERE user_id = v_user_id
     AND recorded_at >= date_trunc('day', now())
   ORDER BY recorded_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'version', 1,
    'status', v_sync_status,
    'athlete', jsonb_build_object('id', v_athlete_id, 'name', v_athlete_name),
    'generated_at', now(),
    'sync', jsonb_build_object(
      'value', v_sync_value,
      'status', v_sync_status,
      'source', CASE WHEN v_sync_value IS NULL THEN null ELSE to_jsonb(ARRAY['calcular_sync_score_real']) END,
      'observed_at', v_sync_observed_at
    ),
    'dimensions', jsonb_build_object(
      'treino', jsonb_build_object('value', least(100, v_treino_count * 25), 'status', CASE WHEN v_treino_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'master_registry', 'observed_at', v_treino_observed_at),
      'nutri', jsonb_build_object('value', least(100, round(v_nutri_count * 100.0 / 21)), 'status', CASE WHEN v_nutri_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'master_registry', 'observed_at', v_nutri_observed_at),
      'sono', jsonb_build_object('value', least(100, round(v_sleep_count * 100.0 / 7)), 'status', CASE WHEN v_sleep_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'master_registry', 'observed_at', v_sleep_observed_at),
      'mob', jsonb_build_object('value', least(100, v_mobility_count * 25), 'status', CASE WHEN v_mobility_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'master_registry', 'observed_at', v_mobility_observed_at),
      'hidr', jsonb_build_object('value', least(100, round(v_hydration_count * 100.0 / 14)), 'status', CASE WHEN v_hydration_observed_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'master_registry', 'observed_at', v_hydration_observed_at)
    ),
    'weekly', jsonb_build_object(
      'treinos', COALESCE(v_hub_treinos, v_treino_count, 0),
      'nutri', COALESCE(v_hub_nutri, v_nutri_count, 0),
      'minutos', COALESCE(v_hub_minutos, 0)
    ),
    'vitals', jsonb_build_object(
      'water', jsonb_build_object('value', null, 'status', 'not_collected', 'source', null, 'observed_at', null),
      'hrv', jsonb_build_object('value', v_hrv_value, 'status', CASE WHEN v_hrv_recorded_at IS NULL THEN 'not_collected' WHEN v_hrv_recorded_at < now() - interval '36 hours' THEN 'stale' ELSE 'available' END, 'source', 'bio_hrv_logs', 'observed_at', v_hrv_recorded_at),
      'calories', jsonb_build_object('value', v_activity_calories, 'status', CASE WHEN v_activity_recorded_at IS NULL THEN 'not_collected' ELSE 'available' END, 'source', 'bio_activity_logs', 'observed_at', v_activity_recorded_at),
      'heart_rate', jsonb_build_object('value', v_heart_value, 'status', CASE WHEN v_heart_recorded_at IS NULL THEN 'not_collected' WHEN v_heart_recorded_at < now() - interval '36 hours' THEN 'stale' ELSE 'available' END, 'source', 'bio_heart_rate_logs', 'observed_at', v_heart_recorded_at)
    )
  );
END;
$function$;

-- Popula o score da Fernanda agora (senão ela fica "calibrando" até a
-- próxima vez que algo disparar o recálculo).
select public.calcular_sync_score_real('18fabf10-6ab7-4c09-8c5c-7169516043e2');
;
