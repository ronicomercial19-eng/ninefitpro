CREATE OR REPLACE FUNCTION public.fn_densificacao_marcar_exercicio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_athlete uuid;
  v_date date;
  v_metodo text;
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_densificacao_marcar ON public.workout_exercises;
CREATE TRIGGER trg_densificacao_marcar
  BEFORE INSERT ON public.workout_exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_densificacao_marcar_exercicio();;
