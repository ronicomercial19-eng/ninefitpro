
ALTER TABLE public.athlete_periodizations ADD COLUMN IF NOT EXISTS model_snapshot jsonb;

CREATE OR REPLACE FUNCTION public.get_workout_of_day(p_athlete_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ap record;
  v_model jsonb;
  v_start date;
  v_days_since int;
  v_mes int;
  v_week_in_month int;
  v_day_of_cycle int;
  v_meso jsonb;
  v_micro jsonb;
  v_days_arr jsonb;
  v_day jsonb;
  v_is_deload boolean;
  v_status text;
  v_groups jsonb;
  v_exercises jsonb;
  v_result jsonb;
BEGIN
  SELECT * INTO v_ap
  FROM public.athlete_periodizations
  WHERE athlete_id = p_athlete_id
    AND status IN ('active','in_progress')
    AND model_snapshot IS NOT NULL
  ORDER BY assigned_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','no_plan','message','Nenhuma periodização ativa com modelo do catálogo.');
  END IF;

  v_model := v_ap.model_snapshot;
  v_start := v_ap.assigned_at::date;
  v_days_since := GREATEST(0, (p_date - v_start));
  v_mes := (v_days_since / 30) + 1;
  v_week_in_month := ((v_days_since % 30) / 7) + 1;
  IF v_week_in_month > 4 THEN v_week_in_month := 4; END IF;
  v_day_of_cycle := (v_days_since % 7) + 1;
  v_is_deload := (v_week_in_month = 4);

  -- pick mesociclo where mes = v_mes (fallback to last)
  SELECT m INTO v_meso
  FROM jsonb_array_elements(v_model->'mesociclos') m
  WHERE (m->>'mes')::int = v_mes
  LIMIT 1;
  IF v_meso IS NULL THEN
    SELECT m INTO v_meso FROM jsonb_array_elements(v_model->'mesociclos') m ORDER BY (m->>'mes')::int DESC LIMIT 1;
  END IF;

  v_micro := v_model->'microciclo_padrao';
  v_days_arr := CASE WHEN v_is_deload THEN v_micro->'semana_4_deload' ELSE v_micro->'semanas_1_a_3' END;

  SELECT d INTO v_day
  FROM jsonb_array_elements(v_days_arr) d
  WHERE (d->>'dia')::int = v_day_of_cycle
  LIMIT 1;

  IF v_day IS NULL THEN
    RETURN jsonb_build_object('status','no_session','date',p_date,'mes',v_mes,'semana',v_week_in_month,'dia',v_day_of_cycle,
      'message','Sem sessão definida para este dia.');
  END IF;

  v_status := v_day->>'status';
  v_groups := COALESCE(v_day->'grupos_musculares','[]'::jsonb);

  IF v_status <> 'treino' THEN
    RETURN jsonb_build_object(
      'status','rest','date',p_date,'mes',v_mes,'semana',v_week_in_month,'dia',v_day_of_cycle,
      'day_type', v_day->>'tipo_dia',
      'instructions', v_day->>'instrucao_app',
      'is_deload_week', v_is_deload
    );
  END IF;

  -- Pull up to 6 exercises whose muscle_groups/target_muscles intersect groups of the day
  WITH grp AS (
    SELECT lower(trim(value)) AS g FROM jsonb_array_elements_text(v_groups)
  ),
  ex_cand AS (
    SELECT e.id, e.name, e.target_muscles, e.muscle_groups, e.equipment, e.video_url
    FROM public.exercises e
    WHERE EXISTS (
      SELECT 1 FROM grp
      WHERE (
        EXISTS (SELECT 1 FROM unnest(COALESCE(e.target_muscles,ARRAY[]::text[])) tm WHERE lower(tm) LIKE '%'||grp.g||'%')
        OR e.muscle_groups::text ILIKE '%'||grp.g||'%'
      )
    )
    LIMIT 60
  )
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  INTO v_exercises
  FROM (SELECT * FROM ex_cand ORDER BY random() LIMIT 6) x;

  v_result := jsonb_build_object(
    'status','workout',
    'date', p_date,
    'mes', v_mes,
    'semana', v_week_in_month,
    'dia', v_day_of_cycle,
    'is_deload_week', v_is_deload,
    'day_type', v_day->>'tipo_dia',
    'day_name', COALESCE(v_day->>'nome', v_day->>'tipo_dia'),
    'groups', v_groups,
    'instructions', v_day->>'instrucao_app',
    'prescription', jsonb_build_object(
      'series_por_grupo_semana', v_meso->>'series_por_grupo_semana',
      'faixa_reps', v_meso->>'faixa_reps',
      'intensidade_percent_1rm', v_meso->>'intensidade_percent_1rm',
      'rpe_alvo', CASE WHEN v_is_deload THEN 'RPE alvo -2 a -3' ELSE (v_meso->>'rpe_alvo') END,
      'frequencia_semanal_por_grupo', v_meso->>'frequencia_semanal_por_grupo',
      'metodo_principal', v_meso->>'metodo_principal',
      'deload_reducao_volume', CASE WHEN v_is_deload THEN (v_meso->>'deload_reducao_volume') ELSE NULL END
    ),
    'meso', jsonb_build_object('id', v_meso->>'id', 'nome', v_meso->>'nome', 'mes', v_meso->>'mes'),
    'model', jsonb_build_object('id', v_model->>'model_id', 'nome', v_model->>'nome', 'categoria', v_model->>'categoria'),
    'exercises', v_exercises
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workout_of_day(uuid, date) TO authenticated, anon, service_role;
;
