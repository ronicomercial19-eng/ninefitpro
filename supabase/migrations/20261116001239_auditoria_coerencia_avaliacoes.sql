
CREATE OR REPLACE FUNCTION public.fn_ensure_progress_athlete(p_student_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid; n int; s public.alunos%rowtype; v_aluno uuid;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
 a:=public.fn_resolve_progress_athlete(p_student_id);
 IF a IS NULL THEN
  SELECT * INTO s FROM public.alunos WHERE id=p_student_id AND professor_id=auth.uid();
  IF NOT FOUND OR NOT coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('progress-identity:'||p_student_id::text,0));
  SELECT count(*),(array_agg(id))[1] INTO n,a FROM public.athletes WHERE aluno_id=p_student_id;
  IF n>1 THEN RAISE EXCEPTION 'Vínculo ambíguo: solicite revisão do cadastro.';END IF;
  IF a IS NULL THEN
   INSERT INTO public.athletes(aluno_id,coach_id,name,email,phone,activated)
    VALUES(s.id,auth.uid(),s.nome,s.email,s.telefone,false) RETURNING id INTO a;
  END IF;
  v_aluno:=s.id;
 ELSIF coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) THEN
  SELECT aluno_id INTO v_aluno FROM public.athletes WHERE id=a;
 END IF;
 IF v_aluno IS NOT NULL THEN
  UPDATE public.avaliacoes_unificadas SET athlete_id=a,updated_at=now()
   WHERE aluno_id=v_aluno AND athlete_id IS NULL;
 END IF;
 RETURN a;
END $$;

CREATE OR REPLACE FUNCTION public.fn_calcular_score_avaliacao(p_avaliacao_id uuid)
RETURNS TABLE(score_forca numeric, score_resistencia numeric, score_core numeric, score_cardio numeric, score_mobilidade numeric, score_global numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_row record; v_forca numeric; v_resistencia numeric; v_core numeric; v_cardio numeric; v_mobilidade numeric;
  v_soma numeric := 0; v_count int := 0; v_global numeric;
BEGIN
  SELECT * INTO v_row FROM public.avaliacoes_unificadas WHERE id = p_avaliacao_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'avaliacao % not found', p_avaliacao_id; END IF;
  IF NOT (
    (auth.uid() IS NOT NULL AND (public.fn_assessment_can_read(v_row.athlete_id) OR public.is_admin(auth.uid())))
    OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin'))
    OR coalesce(auth.jwt()->>'role','') = 'service_role'
  ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;

  IF v_row.rm1_empurrar_perna IS NOT NULL OR v_row.rm1_puxar_costas IS NOT NULL
     OR v_row.rm1_empurrar_superior IS NOT NULL OR v_row.rm1_puxar_inferior IS NOT NULL THEN
    v_forca := LEAST(100, GREATEST(0, (
      COALESCE(v_row.rm1_empurrar_perna,0) + COALESCE(v_row.rm1_puxar_costas,0) +
      COALESCE(v_row.rm1_empurrar_superior,0) + COALESCE(v_row.rm1_puxar_inferior,0)
    ) / NULLIF(((v_row.rm1_empurrar_perna IS NOT NULL)::int+(v_row.rm1_puxar_costas IS NOT NULL)::int+(v_row.rm1_empurrar_superior IS NOT NULL)::int+(v_row.rm1_puxar_inferior IS NOT NULL)::int)::numeric,0) / 150.0 * 100));
    v_soma := v_soma + v_forca; v_count := v_count + 1;
  END IF;

  IF v_row.rml_abs IS NOT NULL OR v_row.rml_flexao IS NOT NULL
     OR v_row.rml_agachamento IS NOT NULL OR v_row.rml_pull IS NOT NULL OR v_row.rml_elevacao_p IS NOT NULL THEN
    v_resistencia := LEAST(100, GREATEST(0, (
      COALESCE(v_row.rml_abs,0) + COALESCE(v_row.rml_flexao,0) + COALESCE(v_row.rml_agachamento,0) +
      COALESCE(v_row.rml_pull,0) + COALESCE(v_row.rml_elevacao_p,0)
    ) / NULLIF(((v_row.rml_abs IS NOT NULL)::int+(v_row.rml_flexao IS NOT NULL)::int+(v_row.rml_agachamento IS NOT NULL)::int+(v_row.rml_pull IS NOT NULL)::int+(v_row.rml_elevacao_p IS NOT NULL)::int)::numeric,0) / 60.0 * 100));
    v_soma := v_soma + v_resistencia; v_count := v_count + 1;
  END IF;

  IF v_row.core_prancha_seg IS NOT NULL OR v_row.core_side_plank_esq_seg IS NOT NULL OR v_row.core_side_plank_dir_seg IS NOT NULL THEN
    v_core := LEAST(100, GREATEST(0, (
      COALESCE(v_row.core_prancha_seg,0) + COALESCE(v_row.core_side_plank_esq_seg,0) + COALESCE(v_row.core_side_plank_dir_seg,0)
    ) / NULLIF(((v_row.core_prancha_seg IS NOT NULL)::int+(v_row.core_side_plank_esq_seg IS NOT NULL)::int+(v_row.core_side_plank_dir_seg IS NOT NULL)::int)::numeric,0) / 120.0 * 100));
    v_soma := v_soma + v_core; v_count := v_count + 1;
  END IF;

  IF v_row.cardio_bpm_repouso IS NOT NULL THEN
    v_cardio := LEAST(100, GREATEST(0, 100 - ((v_row.cardio_bpm_repouso - 40) / 60.0 * 100)));
    v_soma := v_soma + v_cardio; v_count := v_count + 1;
  END IF;

  IF v_row.mob_overhead_squat IS NOT NULL OR v_row.mob_quadril IS NOT NULL
     OR v_row.mob_tornozelo IS NOT NULL OR v_row.mob_ombro IS NOT NULL THEN
    v_mobilidade := LEAST(100, GREATEST(0, (
      COALESCE(v_row.mob_overhead_squat,0) + COALESCE(v_row.mob_quadril,0) +
      COALESCE(v_row.mob_tornozelo,0) + COALESCE(v_row.mob_ombro,0)
    ) / NULLIF(((v_row.mob_overhead_squat IS NOT NULL)::int+(v_row.mob_quadril IS NOT NULL)::int+(v_row.mob_tornozelo IS NOT NULL)::int+(v_row.mob_ombro IS NOT NULL)::int)::numeric,0) * 10));
    v_soma := v_soma + v_mobilidade; v_count := v_count + 1;
  END IF;

  IF v_count > 0 THEN v_global := round(v_soma / v_count, 1); ELSE v_global := NULL; END IF;

  UPDATE public.avaliacoes_unificadas
  SET score_forca = v_forca, score_resistencia = v_resistencia, score_core = v_core,
      score_cardio = v_cardio, score_mobilidade = v_mobilidade, score_global = v_global,
      dados_adicionais = coalesce(dados_adicionais,'{}'::jsonb) || jsonb_build_object('score_formula_version','coverage_v3','score_pillars_measured',v_count),
      updated_at = now()
  WHERE id = p_avaliacao_id;

  RETURN QUERY SELECT v_forca, v_resistencia, v_core, v_cardio, v_mobilidade, v_global;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_save_progress_assessment(p_athlete_id uuid, p_dados jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.athletes%rowtype; payload jsonb; existing uuid; n int; cols text; updates text;
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
;
