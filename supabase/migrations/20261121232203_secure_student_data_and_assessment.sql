-- Fixed SQL for professional assessments; preserve authorization and canonical scoring.
CREATE OR REPLACE FUNCTION public.fn_save_progress_assessment(p_athlete_id uuid, p_dados jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE a public.athletes%rowtype; payload jsonb; existing uuid; n int; saved public.avaliacoes_unificadas%rowtype;
 item record; value_numeric numeric; day date; result_id uuid; additional jsonb; measured boolean:=false; cliente jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
  OR NOT (private.fitpro_can_manage_athlete(p_athlete_id) OR EXISTS(
   SELECT 1 FROM public.athletes x JOIN public.alunos s ON s.id=x.aluno_id WHERE x.id=p_athlete_id AND s.professor_id=auth.uid()
  )) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM public.athletes WHERE id=p_athlete_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Atleta não encontrado.';END IF;
 IF jsonb_typeof(p_dados) IS DISTINCT FROM 'object' OR length(p_dados::text)>65536 THEN RAISE EXCEPTION 'Dados de avaliação inválidos.';END IF;
 day:=coalesce(nullif(p_dados->>'data_avaliacao','')::date,(now() AT TIME ZONE 'America/Sao_Paulo')::date);
 IF day>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Data futura não permitida.';END IF;
 SELECT coalesce(jsonb_object_agg(e.key,e.value),'{}') INTO payload FROM jsonb_each(p_dados)e
 WHERE e.key=ANY(ARRAY['peso','altura','imc','gordura_corporal','massa_muscular','massa_magra','massa_gorda','agua_corporal','taxa_metabolica',
 'circunferencia_braco','circunferencia_peitoral','circunferencia_cintura','circunferencia_quadril','circunferencia_coxa','circunferencia_panturrilha',
 'dobra_triceps','dobra_peitoral','dobra_abdominal','dobra_suprailiaca','dobra_coxa','dobra_panturrilha','dobra_subescapular','dobra_axilar_media',
 'rml_abs','rml_flexao','rml_agachamento','rml_pull','rml_elevacao_p','rm1_empurrar_perna','rm1_puxar_costas','rm1_empurrar_superior','rm1_puxar_inferior',
 'core_prancha_seg','core_side_plank_esq_seg','core_side_plank_dir_seg','cardio_sprint_vel','cardio_bpm_repouso','cardio_bpm_max',
 'mob_overhead_squat','mob_quadril','mob_tornozelo','mob_ombro','observacoes','dados_adicionais','exames','avaliacao_exames','avaliador_nome','avaliador_cref'])
 AND EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name='avaliacoes_unificadas' AND c.column_name=e.key);
 FOR item IN SELECT e.key,e.value FROM jsonb_each_text(payload)e JOIN information_schema.columns c
   ON c.table_schema='public' AND c.table_name='avaliacoes_unificadas' AND c.column_name=e.key
   WHERE c.data_type IN('numeric','integer','smallint','double precision','real') LOOP
  IF item.value IS NULL THEN CONTINUE;END IF;
  value_numeric:=replace(item.value,',','.')::numeric;
  IF value_numeric::text IN('NaN','Infinity','-Infinity') OR value_numeric<0
   OR (item.key='peso' AND (value_numeric<=0 OR value_numeric>700))
   OR (item.key='altura' AND value_numeric<=0) OR (item.key='gordura_corporal' AND value_numeric>80) THEN RAISE EXCEPTION 'Medida inválida: %',item.key;END IF;
  payload:=jsonb_set(payload,ARRAY[item.key],to_jsonb(value_numeric));measured:=true;
 END LOOP;
 IF NOT measured THEN RAISE EXCEPTION 'Informe ao menos uma medida realmente avaliada.';END IF;
 IF jsonb_typeof(payload->'exames')='string' THEN payload:=jsonb_set(payload,'{exames}',(payload->>'exames')::jsonb);END IF;
 additional:=CASE WHEN jsonb_typeof(payload->'dados_adicionais')='object' THEN payload->'dados_adicionais' ELSE '{}'::jsonb END;
 SELECT coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) INTO cliente FROM jsonb_each(p_dados)e WHERE e.key ~ '^score_';
 IF cliente<>'{}'::jsonb THEN additional:=additional||jsonb_build_object('indicador_cliente',cliente,'indicador_cliente_formula','benchmarks_tracker'); END IF;
 IF p_dados ? 'flags_inteligentes' THEN additional:=additional||jsonb_build_object('flags_cliente',p_dados->'flags_inteligentes'); END IF;
 IF p_dados ? 'protocolo_alterado' THEN additional:=additional||jsonb_build_object('protocolo_alterado',p_dados->'protocolo_alterado'); END IF;
 additional:=additional||jsonb_build_object('registrado_por',auth.uid(),'origem_sistema','progress_tracker','recorded_at',now());
 payload:=payload||jsonb_build_object('athlete_id',a.id,'aluno_id',a.aluno_id,'origem','manual','data_avaliacao',day,'dados_adicionais',additional);
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text||day::text||':professional-assessment',0));
 SELECT count(*),(array_agg(id))[1] INTO n,existing FROM public.avaliacoes_unificadas
  WHERE athlete_id=a.id AND data_avaliacao=day AND origem='manual';
 IF n>1 THEN RAISE EXCEPTION 'Há mais de uma avaliação profissional nesta data. Revise o histórico antes de salvar.';END IF;
 -- SQL structure is fixed. Payload only populates typed values; omitted measurements retain their value.
 IF existing IS NULL THEN
  saved:=jsonb_populate_record(NULL::public.avaliacoes_unificadas, jsonb_build_object('exames','[]'::jsonb)||payload);
  INSERT INTO public.avaliacoes_unificadas (peso, altura, imc, gordura_corporal, massa_muscular, massa_magra, massa_gorda, agua_corporal, taxa_metabolica, circunferencia_braco, circunferencia_peitoral, circunferencia_cintura, circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha, dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca, dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media, rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p, rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior, core_prancha_seg, core_side_plank_esq_seg, core_side_plank_dir_seg, cardio_sprint_vel, cardio_bpm_repouso, cardio_bpm_max, mob_overhead_squat, mob_quadril, mob_tornozelo, mob_ombro, observacoes, dados_adicionais, exames, avaliacao_exames, avaliador_nome, avaliador_cref, athlete_id, aluno_id, origem, data_avaliacao)
  VALUES (saved.peso, saved.altura, saved.imc, saved.gordura_corporal, saved.massa_muscular, saved.massa_magra, saved.massa_gorda, saved.agua_corporal, saved.taxa_metabolica, saved.circunferencia_braco, saved.circunferencia_peitoral, saved.circunferencia_cintura, saved.circunferencia_quadril, saved.circunferencia_coxa, saved.circunferencia_panturrilha, saved.dobra_triceps, saved.dobra_peitoral, saved.dobra_abdominal, saved.dobra_suprailiaca, saved.dobra_coxa, saved.dobra_panturrilha, saved.dobra_subescapular, saved.dobra_axilar_media, saved.rml_abs, saved.rml_flexao, saved.rml_agachamento, saved.rml_pull, saved.rml_elevacao_p, saved.rm1_empurrar_perna, saved.rm1_puxar_costas, saved.rm1_empurrar_superior, saved.rm1_puxar_inferior, saved.core_prancha_seg, saved.core_side_plank_esq_seg, saved.core_side_plank_dir_seg, saved.cardio_sprint_vel, saved.cardio_bpm_repouso, saved.cardio_bpm_max, saved.mob_overhead_squat, saved.mob_quadril, saved.mob_tornozelo, saved.mob_ombro, saved.observacoes, saved.dados_adicionais, saved.exames, saved.avaliacao_exames, saved.avaliador_nome, saved.avaliador_cref, saved.athlete_id, saved.aluno_id, saved.origem, saved.data_avaliacao) RETURNING id INTO result_id;
 ELSE
  SELECT * INTO saved FROM public.avaliacoes_unificadas WHERE id=existing FOR UPDATE;
  payload:=payload||jsonb_build_object('dados_adicionais',coalesce(saved.dados_adicionais,'{}'::jsonb)||additional);
  saved:=jsonb_populate_record(saved,payload);
  UPDATE public.avaliacoes_unificadas SET
   peso = saved.peso,
   altura = saved.altura,
   imc = saved.imc,
   gordura_corporal = saved.gordura_corporal,
   massa_muscular = saved.massa_muscular,
   massa_magra = saved.massa_magra,
   massa_gorda = saved.massa_gorda,
   agua_corporal = saved.agua_corporal,
   taxa_metabolica = saved.taxa_metabolica,
   circunferencia_braco = saved.circunferencia_braco,
   circunferencia_peitoral = saved.circunferencia_peitoral,
   circunferencia_cintura = saved.circunferencia_cintura,
   circunferencia_quadril = saved.circunferencia_quadril,
   circunferencia_coxa = saved.circunferencia_coxa,
   circunferencia_panturrilha = saved.circunferencia_panturrilha,
   dobra_triceps = saved.dobra_triceps,
   dobra_peitoral = saved.dobra_peitoral,
   dobra_abdominal = saved.dobra_abdominal,
   dobra_suprailiaca = saved.dobra_suprailiaca,
   dobra_coxa = saved.dobra_coxa,
   dobra_panturrilha = saved.dobra_panturrilha,
   dobra_subescapular = saved.dobra_subescapular,
   dobra_axilar_media = saved.dobra_axilar_media,
   rml_abs = saved.rml_abs,
   rml_flexao = saved.rml_flexao,
   rml_agachamento = saved.rml_agachamento,
   rml_pull = saved.rml_pull,
   rml_elevacao_p = saved.rml_elevacao_p,
   rm1_empurrar_perna = saved.rm1_empurrar_perna,
   rm1_puxar_costas = saved.rm1_puxar_costas,
   rm1_empurrar_superior = saved.rm1_empurrar_superior,
   rm1_puxar_inferior = saved.rm1_puxar_inferior,
   core_prancha_seg = saved.core_prancha_seg,
   core_side_plank_esq_seg = saved.core_side_plank_esq_seg,
   core_side_plank_dir_seg = saved.core_side_plank_dir_seg,
   cardio_sprint_vel = saved.cardio_sprint_vel,
   cardio_bpm_repouso = saved.cardio_bpm_repouso,
   cardio_bpm_max = saved.cardio_bpm_max,
   mob_overhead_squat = saved.mob_overhead_squat,
   mob_quadril = saved.mob_quadril,
   mob_tornozelo = saved.mob_tornozelo,
   mob_ombro = saved.mob_ombro,
   observacoes = saved.observacoes,
   dados_adicionais = saved.dados_adicionais,
   exames = saved.exames,
   avaliacao_exames = saved.avaliacao_exames,
   avaliador_nome = saved.avaliador_nome,
   avaliador_cref = saved.avaliador_cref,
   athlete_id = saved.athlete_id,
   aluno_id = saved.aluno_id,
   origem = saved.origem,
   data_avaliacao = saved.data_avaliacao,
   updated_at=now()
  WHERE id=existing RETURNING id INTO result_id;
 END IF;
 PERFORM public.fn_calcular_score_avaliacao(result_id);
 RETURN jsonb_build_object('success',true,'id',result_id,'athlete_id',a.id,'message','Avaliação salva com sucesso!');
END $function$;


REVOKE ALL ON FUNCTION public.fn_save_progress_assessment(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_save_progress_assessment(uuid,jsonb) TO authenticated;

-- Personal workout deliveries must never be public, including to anonymous visitors.
DROP POLICY IF EXISTS "Permitir leitura pública para treinos" ON public.workouts;
ALTER POLICY deliveries_read_own ON public.training_html_deliveries TO authenticated
 USING (
  (SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false)
  AND (professor_id=(SELECT auth.uid()) OR private.fitpro_can_manage_athlete(athlete_id)
   OR EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=training_html_deliveries.athlete_id AND a.user_id=(SELECT auth.uid()))
   OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=training_html_deliveries.athlete_id AND l.user_id=(SELECT auth.uid())))
 );
-- Paid entitlement is not ownership. Existing owner/assigned-coach policies still apply.
DROP POLICY IF EXISTS fitpro_paid_read ON public.workout_exercises;

-- Validate both the existing meal and its destination on INSERT/UPDATE.
ALTER POLICY creator_manages_diet_meals ON public.diet_meals
 WITH CHECK (diet_assignment_id IN (SELECT s.id FROM public.student_diet_assignments s WHERE s.created_by=(SELECT auth.uid())));
ALTER POLICY creator_manages_diet_meal_items ON public.diet_meal_items
 WITH CHECK (diet_meal_id IN (SELECT m.id FROM public.diet_meals m JOIN public.student_diet_assignments s ON s.id=m.diet_assignment_id WHERE s.created_by=(SELECT auth.uid())));
ALTER POLICY "Athletes view own nutrition logs" ON public.nutrition_logs TO authenticated
 USING (
  (SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>'is_anonymous')::boolean,false)
  AND (private.fitpro_can_manage_athlete(athlete_id)
   OR EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=nutrition_logs.athlete_id AND a.user_id=(SELECT auth.uid()))
   OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=nutrition_logs.athlete_id AND l.user_id=(SELECT auth.uid())))
 );
-- Exercise prescriptions inherit visibility of their workout, not every registered account.
ALTER POLICY "Authenticated can view workout exercises" ON public.workout_exercises_new TO authenticated
 USING (EXISTS(SELECT 1 FROM public.workouts_new w WHERE w.id=workout_exercises_new.workout_id));
ALTER POLICY "Trainers can manage workout exercises" ON public.workout_exercises_new TO authenticated
 USING (EXISTS(SELECT 1 FROM public.workouts_new w WHERE w.id=workout_exercises_new.workout_id AND w.created_by=(SELECT auth.uid())))
 WITH CHECK (EXISTS(SELECT 1 FROM public.workouts_new w WHERE w.id=workout_exercises_new.workout_id AND w.created_by=(SELECT auth.uid())));
CREATE POLICY assigned_student_reads_workout ON public.workouts_new FOR SELECT TO authenticated
 USING (EXISTS(SELECT 1 FROM public.workout_assignments_new a WHERE a.workout_id=workouts_new.id AND a.student_id=(SELECT auth.uid())));

-- Shared reference/catalog data is for identified members, not guest sessions or public dumps.
-- These tables contain reusable exercises, methods and programs, not personal assignments.
DO $catalog$
DECLARE p record;
BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND cmd='SELECT' AND qual='true'
  AND tablename=ANY(ARRAY['programs','program_workouts','workout_program_exercises','periodizacoes_novas',
    'readiness_rules','readiness_rule_sets','readiness_context_modifiers','ref_faixas','workout_models',
    'densificacao_niveis','densificacao_parametros','densificacao_metodos','smart_treino_protocols',
    'foods','exercicios_novos','periodization_variations','exercises','ambiente_config','skills','supersets',
    'gym_classes','training_structures','periodization_models','link_de_video','training_html_templates',
    'estruturas_de_treinamento','class_schedules','exercise_library','library_items','training_programs'])
 LOOP
  EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND NOT coalesce((SELECT auth.jwt()->>''is_anonymous'')::boolean,false))',p.policyname,p.tablename);
 END LOOP;
END $catalog$;

-- Internal logging and trigger functions have no client-facing purpose.
REVOKE EXECUTE ON FUNCTION public.fn_registrar_falha_geracao(uuid,date,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_registrar_falha_geracao(uuid,date,text,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.fn_materializar_annual_plan_do_catalogo() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_log_athlete_weight() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_ativar_periodizacao_basica(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.fn_falhas_geracao_treino(uuid,integer) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.fn_resolver_macro_ausente(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.prescrever_treino(uuid,date,text) FROM PUBLIC,anon;

;
