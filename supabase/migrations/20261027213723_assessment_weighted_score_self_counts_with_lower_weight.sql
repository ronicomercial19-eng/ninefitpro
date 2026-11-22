
-- Peso de cada avaliação no score: professor/oficial = 1.0; autoavaliação guiada = 0.4 (0.24 se estimada); resto = 0.
CREATE OR REPLACE FUNCTION public.fn_assessment_weight(p_row jsonb) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
 SELECT CASE
  WHEN coalesce((p_row->>'score_global')::numeric,0) <= 0 THEN 0::numeric
  WHEN public.fn_assessment_is_official(p_row) THEN 1.0::numeric
  WHEN coalesce(p_row->>'origem','') IN ('avaliacao_guiada','autoavaliacao') THEN
   CASE
    WHEN coalesce(nullif(p_row->>'peso','')::numeric,0) > 0
     AND greatest(coalesce(nullif(p_row->>'rm1_empurrar_superior','')::numeric,0),coalesce(nullif(p_row->>'rm1_empurrar_perna','')::numeric,0),coalesce(nullif(p_row->>'rm1_puxar_costas','')::numeric,0),coalesce(nullif(p_row->>'rm1_puxar_inferior','')::numeric,0)) > 4*nullif(p_row->>'peso','')::numeric
    THEN 0::numeric
    WHEN coalesce(p_row#>>'{dados_adicionais,confianca_score}','')='ESTIMADO' THEN 0.24::numeric
    ELSE 0.4::numeric
   END
  ELSE 0::numeric
 END
$$;
GRANT EXECUTE ON FUNCTION public.fn_assessment_weight(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_assessment_weight(jsonb) FROM anon;

-- Score ponderado: média das avaliações recentes com peso do tipo e decaimento por idade (meia-vida 60 dias).
CREATE OR REPLACE FUNCTION public.fn_assessment_weighted_score(p_athlete_id uuid, p_days integer DEFAULT 120) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb;
BEGIN
 IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object(
   'score', round(sum(x.score*x.eff)/nullif(sum(x.eff),0),1),
   'professor_count', count(*) FILTER (WHERE x.base=1),
   'self_count', count(*) FILTER (WHERE x.base>0 AND x.base<1),
   'professor_weight_share', round(coalesce(sum(x.eff) FILTER (WHERE x.base=1),0)/nullif(sum(x.eff),0),2),
   'window_days', p_days)
 INTO r
 FROM (
  SELECT a.score_global AS score, public.fn_assessment_weight(to_jsonb(a)) AS base,
         public.fn_assessment_weight(to_jsonb(a))*power(0.5,(current_date-a.data_avaliacao)/60.0) AS eff
  FROM public.avaliacoes_unificadas a
  WHERE a.athlete_id=p_athlete_id AND a.data_avaliacao>=current_date-p_days
 ) x WHERE x.base>0;
 RETURN coalesce(r, jsonb_build_object('score',NULL,'professor_count',0,'self_count',0,'professor_weight_share',NULL,'window_days',p_days));
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_assessment_weighted_score(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_assessment_weighted_score(uuid,integer) TO authenticated;

-- Hub passa a expor peso_score por avaliação (campo novo, não quebra clientes existentes).
DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.fn_get_assessment_hub(uuid)'::regprocedure) INTO v_def;
 IF strpos(v_def,'''oficial'',public.fn_assessment_is_official(to_jsonb(a))')=0 THEN RAISE EXCEPTION 'hub_anchor_missing'; END IF;
 v_def:=replace(v_def,'''oficial'',public.fn_assessment_is_official(to_jsonb(a))','''oficial'',public.fn_assessment_is_official(to_jsonb(a)),''peso_score'',public.fn_assessment_weight(to_jsonb(a))');
 EXECUTE v_def;
END $$;
;
