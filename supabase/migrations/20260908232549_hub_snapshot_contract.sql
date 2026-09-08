-- Canonical, authenticated snapshot for the 9FIT Hub.
-- A missing value remains NULL; zero is reserved for an observed zero.

CREATE OR REPLACE FUNCTION public.fn_get_hub_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_athlete_id uuid := null;
  v_athlete_aluno_id uuid := null;
  v_athlete_name text := null;
  v_hub_treinos integer := null;
  v_hub_nutri integer := null;
  v_hub_minutos integer := null;
  v_composite_score numeric := null;
  v_composite_sources text[] := null;
  v_composite_updated_at timestamptz := null;
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

  SELECT a.id, a.aluno_id, a.name
    INTO v_athlete_id, v_athlete_aluno_id, v_athlete_name
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

  IF v_athlete_aluno_id IS NOT NULL THEN
    SELECT score_normalized, active_sources, updated_at
      INTO v_composite_score, v_composite_sources, v_composite_updated_at
      FROM public.aluno_score_composite
     WHERE aluno_id = v_athlete_aluno_id
     ORDER BY updated_at DESC
     LIMIT 1;
  END IF;

  IF v_composite_score IS NOT NULL
     AND COALESCE(cardinality(v_composite_sources), 0) > 0 THEN
    v_sync_value := v_composite_score;
    v_sync_observed_at := v_composite_updated_at;
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
      'source', CASE WHEN v_sync_value IS NULL THEN null ELSE to_jsonb(v_composite_sources) END,
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
$$;

REVOKE ALL ON FUNCTION public.fn_get_hub_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_get_hub_snapshot() FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_get_hub_snapshot() TO authenticated;

COMMENT ON FUNCTION public.fn_get_hub_snapshot() IS
  'Canonical authenticated Hub snapshot. NULL means not collected; zero means observed zero.';

