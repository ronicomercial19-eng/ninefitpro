
CREATE OR REPLACE FUNCTION public.fn_resolver_macro_ausente(p_athlete_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $f$
DECLARE
  v_ap RECORD;
  v_plan RECORD;
  v_pillar text;
  v_freq int;
  v_proto text;
  v_macro int;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);

  IF EXISTS (SELECT 1 FROM public.smart_treino_macro_rules WHERE aluno_id = p_athlete_id AND status = 'active') THEN
    RETURN 'ja_tem_macro';
  END IF;

  SELECT * INTO v_ap FROM public.athlete_periodizations
    WHERE athlete_id = p_athlete_id AND status IN ('active','in_progress')
    ORDER BY assigned_at DESC NULLS LAST LIMIT 1;
  IF v_ap IS NULL THEN
    RETURN 'sem_periodizacao';
  END IF;

  IF v_ap.annual_plan_id IS NOT NULL THEN
    SELECT * INTO v_plan FROM public.periodization_annual_plans WHERE id = v_ap.annual_plan_id;
    IF v_plan IS NOT NULL THEN
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
      IF v_proto IS NOT NULL THEN
        SELECT COALESCE(MAX(m.macro_number),0) + 1 INTO v_macro FROM public.smart_treino_macro_rules m WHERE m.aluno_id = p_athlete_id;
        INSERT INTO public.smart_treino_macro_rules
          (aluno_id, professor_id, macro_number, protocol_code, pillar, protocol_name, variation_name, model_name, weekly_frequency, status)
        SELECT p_athlete_id, v_ap.assigned_by, v_macro, p.id, p.pillar, p.protocol_name, p.variation_name,
               COALESCE(v_plan.selected_model_id, p.model_description), v_freq, 'active'
          FROM public.smart_treino_protocols p WHERE p.id = v_proto;
        RETURN 'resolvido_via_plano_anual';
      END IF;
    END IF;
  END IF;

  SELECT (public.fn_sugerir_protocolo_por_perfil(p_athlete_id)->>'pillar') INTO v_pillar;
  IF v_pillar IS NOT NULL THEN
    SELECT p.id INTO v_proto FROM public.smart_treino_protocols p
      WHERE p.pillar = v_pillar
        AND COALESCE((p.block_9_template->>'requires_approval')::boolean, false) = false
        AND public.fn_protocol_strength_compatible(p.id)
      ORDER BY random() LIMIT 1;
    IF v_proto IS NOT NULL THEN
      SELECT COALESCE(MAX(m.macro_number),0) + 1 INTO v_macro FROM public.smart_treino_macro_rules m WHERE m.aluno_id = p_athlete_id;
      INSERT INTO public.smart_treino_macro_rules
        (aluno_id, professor_id, macro_number, protocol_code, pillar, protocol_name, variation_name, model_name, weekly_frequency, status)
      SELECT p_athlete_id, v_ap.assigned_by, v_macro, p.id, p.pillar, p.protocol_name, p.variation_name, p.model_description, 4, 'active'
        FROM public.smart_treino_protocols p WHERE p.id = v_proto;
      RETURN 'resolvido_via_sugestao_perfil';
    END IF;
  END IF;

  RETURN 'sem_fonte_disponivel';
END $f$;
REVOKE EXECUTE ON FUNCTION public.fn_resolver_macro_ausente(uuid) FROM anon;

CREATE OR REPLACE FUNCTION pg_temp.patch_fn(p_name text, p_old text, p_new text) RETURNS int
LANGUAGE plpgsql AS $p$
DECLARE r record; d text; occ int; cnt int := 0;
BEGIN
  FOR r IN SELECT p.oid, pg_get_functiondef(p.oid) AS def FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND p.proname = p_name LOOP
    d := r.def;
    occ := (length(d) - length(replace(d, p_old, ''))) / length(p_old);
    IF occ = 1 THEN
      EXECUTE replace(d, p_old, p_new);
      cnt := cnt + 1;
    ELSIF occ > 1 THEN
      RAISE EXCEPTION 'marcador ambiguo em %', p_name;
    END IF;
  END LOOP;
  RETURN cnt;
END $p$;

DO $do$
BEGIN
  IF pg_temp.patch_fn('fn_generate_periodized_week',
    E'  PERFORM public.fn_ativar_periodizacao_basica(p_athlete_id);',
    E'  PERFORM public.fn_ativar_periodizacao_basica(p_athlete_id);\n  PERFORM public.fn_resolver_macro_ausente(p_athlete_id);') <> 1 THEN
    RAISE EXCEPTION 'patch fn_generate_periodized_week (cascata macro) falhou';
  END IF;
END $do$;
;
