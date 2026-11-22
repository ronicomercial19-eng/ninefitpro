-- Ficha dinâmica do aluno (fase 1, aditiva: não altera athlete_pdi_history nem o PDIWizard).
-- 1 linha por atleta (jsonb por seção) + contadores de preferência com cardinalidade limitada.
CREATE TABLE IF NOT EXISTS public.athlete_profile_sheet (
  athlete_id uuid PRIMARY KEY REFERENCES public.athletes(id) ON DELETE CASCADE,
  sheet jsonb NOT NULL DEFAULT '{}'::jsonb,
  completeness smallint NOT NULL DEFAULT 0 CHECK (completeness BETWEEN 0 AND 100),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.athlete_preference_counters (
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  n integer NOT NULL DEFAULT 1,
  last_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (athlete_id, key, value)
);

ALTER TABLE public.athlete_profile_sheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_preference_counters ENABLE ROW LEVEL SECURITY;

-- leitura direta só do dono/coach; escrita somente pelas RPCs (security definer)
CREATE POLICY sheet_select_own ON public.athlete_profile_sheet FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND (a.user_id = auth.uid() OR a.coach_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = athlete_profile_sheet.athlete_id AND l.user_id = auth.uid())
);
CREATE POLICY prefs_select_own ON public.athlete_preference_counters FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = athlete_id AND (a.user_id = auth.uid() OR a.coach_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = athlete_preference_counters.athlete_id AND l.user_id = auth.uid())
);
REVOKE ALL ON public.athlete_profile_sheet, public.athlete_preference_counters FROM anon, authenticated;
GRANT SELECT ON public.athlete_profile_sheet, public.athlete_preference_counters TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_sheet_assert(p_athlete_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF auth.uid() IS NULL OR (
    NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (a.user_id = auth.uid() OR a.coach_id = auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = p_athlete_id AND l.user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE = '42501';
  END IF;
END; $function$;

-- Leitura única: ficha + top 3 preferências por chave (1 round-trip; o app faz cache).
CREATE OR REPLACE FUNCTION public.fn_sheet_get(p_athlete_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_sheet record; v_prefs jsonb;
BEGIN
  PERFORM public.fn_sheet_assert(p_athlete_id);
  SELECT * INTO v_sheet FROM public.athlete_profile_sheet WHERE athlete_id = p_athlete_id;
  SELECT coalesce(jsonb_object_agg(k, vals), '{}'::jsonb) INTO v_prefs FROM (
    SELECT key AS k, jsonb_agg(jsonb_build_object('value', value, 'n', n) ORDER BY n DESC) AS vals FROM (
      SELECT key, value, n, row_number() OVER (PARTITION BY key ORDER BY n DESC, last_at DESC) rn
      FROM public.athlete_preference_counters WHERE athlete_id = p_athlete_id
    ) t WHERE rn <= 3 GROUP BY key
  ) s;
  RETURN jsonb_build_object(
    'sheet', coalesce(v_sheet.sheet, '{}'::jsonb),
    'completeness', coalesce(v_sheet.completeness, 0),
    'version', coalesce(v_sheet.version, 0),
    'preferences', v_prefs
  );
END; $function$;

-- Escrita por seção (merge raso), seções e tamanho limitados; recalcula completude (6 campos-núcleo).
CREATE OR REPLACE FUNCTION public.fn_sheet_patch(p_athlete_id uuid, p_section text, p_patch jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_sheet jsonb; v_done int; v_comp int;
BEGIN
  PERFORM public.fn_sheet_assert(p_athlete_id);
  IF p_section NOT IN ('ativacao','objetivo','saude','rotina','preferencias_declaradas') THEN
    RAISE EXCEPTION 'secao_invalida';
  END IF;
  IF jsonb_typeof(p_patch) <> 'object' OR length(p_patch::text) > 4000 THEN
    RAISE EXCEPTION 'patch_invalido';
  END IF;
  INSERT INTO public.athlete_profile_sheet (athlete_id, sheet)
  VALUES (p_athlete_id, jsonb_build_object(p_section, p_patch))
  ON CONFLICT (athlete_id) DO UPDATE
    SET sheet = jsonb_set(athlete_profile_sheet.sheet, ARRAY[p_section],
                  coalesce(athlete_profile_sheet.sheet -> p_section, '{}'::jsonb) || p_patch, true),
        version = athlete_profile_sheet.version + 1,
        updated_at = now()
  RETURNING sheet INTO v_sheet;
  v_done := (CASE WHEN nullif(v_sheet #>> '{objetivo,principal}', '') IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN nullif(v_sheet #>> '{ativacao,nivel}', '') IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN v_sheet #> '{saude,restricoes}' IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN v_sheet #> '{rotina,dias_semana}' IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN nullif(v_sheet #>> '{rotina,local}', '') IS NOT NULL THEN 1 ELSE 0 END)
          + (CASE WHEN nullif(v_sheet #>> '{rotina,horario}', '') IS NOT NULL THEN 1 ELSE 0 END);
  v_comp := round(v_done * 100.0 / 6);
  UPDATE public.athlete_profile_sheet SET completeness = v_comp WHERE athlete_id = p_athlete_id;
  RETURN jsonb_build_object('completeness', v_comp, 'version', (SELECT version FROM public.athlete_profile_sheet WHERE athlete_id = p_athlete_id));
END; $function$;

-- Preferência por uso: upsert em contador (cardinalidade limitada por chave/valor).
CREATE OR REPLACE FUNCTION public.fn_pref_bump(p_athlete_id uuid, p_key text, p_value text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.fn_sheet_assert(p_athlete_id);
  IF p_key NOT IN ('horario_treino','tipo_treino','canal_share','duracao','local','exercicio_favorito') THEN
    RAISE EXCEPTION 'chave_invalida';
  END IF;
  IF p_value IS NULL OR length(p_value) = 0 OR length(p_value) > 60 THEN
    RAISE EXCEPTION 'valor_invalido';
  END IF;
  INSERT INTO public.athlete_preference_counters (athlete_id, key, value) VALUES (p_athlete_id, p_key, p_value)
  ON CONFLICT (athlete_id, key, value) DO UPDATE SET n = athlete_preference_counters.n + 1, last_at = now();
END; $function$;

REVOKE ALL ON FUNCTION public.fn_sheet_assert(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_sheet_get(uuid), public.fn_sheet_patch(uuid, text, jsonb), public.fn_pref_bump(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_sheet_get(uuid), public.fn_sheet_patch(uuid, text, jsonb), public.fn_pref_bump(uuid, text, text) TO authenticated;

-- Backfill sem perda: o PDI legado mais recente de cada atleta entra na seção legado_pdi.
INSERT INTO public.athlete_profile_sheet (athlete_id, sheet)
SELECT DISTINCT ON (h.athlete_id) h.athlete_id, jsonb_build_object('legado_pdi', h.pdi_data)
FROM public.athlete_pdi_history h
ORDER BY h.athlete_id, h.created_at DESC
ON CONFLICT (athlete_id) DO NOTHING;
