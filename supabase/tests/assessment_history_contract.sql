BEGIN;
-- Never commit this test: uses existing ownership only inside a rolled-back transaction.
DO $test$
DECLARE a uuid; u uuid; other_id uuid; other_a uuid; x json; y json; h jsonb; n int;
BEGIN
 SELECT id,user_id INTO a,u FROM public.athletes WHERE user_id IS NOT NULL AND EXISTS(SELECT 1 FROM auth.users z WHERE z.id=athletes.user_id) ORDER BY id LIMIT 1;
 IF a IS NULL THEN RAISE EXCEPTION 'No owned athlete available for transactional test'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 h:=public.fn_get_assessment_hub(a);
 IF h->>'contract_version'<>'2' OR NOT (h->>'can_manage')::boolean THEN RAISE EXCEPTION 'Owner hub contract failed'; END IF;
 x:=public.fn_salvar_avaliacao_guiada_v2(a,'{"peso":71,"altura":175,"rml_flexao":12,"gordura_corporal":20,"metodo_gordura":"us_navy_estimativa","confianca":"teste rollback","step_test_fc_1min":90}'::jsonb,false,CURRENT_DATE);
 y:=public.fn_salvar_avaliacao_guiada_v2(a,'{"peso":72,"altura":175,"rml_flexao":14}'::jsonb,false,CURRENT_DATE);
 IF x->>'id' IS DISTINCT FROM y->>'id' THEN RAISE EXCEPTION 'Guided save is not idempotent'; END IF;
 h:=public.fn_get_avaliacao_detalhe(a,(y->>'id')::uuid,'anterior');
 IF (h#>>'{avaliacao,oficial}')::boolean OR h#>>'{avaliacao,dados_adicionais,confianca,rm1_empurrar_superior}'<>'ESTIMADO' THEN RAISE EXCEPTION 'Self report trust failed'; END IF;
 IF h#>>'{avaliacao,dados_adicionais,score_formula_version}'<>'coverage_v2' THEN RAISE EXCEPTION 'Missing score version'; END IF;
 IF (h#>>'{avaliacao,score_resistencia}')::numeric <> round(14.0/60*100,1) AND abs((h#>>'{avaliacao,score_resistencia}')::numeric-14.0/60*100)>0.01 THEN RAISE EXCEPTION 'Absent tests treated as zero'; END IF;
 BEGIN
  PERFORM public.fn_salvar_avaliacao_guiada_v2(a,'{"peso":72}'::jsonb,false,CURRENT_DATE+1);
  RAISE EXCEPTION 'Future date accepted';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 RESET ROLE;
 SELECT au.id,au.athlete_id INTO other_id,other_a FROM public.avaliacoes_unificadas au WHERE au.athlete_id IS NOT NULL AND au.athlete_id<>a AND NOT public.fn_assessment_can_read(au.athlete_id) LIMIT 1;
 IF other_id IS NOT NULL THEN
  SET LOCAL ROLE authenticated;
  BEGIN PERFORM public.fn_calcular_score_avaliacao(other_id); RAISE EXCEPTION 'Foreign score writable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.fn_get_assessment_hub(other_a); RAISE EXCEPTION 'Foreign history readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
 ELSE RAISE EXCEPTION 'Need unrelated assessment to exercise negative authorization'; END IF;
 PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
 SET LOCAL ROLE anon;
 BEGIN PERFORM public.fn_get_assessment_hub(a); RAISE EXCEPTION 'Anonymous history readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
END;
$test$;
SELECT 'owner read/write, idempotence, trust, coverage, future date, foreign and anonymous denial: PASS (rollback)' AS result;

ROLLBACK;
