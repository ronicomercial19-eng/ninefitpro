
CREATE OR REPLACE FUNCTION public.fn_materializar_annual_plan_do_catalogo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_plan RECORD;
  v_pillar text;
  v_freq int;
  v_proto text;
  v_macro int;
BEGIN
  -- So atua quando a periodizacao ja esta em uso e ainda nao tem macro
  IF NEW.status NOT IN ('active','in_progress') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.smart_treino_macro_rules WHERE aluno_id = NEW.athlete_id AND status = 'active') THEN
    RETURN NEW;
  END IF;
  IF NEW.annual_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_plan FROM public.periodization_annual_plans WHERE id = NEW.annual_plan_id;
  IF v_plan IS NULL THEN
    RETURN NEW;
  END IF;

  v_pillar := CASE lower(coalesce(v_plan.annual_goal, ''))
    WHEN 'hipertrofia' THEN 'estrutural'
    WHEN 'performance' THEN 'estrutural'
    WHEN 'bem-estar' THEN 'longevidade'
    WHEN 'reabilitacao' THEN 'longevidade'
    ELSE 'estrutural'
  END;

  v_freq := GREATEST(1, LEAST(7, COALESCE(jsonb_array_length(v_plan.micro_rules->'weekly_split'->'dias'), 4)));

  SELECT p.id INTO v_proto FROM public.smart_treino_protocols p
    WHERE p.pillar = v_pillar
      AND COALESCE((p.block_9_template->>'requires_approval')::boolean, false) = false
      AND public.fn_protocol_strength_compatible(p.id)
    ORDER BY random() LIMIT 1;

  IF v_proto IS NULL THEN
    RAISE LOG 'fn_materializar_annual_plan_do_catalogo: nenhum protocolo compativel para pilar % (athlete_id=%)', v_pillar, NEW.athlete_id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(m.macro_number),0) + 1 INTO v_macro
    FROM public.smart_treino_macro_rules m WHERE m.aluno_id = NEW.athlete_id;

  INSERT INTO public.smart_treino_macro_rules
    (aluno_id, professor_id, macro_number, protocol_code, pillar, protocol_name, variation_name, model_name, weekly_frequency, status)
  SELECT NEW.athlete_id, NEW.assigned_by, v_macro, p.id, p.pillar, p.protocol_name, p.variation_name,
         COALESCE(v_plan.selected_model_id, p.model_description), v_freq, 'active'
    FROM public.smart_treino_protocols p WHERE p.id = v_proto;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'fn_materializar_annual_plan_do_catalogo error: % % (athlete_id=%)', SQLERRM, SQLSTATE, NEW.athlete_id;
  RETURN NEW;
END $f$;
;
