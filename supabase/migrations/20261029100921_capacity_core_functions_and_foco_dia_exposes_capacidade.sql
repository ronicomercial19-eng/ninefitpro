
-- 1) Núcleo do score ponderado (sem checagem de auth; só uso interno).
CREATE OR REPLACE FUNCTION public.fn_assessment_weighted_score_core(p_athlete_id uuid, p_days integer DEFAULT 120) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; v_master date;
BEGIN
 SELECT max(a.data_avaliacao) INTO v_master FROM public.avaliacoes_unificadas a
  WHERE a.athlete_id=p_athlete_id AND public.fn_assessment_weight(to_jsonb(a))=1;
 SELECT jsonb_build_object(
   'score', round(sum(x.score*x.eff)/nullif(sum(x.eff),0),1),
   'professor_count', count(*) FILTER (WHERE x.base=1),
   'self_count', count(*) FILTER (WHERE x.base>0 AND x.base<1),
   'professor_weight_share', round(coalesce(sum(x.eff) FILTER (WHERE x.base=1),0)/nullif(sum(x.eff),0),2),
   'master_date', v_master,
   'window_days', p_days)
 INTO r
 FROM (
  SELECT a.score_global AS score, public.fn_assessment_weight(to_jsonb(a)) AS base, a.data_avaliacao AS dt,
         public.fn_assessment_weight(to_jsonb(a))*power(0.5,(current_date-a.data_avaliacao)/60.0) AS eff
  FROM public.avaliacoes_unificadas a
  WHERE a.athlete_id=p_athlete_id AND a.data_avaliacao>=current_date-p_days
 ) x WHERE x.base>0 AND (x.base=1 OR v_master IS NULL OR x.dt>=v_master);
 RETURN coalesce(r, jsonb_build_object('score',NULL,'professor_count',0,'self_count',0,'professor_weight_share',NULL,'master_date',v_master,'window_days',p_days));
END $$;
REVOKE ALL ON FUNCTION public.fn_assessment_weighted_score_core(uuid,integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_assessment_weighted_score(p_athlete_id uuid, p_days integer DEFAULT 120) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 RETURN public.fn_assessment_weighted_score_core(p_athlete_id, p_days);
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_assessment_weighted_score(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_assessment_weighted_score(uuid,integer) TO authenticated;

-- 2) Núcleo do perfil de capacidade (sem auth; só uso interno).
CREATE OR REPLACE FUNCTION public.fn_athlete_capacity_core(p_athlete_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_master record; v_master_date date; v_master_id uuid; v_pillars jsonb; v_weak jsonb; v_rm jsonb;
BEGIN
 SELECT a.id, a.data_avaliacao, a.score_global INTO v_master
  FROM public.avaliacoes_unificadas a WHERE a.athlete_id=p_athlete_id AND public.fn_assessment_weight(to_jsonb(a))=1
  ORDER BY a.data_avaliacao DESC, a.created_at DESC LIMIT 1;
 v_master_id := v_master.id; v_master_date := v_master.data_avaliacao;

 SELECT coalesce(jsonb_object_agg(q.k, jsonb_build_object('value',q.v,'date',q.d,'source',q.s)),'{}'::jsonb) INTO v_pillars
 FROM (
  SELECT p.k, x.v, x.d, x.s
  FROM unnest(ARRAY['forca','resistencia','core','cardio','mobilidade']) AS p(k)
  CROSS JOIN LATERAL (
   SELECT (to_jsonb(a)->>('score_'||p.k))::numeric AS v, a.data_avaliacao AS d,
          CASE WHEN public.fn_assessment_weight(to_jsonb(a))=1 THEN 'professor' ELSE 'autoavaliacao' END AS s
   FROM public.avaliacoes_unificadas a
   WHERE a.athlete_id=p_athlete_id AND public.fn_assessment_weight(to_jsonb(a))>0
     AND (to_jsonb(a)->>('score_'||p.k)) IS NOT NULL
     AND (v_master_id IS NULL OR a.id=v_master_id OR a.data_avaliacao>=v_master_date)
   ORDER BY a.data_avaliacao DESC, a.created_at DESC LIMIT 1
  ) x
 ) q;

 SELECT jsonb_build_object('key',e.key,'value',(e.value->>'value')::numeric,'source',e.value->>'source') INTO v_weak
 FROM jsonb_each(v_pillars) e ORDER BY (e.value->>'value')::numeric ASC LIMIT 1;

 SELECT coalesce(jsonb_object_agg(q.k, jsonb_build_object('kg',q.v,'date',q.d,'source',q.s)),'{}'::jsonb) INTO v_rm
 FROM (
  SELECT p.k, x.v, x.d, x.s
  FROM unnest(ARRAY['rm1_empurrar_superior','rm1_empurrar_perna','rm1_puxar_costas','rm1_puxar_inferior']) AS p(k)
  CROSS JOIN LATERAL (
   SELECT (to_jsonb(a)->>p.k)::numeric AS v, a.data_avaliacao AS d,
          CASE WHEN public.fn_assessment_weight(to_jsonb(a))=1 THEN 'professor' ELSE 'autoavaliacao' END AS s
   FROM public.avaliacoes_unificadas a
   WHERE a.athlete_id=p_athlete_id AND public.fn_assessment_weight(to_jsonb(a))>0
     AND (to_jsonb(a)->>p.k) IS NOT NULL
     AND (v_master_id IS NULL OR a.id=v_master_id OR a.data_avaliacao>=v_master_date)
   ORDER BY a.data_avaliacao DESC, a.created_at DESC LIMIT 1
  ) x
 ) q;

 RETURN jsonb_build_object(
  'master', CASE WHEN v_master_id IS NULL THEN NULL ELSE jsonb_build_object('id',v_master_id,'date',v_master_date,'score',v_master.score_global) END,
  'pillars', v_pillars,
  'weakest_pillar', v_weak,
  'rm1_refs', v_rm,
  'weighted', public.fn_assessment_weighted_score_core(p_athlete_id, 120));
END $$;
REVOKE ALL ON FUNCTION public.fn_athlete_capacity_core(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_athlete_capacity_profile(p_athlete_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
 IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
 RETURN public.fn_athlete_capacity_core(p_athlete_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_athlete_capacity_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_athlete_capacity_profile(uuid) TO authenticated;

-- 3) fn_decidir_foco_dia passa a devolver 'capacidade' (somente leitura; falha = null; NÃO altera protocolo nem exercícios).
DO $$
DECLARE v_def text;
BEGIN
 SELECT pg_get_functiondef('public.fn_decidir_foco_dia(uuid,date)'::regprocedure) INTO v_def;
 IF strpos(v_def,'v_cap jsonb')>0 THEN RETURN; END IF;
 IF strpos(v_def,E'  v_grupos text[];\nBEGIN')=0 OR strpos(v_def,'  RETURN jsonb_build_object(')=0 OR strpos(v_def,'''tem_wave_ativa'', (v_wave.id IS NOT NULL)')=0 THEN RAISE EXCEPTION 'foco_dia_anchor_missing'; END IF;
 v_def := replace(v_def, E'  v_grupos text[];\nBEGIN', E'  v_grupos text[];\n  v_cap jsonb;\nBEGIN');
 v_def := replace(v_def, '  RETURN jsonb_build_object(',
   E'  BEGIN\n    v_cap := public.fn_athlete_capacity_core(p_aluno_id);\n  EXCEPTION WHEN OTHERS THEN\n    v_cap := NULL;\n  END;\n\n  RETURN jsonb_build_object(');
 v_def := replace(v_def, '''tem_wave_ativa'', (v_wave.id IS NOT NULL)', '''tem_wave_ativa'', (v_wave.id IS NOT NULL),
    ''capacidade'', v_cap');
 EXECUTE v_def;
END $$;
;
