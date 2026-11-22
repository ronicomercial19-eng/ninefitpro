CREATE OR REPLACE FUNCTION public.fn_generate_waves_from_periodization(p_periodization_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_student_id uuid;
  v_onda jsonb;
  v_order int := 0;
  v_status text;
  v_has_current boolean := false;
BEGIN
  SELECT fitpro_student_id INTO v_student_id
  FROM fitpro_smartperiodizer_periodizations
  WHERE id = p_periodization_id;

  -- limpa ondas antigas dessa periodização (idempotente, permite regenerar)
  DELETE FROM fitpro_smartperiodizer_waves
  WHERE smartperiodizer_periodization_id = p_periodization_id;

  FOR v_onda IN
    SELECT jsonb_array_elements(payload->'ondas')
    FROM fitpro_smartperiodizer_periodizations
    WHERE id = p_periodization_id
  LOOP
    v_order := v_order + 1;

    -- respeita o status já gravado no payload (in_progress/pending/completed);
    -- só cai no fallback "primeira onda = current" se o payload não tiver status nenhum
    v_status := CASE
      WHEN v_onda->>'status' IN ('in_progress', 'current') THEN 'current'
      WHEN v_onda->>'status' = 'completed' THEN 'completed'
      WHEN v_onda->>'status' IS NOT NULL THEN 'upcoming'
      WHEN v_order = 1 THEN 'current'
      ELSE 'upcoming'
    END;

    IF v_status = 'current' THEN v_has_current := true; END IF;

    INSERT INTO fitpro_smartperiodizer_waves
      (smartperiodizer_periodization_id, fitpro_student_id, wave_order,
       wave_name, wave_label, focus, duration_weeks, status, started_at)
    VALUES (
      p_periodization_id, v_student_id, v_order,
      'Onda ' || v_order,
      COALESCE(v_onda->>'nome', 'Onda ' || v_order),
      v_onda->>'phase',
      (v_onda->>'weeks')::int,
      v_status,
      CASE WHEN v_status = 'current' THEN now() ELSE NULL END
    );
  END LOOP;

  -- se nenhuma onda tinha status utilizável e o loop rodou, garante que a primeira vira current
  IF v_order > 0 AND NOT v_has_current THEN
    UPDATE fitpro_smartperiodizer_waves
    SET status = 'current', started_at = now()
    WHERE smartperiodizer_periodization_id = p_periodization_id AND wave_order = 1;
  END IF;
END;
$function$;;
