
CREATE OR REPLACE FUNCTION public.fn_sync_macro_rules_from_periodization(p_athlete_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_periodizacao RECORD;
  v_reps_min int;
  v_reps_max int;
  v_rpe numeric;
  v_goal_tag text;
  v_protocol RECORD;
  v_macro_id uuid;
  v_professor_id uuid;
BEGIN
  SELECT current_phase, rpe_cap, reps_range, sets_range, athlete_id
    INTO v_periodizacao
    FROM vw_athlete_periodizacao_ativa
   WHERE athlete_id = p_athlete_id;

  IF NOT FOUND OR v_periodizacao.rpe_cap IS NULL THEN
    RETURN NULL; -- sem periodização com parâmetros ainda (ex: mesociclos vazios na origem)
  END IF;

  v_rpe := NULLIF(v_periodizacao.rpe_cap, '')::numeric;
  v_reps_min := NULLIF(split_part(v_periodizacao.reps_range, '-', 1), '')::int;
  v_reps_max := NULLIF(split_part(v_periodizacao.reps_range, '-', 2), '')::int;
  IF v_reps_max IS NULL THEN v_reps_max := v_reps_min; END IF;

  -- Classifica o goal_tag a partir do reps_range real da periodização (não do nome da fase, que varia demais)
  v_goal_tag := CASE
    WHEN v_reps_max IS NULL THEN 'hipertrofia'
    WHEN v_reps_max <= 6 THEN 'forca'
    WHEN v_reps_max <= 15 THEN 'hipertrofia'
    ELSE 'cardio'
  END;

  SELECT * INTO v_protocol
    FROM smart_treino_protocols
   WHERE v_goal_tag = ANY(goal_tags)
   ORDER BY abs(COALESCE(NULLIF(split_part(rpe_range,'-',1),'')::numeric, 5) - COALESCE(v_rpe, 7))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL; -- nenhum protocolo cadastrado pra esse goal_tag ainda
  END IF;

  SELECT professor_id INTO v_professor_id
    FROM smart_treino_macro_rules
   WHERE aluno_id = p_athlete_id
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 1;

  UPDATE smart_treino_macro_rules
     SET status = 'archived', updated_at = now()
   WHERE aluno_id = p_athlete_id AND status = 'active';

  INSERT INTO smart_treino_macro_rules (
    aluno_id, professor_id, macro_number, macro_objetivo,
    reps_range, rpe_target, progression_type,
    protocol_code, pillar, protocol_name, variation_name, model_name,
    status, weekly_frequency
  ) VALUES (
    p_athlete_id, v_professor_id, 1,
    COALESCE(v_periodizacao.current_phase, 'Periodização') || ' — ' || v_protocol.protocol_name,
    v_periodizacao.reps_range, v_rpe, 'technique_first',
    v_protocol.id, v_protocol.pillar, v_protocol.protocol_name, v_protocol.variation_name, v_protocol.model_description,
    'active', 4
  )
  RETURNING id INTO v_macro_id;

  RETURN v_macro_id;
END;
$function$;
;
