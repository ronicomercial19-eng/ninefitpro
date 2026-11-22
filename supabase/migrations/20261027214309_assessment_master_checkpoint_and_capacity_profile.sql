
-- Checkpoint master = última avaliação do professor (peso 1). Autoavaliações ANTERIORES a ele ficam no histórico
-- mas deixam de contar no score ponderado (o master recalibra a base). As posteriores contam com peso reduzido.
CREATE OR REPLACE FUNCTION public.fn_assessment_weighted_score(p_athlete_id uuid, p_days integer DEFAULT 120) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb; v_master date;
BEGIN
 IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
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
REVOKE EXECUTE ON FUNCTION public.fn_assessment_weighted_score(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_assessment_weighted_score(uuid,integer) TO authenticated;

-- Perfil de capacidade: o que o sistema "sabe" do atleta a partir das avaliações (master + dados guiados desde o master).
CREATE OR REPLACE FUNCTION public.fn_athlete_capacity_profile(p_athlete_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_master record; v_master_date date; v_master_id uuid; v_pillars jsonb; v_weak jsonb; v_rm jsonb;
BEGIN
 IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;
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
  'weighted', public.fn_assessment_weighted_score(p_athlete_id, 120));
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_athlete_capacity_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_athlete_capacity_profile(uuid) TO authenticated;
;
