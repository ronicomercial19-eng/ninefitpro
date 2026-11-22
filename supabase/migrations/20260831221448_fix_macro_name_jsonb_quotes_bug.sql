-- Bug adicional achado na inspeção do teste m30: v_macro_name usava `->` (retorna jsonb,
-- mantendo aspas literais no texto, ex: '"Ano 1 - Base geral"') em vez de `->>` (retorna
-- texto puro). Afetava o nome de TODOS os macrociclos gerados por esta função até agora.
create or replace function public.fn_generate_plan_from_bank_model(p_athlete_id uuid, p_model_id text, p_coach_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_model RECORD;
  v_total_weeks int;
  v_n_macros int;
  v_macros jsonb := '[]'::jsonb;
  v_mesos jsonb := '[]'::jsonb;
  v_macro_name text;
  v_macro_weeks int;
  i int;
  j int;
  v_stage_names text[] := ARRAY['Estímulo','Progressão','Intensificação','Deload'];
  v_rpe_base numeric;
  v_reps_pattern jsonb;
  v_new_plan_id uuid;
BEGIN
  SELECT * INTO v_model FROM periodization_models WHERE id = p_model_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo % não encontrado no banco', p_model_id;
  END IF;

  IF jsonb_typeof(v_model.macrocycle) != 'array' OR jsonb_array_length(v_model.macrocycle) = 0 THEN
    RAISE EXCEPTION 'Modelo "%" ainda não tem macrociclos definidos no banco (conteúdo incompleto)', v_model.title;
  END IF;

  v_total_weeks := CASE v_model.duration
    WHEN '3m' THEN 12
    WHEN '6m' THEN 24
    WHEN '12m' THEN 48
    WHEN '18m' THEN 72
    WHEN '24m' THEN 96
    ELSE 24
  END;
  v_n_macros := jsonb_array_length(v_model.macrocycle);

  v_reps_pattern := CASE lower(v_model.goal)
    WHEN 'performance' THEN '["15-20","10-12","6-8","10"]'::jsonb
    WHEN 'emagrecimento' THEN '["12-15","10-12","8-10","12"]'::jsonb
    ELSE '["10-12","8-10","6-8","10"]'::jsonb -- hipertrofia default
  END;

  FOR i IN 1..v_n_macros LOOP
    v_macro_name := v_model.macrocycle ->> (i-1);
    v_macro_weeks := GREATEST(v_total_weeks / v_n_macros, 4);
    v_rpe_base := LEAST(5 + i, 9);

    v_macros := v_macros || jsonb_build_array(jsonb_build_object(
      'name', v_macro_name, 'weeks', v_macro_weeks, 'source', 'bank:' || p_model_id
    ));

    FOR j IN 1..4 LOOP
      v_mesos := v_mesos || jsonb_build_array(jsonb_build_object(
        'name', v_macro_name || ' — ' || v_stage_names[j],
        'phase', lower(v_model.goal),
        'weeks', GREATEST(v_macro_weeks / 4, 1),
        'rpe_cap', CASE WHEN j = 4 THEN GREATEST(v_rpe_base - 3, 5) ELSE LEAST(v_rpe_base + j - 1, 9) END,
        'reps_range', v_reps_pattern -> (j-1),
        'sets_range', CASE WHEN j = 4 THEN '2-3' ELSE '3-4' END
      ));
    END LOOP;
  END LOOP;

  UPDATE periodization_annual_plans
     SET status = 'archived', updated_at = now()
   WHERE athlete_id = p_athlete_id AND status = 'active';

  INSERT INTO periodization_annual_plans (
    athlete_id, coach_id, annual_goal, macrocycles, mesocycles,
    master_rules, selected_model_id, status, scores, dominant_profile
  ) VALUES (
    p_athlete_id, p_coach_id, v_model.goal, v_macros, v_mesos,
    jsonb_build_object('volume','moderate','intensity','moderate','recovery','auto','deload_every',4,'origem','banco_oficial'),
    v_model.title, 'active', jsonb_build_object(), jsonb_build_object('name', v_model.recommended_for)
  )
  RETURNING id INTO v_new_plan_id;

  PERFORM sync_fitpro_planejamento(p_athlete_id, 'banco_oficial');

  RETURN v_new_plan_id;
END;
$function$;;
