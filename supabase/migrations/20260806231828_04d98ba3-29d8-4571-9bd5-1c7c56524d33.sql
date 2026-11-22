
CREATE OR REPLACE FUNCTION public.get_workout_of_day(p_athlete_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ap record; v_plan record; v_model jsonb; v_start date;
  v_days_since int; v_mes int; v_week_in_month int; v_day_of_cycle int;
  v_meso jsonb; v_micro jsonb; v_days_arr jsonb; v_day jsonb;
  v_is_deload boolean; v_status text; v_groups jsonb; v_exercises jsonb;
  v_goal text; v_synth boolean := false; v_split jsonb;
BEGIN
  SELECT * INTO v_ap FROM public.athlete_periodizations
  WHERE athlete_id = p_athlete_id AND status IN ('active','in_progress')
  ORDER BY (model_snapshot IS NOT NULL) DESC, assigned_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','no_plan','message','Nenhuma periodização ativa atribuída.');
  END IF;

  v_start := v_ap.assigned_at::date;
  v_days_since := GREATEST(0, (p_date - v_start));
  v_mes := (v_days_since / 30) + 1;
  v_week_in_month := ((v_days_since % 30) / 7) + 1;
  IF v_week_in_month > 4 THEN v_week_in_month := 4; END IF;
  v_day_of_cycle := (v_days_since % 7) + 1;
  v_is_deload := (v_week_in_month = 4);

  IF v_ap.model_snapshot IS NOT NULL THEN
    v_model := v_ap.model_snapshot;
  ELSE
    v_synth := true;
    SELECT * INTO v_plan FROM public.periodization_annual_plans WHERE id = v_ap.annual_plan_id;
    v_goal := COALESCE(v_plan.annual_goal, 'hipertrofia');
    v_split := CASE
      WHEN v_goal ILIKE '%forca%' OR v_goal ILIKE '%força%' THEN
        '[{"dia":1,"tipo_dia":"Upper Força","status":"treino","grupos_musculares":["peito","costas","ombro"],"instrucao_app":"Treino de força superior."},
          {"dia":2,"tipo_dia":"Lower Força","status":"treino","grupos_musculares":["quadriceps","posterior_coxa","gluteo"],"instrucao_app":"Treino de força inferior."},
          {"dia":3,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso ativo."},
          {"dia":4,"tipo_dia":"Upper Volume","status":"treino","grupos_musculares":["peito","ombro","triceps","biceps"],"instrucao_app":"Volume superior."},
          {"dia":5,"tipo_dia":"Lower Volume","status":"treino","grupos_musculares":["quadriceps","gluteo","panturrilha","core"],"instrucao_app":"Volume inferior + core."},
          {"dia":6,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso."},
          {"dia":7,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso."}]'::jsonb
      ELSE
        '[{"dia":1,"tipo_dia":"A","status":"treino","grupos_musculares":["peito","ombro","triceps"],"instrucao_app":"Peito, ombro e tríceps."},
          {"dia":2,"tipo_dia":"B","status":"treino","grupos_musculares":["costas","biceps","antebraco"],"instrucao_app":"Costas e bíceps."},
          {"dia":3,"tipo_dia":"C","status":"treino","grupos_musculares":["quadriceps","posterior_coxa","gluteo","panturrilha","core"],"instrucao_app":"Pernas e core."},
          {"dia":4,"tipo_dia":"descanso","status":"folga","grupos_musculares":[],"instrucao_app":"Descanso ativo."},
          {"dia":5,"tipo_dia":"A","status":"treino","grupos_musculares":["peito","ombro","triceps"],"instrucao_app":"Peito, ombro e tríceps."},
          {"dia":6,"tipo_dia":"B","status":"treino","grupos_musculares":["costas","biceps","antebraco"],"instrucao_app":"Costas e bíceps."},
          {"dia":7,"tipo_dia":"C","status":"treino","grupos_musculares":["quadriceps","gluteo","panturrilha","core"],"instrucao_app":"Pernas e core."}]'::jsonb
      END;
    v_model := jsonb_build_object(
      'model_id', COALESCE(v_ap.periodization_model_id,'auto'),
      'nome', COALESCE(v_ap.periodization_model_id,'Plano anual'),
      'categoria', v_goal,
      'mesociclos', COALESCE(v_plan.mesocycles, '[]'::jsonb),
      'microciclo_padrao', jsonb_build_object('semanas_1_a_3', v_split, 'semana_4_deload', v_split));
  END IF;

  SELECT m INTO v_meso FROM jsonb_array_elements(v_model->'mesociclos') m
  WHERE COALESCE((m->>'mes')::int, 0) = v_mes LIMIT 1;
  IF v_meso IS NULL THEN
    SELECT m INTO v_meso FROM jsonb_array_elements(v_model->'mesociclos') m LIMIT 1;
  END IF;
  IF v_meso IS NULL THEN
    v_meso := jsonb_build_object('nome','Mesociclo padrão','series_por_grupo_semana','12-16',
      'faixa_reps','8-12','intensidade_percent_1rm','65-80','rpe_alvo','7-8',
      'frequencia_semanal_por_grupo','2','metodo_principal','séries retas','deload_reducao_volume','40-50%');
  END IF;

  v_micro := v_model->'microciclo_padrao';
  v_days_arr := CASE WHEN v_is_deload THEN v_micro->'semana_4_deload' ELSE v_micro->'semanas_1_a_3' END;
  IF v_days_arr IS NULL THEN v_days_arr := v_micro->'semanas_1_a_3'; END IF;

  SELECT d INTO v_day FROM jsonb_array_elements(v_days_arr) d
  WHERE (d->>'dia')::int = v_day_of_cycle LIMIT 1;

  IF v_day IS NULL THEN
    RETURN jsonb_build_object('status','no_session','date',p_date,'mes',v_mes,'semana',v_week_in_month,
      'dia',v_day_of_cycle,'message','Sem sessão definida para este dia.');
  END IF;

  v_status := v_day->>'status';
  v_groups := COALESCE(v_day->'grupos_musculares','[]'::jsonb);

  IF v_status <> 'treino' THEN
    RETURN jsonb_build_object('status','rest','date',p_date,'mes',v_mes,'semana',v_week_in_month,
      'dia',v_day_of_cycle,'day_type',v_day->>'tipo_dia','instructions',v_day->>'instrucao_app',
      'is_deload_week',v_is_deload,'synthetic',v_synth);
  END IF;

  v_exercises := public.find_exercises_for_groups(v_groups, CASE WHEN v_is_deload THEN 5 ELSE 7 END);

  RETURN jsonb_build_object(
    'status','workout','date',p_date,'mes',v_mes,'semana',v_week_in_month,'dia',v_day_of_cycle,
    'is_deload_week',v_is_deload,'synthetic',v_synth,
    'day_type', v_day->>'tipo_dia',
    'day_name', COALESCE(v_day->>'nome', v_day->>'tipo_dia'),
    'groups', v_groups,
    'instructions', v_day->>'instrucao_app',
    'prescription', jsonb_build_object(
      'series_por_grupo_semana', v_meso->>'series_por_grupo_semana',
      'faixa_reps', COALESCE(v_meso->>'faixa_reps', v_meso->>'reps_range'),
      'intensidade_percent_1rm', v_meso->>'intensidade_percent_1rm',
      'rpe_alvo', CASE WHEN v_is_deload THEN 'alvo -2 a -3' ELSE COALESCE(v_meso->>'rpe_alvo', v_meso->>'rpe_cap') END,
      'frequencia_semanal_por_grupo', v_meso->>'frequencia_semanal_por_grupo',
      'metodo_principal', v_meso->>'metodo_principal',
      'deload_reducao_volume', CASE WHEN v_is_deload THEN (v_meso->>'deload_reducao_volume') ELSE NULL END),
    'meso', jsonb_build_object('id', v_meso->>'id','nome', COALESCE(v_meso->>'nome','Mesociclo'),'mes', v_meso->>'mes'),
    'model', jsonb_build_object('id', v_model->>'model_id','nome', v_model->>'nome','categoria', v_model->>'categoria'),
    'exercises', v_exercises);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_workout_of_day(uuid, date) TO authenticated, anon, service_role;
;
