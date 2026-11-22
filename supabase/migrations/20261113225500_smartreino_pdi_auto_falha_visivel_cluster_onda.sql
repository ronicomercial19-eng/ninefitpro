
CREATE TABLE IF NOT EXISTS public.training_generation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  workout_date date,
  origin text NOT NULL,
  sqlstate_code text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_generation_failures_athlete_idx
  ON public.training_generation_failures (athlete_id, created_at DESC);
ALTER TABLE public.training_generation_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_generation_failures FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_registrar_falha_geracao(p_athlete_id uuid, p_date date, p_origin text, p_sqlstate text, p_detail text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
BEGIN
  INSERT INTO public.training_generation_failures (athlete_id, workout_date, origin, sqlstate_code, detail)
  VALUES (p_athlete_id, p_date, p_origin, p_sqlstate, left(coalesce(p_detail,''), 500));
END $f$;
REVOKE EXECUTE ON FUNCTION public.fn_registrar_falha_geracao(uuid, date, text, text, text) FROM anon;

CREATE OR REPLACE FUNCTION public.fn_falhas_geracao_treino(p_athlete_id uuid, p_limit int DEFAULT 20)
RETURNS SETOF public.training_generation_failures LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
BEGIN
  PERFORM private.fitpro_require_current_access();
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  RETURN QUERY SELECT f.* FROM public.training_generation_failures f
    WHERE f.athlete_id = p_athlete_id ORDER BY f.created_at DESC LIMIT p_limit;
END $f$;
REVOKE EXECUTE ON FUNCTION public.fn_falhas_geracao_treino(uuid, int) FROM anon;

CREATE OR REPLACE FUNCTION public.fn_ativar_periodizacao_basica(p_athlete_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $f$
DECLARE
  v_coach uuid;
  v_pillar text;
  v_proto text;
  v_macro int;
BEGIN
  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
  IF EXISTS (SELECT 1 FROM public.athlete_periodizations ap
             WHERE ap.athlete_id = p_athlete_id AND ap.status IN ('active','in_progress')) THEN
    RETURN 'ja_ativa';
  END IF;
  SELECT a.coach_id INTO v_coach FROM public.athletes a WHERE a.id = p_athlete_id;
  IF v_coach IS NULL THEN RETURN 'sem_coach'; END IF;
  SELECT (public.fn_sugerir_protocolo_por_perfil(p_athlete_id)->>'pillar') INTO v_pillar;
  IF v_pillar IS NULL THEN RETURN 'sem_sugestao'; END IF;
  SELECT p.id INTO v_proto FROM public.smart_treino_protocols p
    WHERE p.pillar = v_pillar
      AND COALESCE((p.block_9_template->>'requires_approval')::boolean, false) = false
      AND public.fn_protocol_strength_compatible(p.id)
    ORDER BY random() LIMIT 1;
  IF v_proto IS NULL THEN RETURN 'sem_protocolo_compativel'; END IF;

  SELECT COALESCE(MAX(m.macro_number),0) + 1 INTO v_macro
    FROM public.smart_treino_macro_rules m WHERE m.aluno_id = p_athlete_id;
  INSERT INTO public.smart_treino_macro_rules
    (aluno_id, professor_id, macro_number, protocol_code, pillar, protocol_name, variation_name, model_name, weekly_frequency, status)
  SELECT p_athlete_id, v_coach, v_macro, p.id, p.pillar, p.protocol_name, p.variation_name, p.model_description, 4, 'active'
    FROM public.smart_treino_protocols p WHERE p.id = v_proto;

  IF EXISTS (SELECT 1 FROM public.athlete_periodizations WHERE athlete_id = p_athlete_id AND status = 'pending') THEN
    UPDATE public.athlete_periodizations
       SET status = 'in_progress', periodization_model_id = 'basico_auto', assigned_at = now(),
           notes = 'Ativado automaticamente: protocolo sugerido por perfil'
     WHERE athlete_id = p_athlete_id AND status = 'pending';
  ELSE
    INSERT INTO public.athlete_periodizations (athlete_id, periodization_model_id, status, notes)
    VALUES (p_athlete_id, 'basico_auto', 'in_progress', 'Ativado automaticamente: protocolo sugerido por perfil');
  END IF;
  RETURN 'ativada';
END $f$;
REVOKE EXECUTE ON FUNCTION public.fn_ativar_periodizacao_basica(uuid) FROM anon;

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
    E'  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || '':periodized-week:'' || v_week_start::text, 0));',
    E'  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || '':periodized-week:'' || v_week_start::text, 0));\n  PERFORM public.fn_ativar_periodizacao_basica(p_athlete_id);') <> 1 THEN
    RAISE EXCEPTION 'patch fn_generate_periodized_week (lock) falhou';
  END IF;
  IF pg_temp.patch_fn('fn_generate_periodized_week',
    'reason'',coalesce(v_result->>''motivo'',''unknown'')));',
    'reason'',coalesce(v_result->>''motivo'',''unknown'')));' || E'\n        PERFORM public.fn_registrar_falha_geracao(p_athlete_id, v_date, ''periodized_week'', NULL, coalesce(v_result->>''motivo'',''unknown''));') <> 1 THEN
    RAISE EXCEPTION 'patch fn_generate_periodized_week (review) falhou';
  END IF;
  IF pg_temp.patch_fn('fn_generate_periodized_week',
    'reason'',SQLSTATE));',
    'reason'',SQLSTATE));' || E'\n      PERFORM public.fn_registrar_falha_geracao(p_athlete_id, v_date, ''periodized_week'', SQLSTATE, SQLERRM);') <> 1 THEN
    RAISE EXCEPTION 'patch fn_generate_periodized_week (exception) falhou';
  END IF;
  IF pg_temp.patch_fn('fn_get_week_workouts',
    E'    EXCEPTION WHEN OTHERS THEN\n      NULL;',
    E'    EXCEPTION WHEN OTHERS THEN\n      PERFORM public.fn_registrar_falha_geracao(p_athlete_id, v_week_start, ''lazy_week'', SQLSTATE, SQLERRM);') <> 1 THEN
    RAISE EXCEPTION 'patch fn_get_week_workouts falhou';
  END IF;
  IF pg_temp.patch_fn('prescrever_treino',
    'WHERE protocol_id = (v_foco_dia->>''protocol_sugerido'')::int',
    'WHERE protocol_id = (v_foco_dia->>''protocol_sugerido'')::int AND public.fn_protocol_strength_compatible(id::text)') <> 1 THEN
    RAISE EXCEPTION 'patch prescrever_treino (onda) falhou';
  END IF;
END $do$;
;
