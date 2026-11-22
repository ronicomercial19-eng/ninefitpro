CREATE OR REPLACE FUNCTION public.fn_densificacao_marcar_exercicio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_athlete uuid;
  v_date date;
  v_metodo text;
  v_nivel_raw text;
  v_nivel text;
  v_param record;
BEGIN
  IF NEW.observations->>'bloco' IS DISTINCT FROM 'bloco9' THEN
    RETURN NEW;
  END IF;

  SELECT d.athlete_id, d.workout_date INTO v_athlete, v_date
  FROM public.daily_workouts d
  WHERE d.id = NEW.daily_workout_id;

  IF v_athlete IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pm.metodo_codigo INTO v_metodo
  FROM public.prescricao_metodo pm
  WHERE pm.athlete_id = v_athlete
    AND pm.workout_date = v_date
    AND pm.escopo = 'treino'
  ORDER BY pm.created_at DESC
  LIMIT 1;

  IF v_metodo IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.selection_rationale := COALESCE(NEW.selection_rationale, '{}'::jsonb)
    || jsonb_build_object('densificacao', v_metodo);

  SELECT a.experience_level INTO v_nivel_raw
  FROM public.athletes a
  WHERE a.id = v_athlete;

  v_nivel := CASE translate(lower(coalesce(v_nivel_raw,'')), 'áàâãéêíóôõúç', 'aaaaeeiooouc')
    WHEN 'iniciante' THEN 'iniciante'
    WHEN 'intermediario' THEN 'intermediario'
    WHEN 'avancado' THEN 'avancado'
    ELSE NULL
  END;

  IF v_nivel IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.series_min, p.series_max, p.descanso_intra_seg_min, p.descanso_intra_seg_max,
         p.descanso_pos_seg, p.limite_por_sessao
  INTO v_param
  FROM public.densificacao_parametros p
  WHERE p.metodo_codigo = v_metodo AND p.nivel = v_nivel;

  IF v_param IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.sets := v_param.series_min;
  NEW.rest_seconds := v_param.descanso_pos_seg;
  NEW.selection_rationale := NEW.selection_rationale || jsonb_build_object(
    'densificacao_parametros', jsonb_build_object(
      'nivel', v_nivel,
      'series_min', v_param.series_min,
      'series_max', v_param.series_max,
      'descanso_intra_seg', jsonb_build_array(v_param.descanso_intra_seg_min, v_param.descanso_intra_seg_max),
      'descanso_pos_seg', v_param.descanso_pos_seg,
      'limite_por_sessao', v_param.limite_por_sessao
    )
  );
  RETURN NEW;
END;
$$;;
