
CREATE OR REPLACE FUNCTION public.ensure_plano_treino_gerado(p_assignment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment RECORD;
  v_plano_id uuid;
  v_nome text;
  v_objetivo text;
  v_nivel text;
  v_duracao int;
  v_completo jsonb;
BEGIN
  SELECT ap.*, pap.annual_goal, pap.macrocycles, pap.mesocycles, pap.micro_rules,
         pap.output_json, pap.dominant_profile, pap.scores
    INTO v_assignment
    FROM public.athlete_periodizations ap
    LEFT JOIN public.periodization_annual_plans pap ON pap.id = ap.annual_plan_id
   WHERE ap.id = p_assignment_id;

  IF NOT FOUND OR v_assignment.athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_objetivo := COALESCE(v_assignment.annual_goal, 'geral');
  v_nivel    := COALESCE(
                  CASE jsonb_typeof(v_assignment.dominant_profile)
                    WHEN 'string' THEN v_assignment.dominant_profile #>> '{}'
                    WHEN 'object' THEN v_assignment.dominant_profile ->> 'name'
                    ELSE NULL
                  END,
                  'intermediario'
                );
  v_duracao  := GREATEST(COALESCE(jsonb_array_length(COALESCE(v_assignment.macrocycles, '[]'::jsonb)), 1) * 4, 4);
  v_nome     := 'Plano ' || COALESCE(v_assignment.periodization_model_id, 'auto') || ' — ' || to_char(now(), 'MM/YYYY');
  v_completo := jsonb_build_object(
    'assignment_id',   v_assignment.id,
    'annual_plan_id',  v_assignment.annual_plan_id,
    'model_id',        v_assignment.periodization_model_id,
    'goal',            v_objetivo,
    'profile',         v_nivel,
    'macrocycles',     COALESCE(v_assignment.macrocycles, '[]'::jsonb),
    'mesocycles',      COALESCE(v_assignment.mesocycles,  '[]'::jsonb),
    'micro_rules',     COALESCE(v_assignment.micro_rules, '{}'::jsonb),
    'output',          COALESCE(v_assignment.output_json, '{}'::jsonb),
    'scores',          COALESCE(v_assignment.scores,      '{}'::jsonb),
    'generated_at',    now()
  );

  SELECT id INTO v_plano_id
    FROM public.planos_de_treino_gerados
   WHERE athlete_id = v_assignment.athlete_id
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_plano_id IS NULL THEN
    INSERT INTO public.planos_de_treino_gerados (
      athlete_id, professor_id,
      nome_plano, objetivo, nivel, duracao_semanas,
      plano_completo, status, updated_at
    ) VALUES (
      v_assignment.athlete_id, v_assignment.assigned_by,
      v_nome, v_objetivo, v_nivel, v_duracao,
      v_completo, 'ativo', now()
    )
    RETURNING id INTO v_plano_id;
  ELSE
    UPDATE public.planos_de_treino_gerados
       SET nome_plano = v_nome,
           objetivo = v_objetivo,
           nivel = v_nivel,
           duracao_semanas = v_duracao,
           plano_completo = v_completo,
           professor_id = COALESCE(v_assignment.assigned_by, professor_id),
           status = 'ativo',
           updated_at = now()
     WHERE id = v_plano_id;
  END IF;

  RETURN v_plano_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_ensure_plano_treino_gerado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('in_progress','active') THEN
    BEGIN
      PERFORM public.ensure_plano_treino_gerado(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'ensure_plano_treino_gerado failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS athlete_periodizations_ensure_plano ON public.athlete_periodizations;
CREATE TRIGGER athlete_periodizations_ensure_plano
AFTER INSERT OR UPDATE OF status, annual_plan_id, periodization_model_id
ON public.athlete_periodizations
FOR EACH ROW EXECUTE FUNCTION public.trg_ensure_plano_treino_gerado();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT ap.id
      FROM public.athlete_periodizations ap
     WHERE ap.status IN ('in_progress','active')
       AND NOT EXISTS (SELECT 1 FROM public.planos_de_treino_gerados p WHERE p.athlete_id = ap.athlete_id)
  LOOP
    PERFORM public.ensure_plano_treino_gerado(r.id);
  END LOOP;
END $$;

DO $$
DECLARE v RECORD; v_assign uuid;
BEGIN
  FOR v IN SELECT athlete_id, plan_id FROM public.vw_athlete_periodizacao_ativa WHERE status='active' LOOP
    SELECT id INTO v_assign FROM public.athlete_periodizations
      WHERE athlete_id = v.athlete_id AND (annual_plan_id = v.plan_id OR annual_plan_id IS NULL)
      ORDER BY created_at DESC LIMIT 1;
    IF v_assign IS NULL THEN
      INSERT INTO public.athlete_periodizations (athlete_id, periodization_model_id, annual_plan_id, status, match_percentage, assigned_at)
      VALUES (v.athlete_id, 'auto-generated', v.plan_id, 'in_progress', 80, now())
      RETURNING id INTO v_assign;
    END IF;
    PERFORM public.ensure_plano_treino_gerado(v_assign);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.ensure_plano_treino_gerado(uuid) TO authenticated, service_role;
;
