
CREATE OR REPLACE FUNCTION public.fn_resolve_progress_athlete(p_identifier uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; n int;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 IF p_identifier IS NULL THEN a:=public.fn_current_athlete_id();
 ELSIF EXISTS(SELECT 1 FROM public.athletes WHERE id=p_identifier) THEN a:=p_identifier;
 ELSE SELECT count(*),(array_agg(id))[1] INTO n,a FROM public.athletes WHERE aluno_id=p_identifier;
  IF n>1 THEN RAISE EXCEPTION 'Vínculo ambíguo: solicite revisão do cadastro.' USING ERRCODE='22023';END IF;
 END IF;
 IF a IS NOT NULL AND NOT public.fn_assessment_can_read(a) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.fn_resolve_progress_athlete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_resolve_progress_athlete(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_ensure_progress_athlete(p_student_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; n int; s public.alunos%rowtype;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 a:=public.fn_resolve_progress_athlete(p_student_id);
 IF a IS NOT NULL THEN RETURN a;END IF;
 SELECT * INTO s FROM public.alunos WHERE id=p_student_id AND professor_id=auth.uid();
 IF NOT FOUND OR NOT coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('progress-identity:'||p_student_id::text,0));
 SELECT count(*),(array_agg(id))[1] INTO n,a FROM public.athletes WHERE aluno_id=p_student_id;
 IF n>1 THEN RAISE EXCEPTION 'Vínculo ambíguo: solicite revisão do cadastro.';END IF;
 IF a IS NULL THEN
  INSERT INTO public.athletes(aluno_id,coach_id,name,email,phone,activated)
   VALUES(s.id,auth.uid(),s.nome,s.email,s.telefone,false) RETURNING id INTO a;
 END IF;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.fn_ensure_progress_athlete(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_ensure_progress_athlete(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_save_progress_assessment(p_athlete_id uuid,p_dados jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.athletes%rowtype; payload jsonb; existing uuid; n int; cols text; updates text;
 item record; value_numeric numeric; day date; result_id uuid; additional jsonb; measured boolean:=false;
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
 'mob_overhead_squat','mob_quadril','mob_tornozelo','mob_ombro','observacoes','dados_adicionais','exames','avaliacao_exames','avaliador_nome','avaliador_cref','protocolo_alterado'])
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
 additional:=additional||jsonb_build_object('registrado_por',auth.uid(),'origem_sistema','progress_tracker','recorded_at',now());
 payload:=payload||jsonb_build_object('athlete_id',a.id,'aluno_id',a.aluno_id,'origem','manual','data_avaliacao',day,'dados_adicionais',additional);
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text||day::text||':professional-assessment',0));
 SELECT count(*),(array_agg(id))[1] INTO n,existing FROM public.avaliacoes_unificadas
  WHERE athlete_id=a.id AND data_avaliacao=day AND origem='manual';
 IF n>1 THEN RAISE EXCEPTION 'Há mais de uma avaliação profissional nesta data. Revise o histórico antes de salvar.';END IF;
 SELECT string_agg(format('%I',key),',' ORDER BY key),string_agg(
  CASE WHEN key='dados_adicionais' THEN 'dados_adicionais=coalesce(target.dados_adicionais,''{}''::jsonb)||source.dados_adicionais'
   ELSE format('%1$I=source.%1$I',key) END,',' ORDER BY key)
 INTO cols,updates FROM jsonb_object_keys(payload)key;
 IF existing IS NULL THEN
  EXECUTE format('INSERT INTO public.avaliacoes_unificadas(%1$s) SELECT %1$s FROM jsonb_populate_record(NULL::public.avaliacoes_unificadas,$1) RETURNING id',cols)
   INTO result_id USING payload;
 ELSE
  EXECUTE format('UPDATE public.avaliacoes_unificadas target SET %s,updated_at=now() FROM jsonb_populate_record(NULL::public.avaliacoes_unificadas,$1) source WHERE target.id=$2 RETURNING target.id',updates)
   INTO result_id USING payload,existing;
 END IF;
 PERFORM public.fn_calcular_score_avaliacao(result_id);
 RETURN jsonb_build_object('success',true,'id',result_id,'athlete_id',a.id,'message','Avaliação salva com sucesso!');
END $$;
REVOKE ALL ON FUNCTION public.fn_save_progress_assessment(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_progress_assessment(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.salvar_avaliacao(p_estudante_id uuid,p_dados jsonb)
RETURNS TABLE(success boolean,message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; result jsonb;
BEGIN
 a:=public.fn_ensure_progress_athlete(p_estudante_id);
 result:=public.fn_save_progress_assessment(a,p_dados);
 RETURN QUERY SELECT (result->>'success')::boolean,result->>'message';
EXCEPTION WHEN insufficient_privilege THEN RAISE;WHEN OTHERS THEN RETURN QUERY SELECT false,SQLERRM::text;
END $$;
REVOKE ALL ON FUNCTION public.salvar_avaliacao(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_avaliacao(uuid,jsonb) TO authenticated;

ALTER TABLE public.treinos_realizados ALTER COLUMN aluno_id DROP NOT NULL;
ALTER TABLE public.treinos_realizados ADD COLUMN IF NOT EXISTS request_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS progress_workout_request_idx ON public.treinos_realizados(athlete_id,request_id) WHERE request_id IS NOT NULL;
ALTER TABLE public.treinos_realizados ADD CONSTRAINT progress_workout_identity_required CHECK(athlete_id IS NOT NULL OR aluno_id IS NOT NULL) NOT VALID;

CREATE OR REPLACE FUNCTION public.fn_record_progress_workout(p_athlete_id uuid,p_request_id uuid,p_data date,p_nome text,p_exercicios jsonb,p_rpe numeric DEFAULT NULL,p_duration integer DEFAULT NULL,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.athletes%rowtype; saved uuid; exercise jsonb; series jsonb; volume numeric:=0; weight numeric; reps int;
 best_weight numeric; best_reps int; name text;
BEGIN
 IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR p_data IS NULL OR p_data>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'invalid_workout_identity_or_date';END IF;
 IF p_rpe IS NOT NULL AND (p_rpe::text IN('NaN','Infinity','-Infinity') OR p_rpe<0 OR p_rpe>10) THEN RAISE EXCEPTION 'RPE deve estar entre 0 e 10.';END IF;
 IF p_duration IS NOT NULL AND p_duration NOT BETWEEN 1 AND 1440 THEN RAISE EXCEPTION 'Duração inválida.';END IF;
 IF jsonb_typeof(p_exercicios) IS DISTINCT FROM 'array' OR jsonb_array_length(p_exercicios) NOT BETWEEN 1 AND 100 OR length(p_exercicios::text)>65536 THEN RAISE EXCEPTION 'Lista de exercícios inválida.';END IF;
 SELECT * INTO a FROM public.athletes WHERE id=p_athlete_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.id::text||p_request_id::text,0));
 SELECT id INTO saved FROM public.treinos_realizados WHERE athlete_id=a.id AND request_id=p_request_id;
 IF saved IS NOT NULL THEN RETURN jsonb_build_object('success',true,'id',saved,'deduped',true);END IF;
 FOR exercise IN SELECT value FROM jsonb_array_elements(p_exercicios) LOOP
  name:=btrim(exercise->>'nome');
  IF coalesce(length(name),0) NOT BETWEEN 1 AND 200 OR jsonb_typeof(exercise->'sets') IS DISTINCT FROM 'array' OR jsonb_array_length(exercise->'sets') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Exercício ou séries inválidos.';END IF;
  FOR series IN SELECT value FROM jsonb_array_elements(exercise->'sets') LOOP
   weight:=(series->>'peso')::numeric;reps:=(series->>'reps')::int;
   IF weight IS NULL OR weight::text IN('NaN','Infinity','-Infinity') OR weight<0 OR weight>2000 OR reps IS NULL OR reps NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Informe carga não negativa e repetições maiores que zero.';END IF;
   volume:=volume+weight*reps;
  END LOOP;
 END LOOP;
 INSERT INTO public.treinos_realizados(athlete_id,aluno_id,request_id,data_treino,nome,exercicios,volume_total,pse_medio,duracao_min,observacoes,origem)
 VALUES(a.id,a.aluno_id,p_request_id,p_data,left(p_nome,200),p_exercicios,volume,p_rpe,p_duration,left(p_notes,4000),'manual') RETURNING id INTO saved;
 FOR exercise IN SELECT value FROM jsonb_array_elements(p_exercicios) LOOP
  SELECT (value->>'peso')::numeric,(value->>'reps')::int INTO best_weight,best_reps FROM jsonb_array_elements(exercise->'sets') ORDER BY (value->>'peso')::numeric DESC,(value->>'reps')::int DESC LIMIT 1;
  IF best_weight>0 THEN
   INSERT INTO public.registros_carga(athlete_id,aluno_id,treino_id,exercicio,data_registro,carga_max,reps,origem)
    VALUES(a.id,a.aluno_id,saved,btrim(exercise->>'nome'),p_data,best_weight,best_reps,'manual');
  END IF;
 END LOOP;
 RETURN jsonb_build_object('success',true,'id',saved,'volume_total',volume,'deduped',false);
END $$;
REVOKE ALL ON FUNCTION public.fn_record_progress_workout(uuid,uuid,date,text,jsonb,numeric,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_record_progress_workout(uuid,uuid,date,text,jsonb,numeric,integer,text) TO authenticated;

