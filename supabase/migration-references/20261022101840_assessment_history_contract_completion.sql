-- Audited production definitions, amended in place. No historical score recalculation or deletion.
CREATE UNIQUE INDEX IF NOT EXISTS assessment_guided_athlete_date_unique ON public.avaliacoes_unificadas(athlete_id,data_avaliacao,origem) WHERE origem='avaliacao_guiada' AND athlete_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.fn_calcular_score_avaliacao(p_avaliacao_id uuid)
 RETURNS TABLE(score_forca numeric, score_resistencia numeric, score_core numeric, score_cardio numeric, score_mobilidade numeric, score_global numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_forca numeric;
  v_resistencia numeric;
  v_core numeric;
  v_cardio numeric;
  v_mobilidade numeric;
  v_soma numeric := 0;
  v_count int := 0;
  v_global numeric;
BEGIN
  SELECT * INTO v_row FROM public.avaliacoes_unificadas WHERE id = p_avaliacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'avaliacao % not found', p_avaliacao_id;
  END IF;

  IF NOT (
    (auth.uid() IS NOT NULL AND (public.fn_assessment_can_read(v_row.athlete_id) OR public.is_admin(auth.uid())))
    OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin'))
    OR coalesce(auth.jwt()->>'role','') = 'service_role'
  ) THEN RAISE EXCEPTION 'not authorized' USING ERRCODE='42501'; END IF;

  -- Força: média normalizada dos testes de RM1 (referência simples: 0-150kg -> 0-100)
  IF v_row.rm1_empurrar_perna IS NOT NULL OR v_row.rm1_puxar_costas IS NOT NULL 
     OR v_row.rm1_empurrar_superior IS NOT NULL OR v_row.rm1_puxar_inferior IS NOT NULL THEN
    v_forca := LEAST(100, GREATEST(0, (
      COALESCE(v_row.rm1_empurrar_perna,0) + COALESCE(v_row.rm1_puxar_costas,0) +
      COALESCE(v_row.rm1_empurrar_superior,0) + COALESCE(v_row.rm1_puxar_inferior,0)
    ) / NULLIF(((v_row.rm1_empurrar_perna IS NOT NULL)::int+(v_row.rm1_puxar_costas IS NOT NULL)::int+(v_row.rm1_empurrar_superior IS NOT NULL)::int+(v_row.rm1_puxar_inferior IS NOT NULL)::int)::numeric,0) / 150.0 * 100));
    v_soma := v_soma + v_forca; v_count := v_count + 1;
  END IF;

  -- Resistência: média normalizada dos testes RML (referência: 0-60 reps -> 0-100)
  IF v_row.rml_abs IS NOT NULL OR v_row.rml_flexao IS NOT NULL 
     OR v_row.rml_agachamento IS NOT NULL OR v_row.rml_pull IS NOT NULL OR v_row.rml_elevacao_p IS NOT NULL THEN
    v_resistencia := LEAST(100, GREATEST(0, (
      COALESCE(v_row.rml_abs,0) + COALESCE(v_row.rml_flexao,0) + COALESCE(v_row.rml_agachamento,0) +
      COALESCE(v_row.rml_pull,0) + COALESCE(v_row.rml_elevacao_p,0)
    ) / NULLIF(((v_row.rml_abs IS NOT NULL)::int+(v_row.rml_flexao IS NOT NULL)::int+(v_row.rml_agachamento IS NOT NULL)::int+(v_row.rml_pull IS NOT NULL)::int+(v_row.rml_elevacao_p IS NOT NULL)::int)::numeric,0) / 60.0 * 100));
    v_soma := v_soma + v_resistencia; v_count := v_count + 1;
  END IF;

  -- Core: prancha + side planks (referência: 0-120seg -> 0-100)
  IF v_row.core_prancha_seg IS NOT NULL OR v_row.core_side_plank_esq_seg IS NOT NULL OR v_row.core_side_plank_dir_seg IS NOT NULL THEN
    v_core := LEAST(100, GREATEST(0, (
      COALESCE(v_row.core_prancha_seg,0) + COALESCE(v_row.core_side_plank_esq_seg,0) + COALESCE(v_row.core_side_plank_dir_seg,0)
    ) / NULLIF(((v_row.core_prancha_seg IS NOT NULL)::int+(v_row.core_side_plank_esq_seg IS NOT NULL)::int+(v_row.core_side_plank_dir_seg IS NOT NULL)::int)::numeric,0) / 120.0 * 100));
    v_soma := v_soma + v_core; v_count := v_count + 1;
  END IF;

  -- Cardio: baseado em BPM repouso (referência inversa: 40-100bpm -> 100-0, menor é melhor)
  IF v_row.cardio_bpm_repouso IS NOT NULL THEN
    v_cardio := LEAST(100, GREATEST(0, 100 - ((v_row.cardio_bpm_repouso - 40) / 60.0 * 100)));
    v_soma := v_soma + v_cardio; v_count := v_count + 1;
  END IF;

  -- Mobilidade: média dos testes de mobilidade (referência: 0-100 já é escala direta assumida)
  IF v_row.mob_overhead_squat IS NOT NULL OR v_row.mob_quadril IS NOT NULL 
     OR v_row.mob_tornozelo IS NOT NULL OR v_row.mob_ombro IS NOT NULL THEN
    v_mobilidade := LEAST(100, GREATEST(0, (
      COALESCE(v_row.mob_overhead_squat,0) + COALESCE(v_row.mob_quadril,0) +
      COALESCE(v_row.mob_tornozelo,0) + COALESCE(v_row.mob_ombro,0)
    ) / NULLIF(((v_row.mob_overhead_squat IS NOT NULL)::int+(v_row.mob_quadril IS NOT NULL)::int+(v_row.mob_tornozelo IS NOT NULL)::int+(v_row.mob_ombro IS NOT NULL)::int)::numeric,0)));
    v_soma := v_soma + v_mobilidade; v_count := v_count + 1;
  END IF;

  IF v_count > 0 THEN
    v_global := round(v_soma / v_count, 1);
  ELSE
    v_global := NULL; -- sem dado nenhum, não inventa score 0
  END IF;

  UPDATE public.avaliacoes_unificadas
  SET score_forca = v_forca,
      score_resistencia = v_resistencia,
      score_core = v_core,
      score_cardio = v_cardio,
      score_mobilidade = v_mobilidade,
      score_global = v_global,
      dados_adicionais = coalesce(dados_adicionais,'{}'::jsonb) || jsonb_build_object('score_formula_version','coverage_v2','score_pillars_measured',v_count),
      updated_at = now()
  WHERE id = p_avaliacao_id;

  RETURN QUERY SELECT v_forca, v_resistencia, v_core, v_cardio, v_mobilidade, v_global;
end;
$function$;
REVOKE ALL ON FUNCTION public.fn_calcular_score_avaliacao(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_calcular_score_avaliacao(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.fn_assessment_is_official(p_row jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
 SELECT coalesce(p_row->>'origem','') NOT IN ('avaliacao_guiada','peso_avulso','autoavaliacao','self_checkin')
 AND coalesce((p_row->>'score_global')::numeric,0)>0
 AND coalesce(p_row#>>'{dados_adicionais,confianca_score}','DERIVADO')<>'ESTIMADO'
 AND NOT EXISTS(SELECT 1 FROM jsonb_each_text(CASE WHEN jsonb_typeof(p_row#>'{dados_adicionais,confianca}')='object' THEN p_row#>'{dados_adicionais,confianca}' ELSE '{}'::jsonb END) c WHERE c.key ~ '^(rm1_|rml_|core_|cardio_|mob_|score_)' AND c.value NOT IN ('CONFIRMADO','DERIVADO'));
$$;
CREATE OR REPLACE FUNCTION public.fn_salvar_avaliacao_guiada_v2(p_athlete_id uuid, p_data jsonb, p_atualizar_perfil boolean DEFAULT false, p_data_avaliacao date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_peso numeric; v_altura numeric; v_imc numeric;
  v_extra jsonb;
  v_fotos jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.athletes a where a.id = p_athlete_id and (
      a.user_id = auth.uid() or exists (select 1 from public.athlete_auth_link l where l.athlete_id = a.id and l.user_id = auth.uid())
    )
  ) then raise exception 'not authorized' using errcode = '42501'; end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then
    raise exception 'Dados inválidos' using errcode = '22023';
  end if;

  IF p_data_avaliacao IS NULL OR p_data_avaliacao > CURRENT_DATE THEN RAISE EXCEPTION 'Data inválida' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_data_avaliacao::text || ':guided',0));
  v_peso := public.fn_guided_num(p_data, 'peso', 20, 400);
  v_altura := public.fn_guided_num(p_data, 'altura', 100, 250);
  if v_peso is not null and v_altura is not null then
    v_imc := round(v_peso / power(v_altura / 100.0, 2), 2);
  end if;

  -- fotos: só caminhos dentro da pasta do próprio atleta
  if jsonb_typeof(p_data->'fotos') = 'array' then
    select coalesce(jsonb_agg(f), '[]'::jsonb) into v_fotos
    from jsonb_array_elements_text(p_data->'fotos') f
    where f like p_athlete_id::text || '/%' and length(f) < 300;
  end if;

  v_extra := jsonb_build_object(
    'versao', 'guiada_v3',
    'nivel', p_data->>'nivel',
    'objetivo', left(p_data->>'objetivo', 80),
    'idade_na_avaliacao', public.fn_guided_num(p_data, 'idade', 10, 100),
    'confianca_resumo', left(p_data->>'confianca',120),
    'confianca', jsonb_build_object('imc','DERIVADO','gordura_corporal','ESTIMADO','rm1_empurrar_superior','ESTIMADO','rm1_empurrar_perna','ESTIMADO','rm1_puxar_costas','ESTIMADO'),
    'protocolos', jsonb_build_object('rm1_empurrar_superior','epley_estimativa','rm1_empurrar_perna','epley_estimativa','rm1_puxar_costas','epley_estimativa'),
    'confianca_score','ESTIMADO',
    'triagem_par_q', p_data->'triagem',
    'metodo_gordura', p_data->>'metodo_gordura',
    'circunferencia_pescoco', public.fn_guided_num(p_data, 'circunferencia_pescoco', 20, 80),
    'sentar_levantar_30s', public.fn_guided_num(p_data, 'sentar_levantar_30s', 0, 80),
    'step_test_fc_1min', public.fn_guided_num(p_data, 'step_test_fc_1min', 40, 220),
    'equilibrio_unipodal_esq_seg', public.fn_guided_num(p_data, 'equilibrio_unipodal_esq_seg', 0, 120),
    'equilibrio_unipodal_dir_seg', public.fn_guided_num(p_data, 'equilibrio_unipodal_dir_seg', 0, 120),
    'sentar_alcancar_cm', public.fn_guided_num(p_data, 'sentar_alcancar_cm', -40, 60),
    'fotos', v_fotos,
    'condicoes_medicao', p_data->'condicoes'
  );

  insert into public.avaliacoes_unificadas (
    athlete_id, origem, data_avaliacao, peso, altura, imc, gordura_corporal,
    circunferencia_cintura, circunferencia_quadril, circunferencia_braco, circunferencia_coxa, circunferencia_panturrilha,
    rml_flexao, rml_agachamento, rml_abs, rml_pull, rml_elevacao_p,
    core_prancha_seg, core_side_plank_esq_seg, core_side_plank_dir_seg,
    cardio_bpm_repouso,
    rm1_empurrar_superior, rm1_empurrar_perna, rm1_puxar_costas,
    dados_adicionais
  ) values (
    p_athlete_id, 'avaliacao_guiada', p_data_avaliacao, v_peso, v_altura, v_imc,
    public.fn_guided_num(p_data, 'gordura_corporal', 2, 70),
    public.fn_guided_num(p_data, 'circunferencia_cintura', 40, 250),
    public.fn_guided_num(p_data, 'circunferencia_quadril', 50, 250),
    public.fn_guided_num(p_data, 'circunferencia_braco', 15, 80),
    public.fn_guided_num(p_data, 'circunferencia_coxa', 25, 120),
    public.fn_guided_num(p_data, 'circunferencia_panturrilha', 15, 70),
    public.fn_guided_num(p_data, 'rml_flexao', 0, 300)::int,
    public.fn_guided_num(p_data, 'rml_agachamento', 0, 500)::int,
    public.fn_guided_num(p_data, 'rml_abs', 0, 500)::int,
    public.fn_guided_num(p_data, 'rml_pull', 0, 100)::int,
    public.fn_guided_num(p_data, 'rml_elevacao_p', 0, 500)::int,
    public.fn_guided_num(p_data, 'core_prancha_seg', 0, 1800),
    public.fn_guided_num(p_data, 'core_side_plank_esq_seg', 0, 900),
    public.fn_guided_num(p_data, 'core_side_plank_dir_seg', 0, 900),
    public.fn_guided_num(p_data, 'cardio_bpm_repouso', 30, 130)::int,
    public.fn_guided_num(p_data, 'rm1_empurrar_superior', 0, 500),
    public.fn_guided_num(p_data, 'rm1_empurrar_perna', 0, 1000),
    public.fn_guided_num(p_data, 'rm1_puxar_costas', 0, 500),
    v_extra
  )
  on conflict (athlete_id, data_avaliacao, origem) where origem = 'avaliacao_guiada' and athlete_id is not null do update set
    athlete_id = excluded.athlete_id,
    peso = coalesce(excluded.peso, public.avaliacoes_unificadas.peso),
    altura = coalesce(excluded.altura, public.avaliacoes_unificadas.altura),
    imc = coalesce(excluded.imc, public.avaliacoes_unificadas.imc),
    gordura_corporal = coalesce(excluded.gordura_corporal, public.avaliacoes_unificadas.gordura_corporal),
    circunferencia_cintura = coalesce(excluded.circunferencia_cintura, public.avaliacoes_unificadas.circunferencia_cintura),
    circunferencia_quadril = coalesce(excluded.circunferencia_quadril, public.avaliacoes_unificadas.circunferencia_quadril),
    circunferencia_braco = coalesce(excluded.circunferencia_braco, public.avaliacoes_unificadas.circunferencia_braco),
    circunferencia_coxa = coalesce(excluded.circunferencia_coxa, public.avaliacoes_unificadas.circunferencia_coxa),
    circunferencia_panturrilha = coalesce(excluded.circunferencia_panturrilha, public.avaliacoes_unificadas.circunferencia_panturrilha),
    rml_flexao = coalesce(excluded.rml_flexao, public.avaliacoes_unificadas.rml_flexao),
    rml_agachamento = coalesce(excluded.rml_agachamento, public.avaliacoes_unificadas.rml_agachamento),
    rml_abs = coalesce(excluded.rml_abs, public.avaliacoes_unificadas.rml_abs),
    rml_pull = coalesce(excluded.rml_pull, public.avaliacoes_unificadas.rml_pull),
    rml_elevacao_p = coalesce(excluded.rml_elevacao_p, public.avaliacoes_unificadas.rml_elevacao_p),
    core_prancha_seg = coalesce(excluded.core_prancha_seg, public.avaliacoes_unificadas.core_prancha_seg),
    core_side_plank_esq_seg = coalesce(excluded.core_side_plank_esq_seg, public.avaliacoes_unificadas.core_side_plank_esq_seg),
    core_side_plank_dir_seg = coalesce(excluded.core_side_plank_dir_seg, public.avaliacoes_unificadas.core_side_plank_dir_seg),
    cardio_bpm_repouso = coalesce(excluded.cardio_bpm_repouso, public.avaliacoes_unificadas.cardio_bpm_repouso),
    rm1_empurrar_superior = coalesce(excluded.rm1_empurrar_superior, public.avaliacoes_unificadas.rm1_empurrar_superior),
    rm1_empurrar_perna = coalesce(excluded.rm1_empurrar_perna, public.avaliacoes_unificadas.rm1_empurrar_perna),
    rm1_puxar_costas = coalesce(excluded.rm1_puxar_costas, public.avaliacoes_unificadas.rm1_puxar_costas),
    dados_adicionais = coalesce(public.avaliacoes_unificadas.dados_adicionais, '{}'::jsonb) || excluded.dados_adicionais
  returning id into v_id;

  perform public.fn_calcular_score_avaliacao(v_id);

  -- registra as fotos no histórico do atleta (bucket privado student-photos)
  insert into public.student_photos (athlete_id, photo_url, photo_type, photo_category, description, taken_date)
  select p_athlete_id, f, 'avaliacao', coalesce(split_part(split_part(f, '/', 2), '_', 1), 'frente'), 'Avaliação guiada', p_data_avaliacao
  from jsonb_array_elements_text(v_fotos) f
  on conflict do nothing;

  if p_atualizar_perfil then
    update public.athletes set
      peso_kg = coalesce(v_peso, peso_kg),
      altura_cm = coalesce(v_altura, altura_cm)
    where id = p_athlete_id;
  end if;

  return json_build_object('success', true, 'id', v_id, 'imc', v_imc);
end $function$;
CREATE OR REPLACE FUNCTION public.fn_get_avaliacao_detalhe(p_athlete_id uuid, p_avaliacao_id uuid, p_comparar text DEFAULT 'anterior'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_hub jsonb; v_current jsonb; v_compare jsonb; v_attempts jsonb;
begin
 if p_comparar not in ('anterior','primeira') then raise exception 'Comparação inválida'; end if;
 v_hub:=public.fn_get_assessment_hub(p_athlete_id);
 select value into v_current from jsonb_array_elements(v_hub->'assessments') where value->>'id'=p_avaliacao_id::text;
 if v_current is null then raise exception 'Avaliação não encontrada para este perfil' using errcode='42501'; end if;
 select value into v_compare from jsonb_array_elements(v_hub->'assessments') where value->>'id'<>p_avaliacao_id::text and (value->>'data_avaliacao',value->>'created_at',value->>'id')<(v_current->>'data_avaliacao',v_current->>'created_at',v_current->>'id')
 and (value->>'oficial')::boolean=(v_current->>'oficial')::boolean and value->>'origem'=case when (v_current->>'oficial')::boolean then value->>'origem' else v_current->>'origem' end
 order by case when p_comparar='primeira' then value->>'data_avaliacao' end asc,case when p_comparar='anterior' then value->>'data_avaliacao' end desc,case when p_comparar='primeira' then value->>'created_at' end asc,case when p_comparar='anterior' then value->>'created_at' end desc,case when p_comparar='primeira' then value->>'id' end asc,case when p_comparar='anterior' then value->>'id' end desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(t) order by teste,ordem),'[]') into v_attempts from avaliacao_tentativas t where avaliacao_id=p_avaliacao_id;
 return jsonb_build_object('avaliacao',v_current,'comparacao',v_compare,'tipo_comparacao',p_comparar,'historico',v_hub->'assessments','references',v_hub->'references','tentativas',v_attempts,'testes',public.fn_assessment_tests(v_current,v_compare,v_hub->'assessments',v_hub->'references'));
end;
$function$;
-- Own self reports cannot impersonate a teacher or arbitrary source. Existing scoped
-- teacher/admin policies remain responsible for professional writes.
DROP POLICY IF EXISTS "Athletes FitPro inserem avaliacoes" ON public.avaliacoes_unificadas;
CREATE POLICY "Athletes FitPro inserem avaliacoes" ON public.avaliacoes_unificadas FOR INSERT TO authenticated
WITH CHECK (
 (origem IN ('avaliacao_guiada','peso_avulso','autoavaliacao','self_checkin') AND EXISTS (
 SELECT 1 FROM public.athletes a WHERE a.id=avaliacoes_unificadas.athlete_id AND (a.user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=auth.uid()))))
 OR public.is_admin(auth.uid())
 OR EXISTS(SELECT 1 FROM public.athletes a WHERE a.id=avaliacoes_unificadas.athlete_id AND a.coach_id=auth.uid())
);
CREATE OR REPLACE FUNCTION public.fn_assessment_metric_compatible(a jsonb,b jsonb,k text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
 SELECT b IS NOT NULL AND (
 (coalesce(a->>'origem','') IN ('avaliacao_guiada','peso_avulso','autoavaliacao','self_checkin')) =
 (coalesce(b->>'origem','') IN ('avaliacao_guiada','peso_avulso','autoavaliacao','self_checkin'))
 ) AND CASE
 WHEN k LIKE 'score_%' THEN coalesce(a#>>'{dados_adicionais,score_formula_version}','legacy_v1')=coalesce(b#>>'{dados_adicionais,score_formula_version}','legacy_v1')
 AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['score_forca','score_resistencia','score_core','score_cardio','score_mobilidade']) p WHERE (a->>p IS NULL)<>(b->>p IS NULL))
 WHEN k='gordura_corporal' THEN coalesce(a#>>'{dados_adicionais,metodo_gordura_score}',a#>>'{dados_adicionais,metodo_gordura}') IS NOT NULL AND coalesce(a#>>'{dados_adicionais,metodo_gordura_score}',a#>>'{dados_adicionais,metodo_gordura}')=coalesce(b#>>'{dados_adicionais,metodo_gordura_score}',b#>>'{dados_adicionais,metodo_gordura}')
 WHEN coalesce(a#>>ARRAY['dados_adicionais','protocolos',k],a#>>'{dados_adicionais,protocolo}',b#>>ARRAY['dados_adicionais','protocolos',k],b#>>'{dados_adicionais,protocolo}') IS NOT NULL
 THEN coalesce(a#>>ARRAY['dados_adicionais','protocolos',k],a#>>'{dados_adicionais,protocolo}')=coalesce(b#>>ARRAY['dados_adicionais','protocolos',k],b#>>'{dados_adicionais,protocolo}')
 WHEN k IN ('peso','altura') OR k LIKE 'circunferencia_%' THEN a->>'origem'=b->>'origem'
 ELSE a#>>'{dados_adicionais,versao}' IS NOT NULL AND a#>>'{dados_adicionais,versao}'=b#>>'{dados_adicionais,versao}'
 AND coalesce(a#>'{dados_adicionais,condicoes_medicao,flexao_variacao}','null')=coalesce(b#>'{dados_adicionais,condicoes_medicao,flexao_variacao}','null') END;
$$;
REVOKE ALL ON FUNCTION public.fn_assessment_metric_compatible(jsonb,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_assessment_metric_compatible(jsonb,jsonb,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.fn_assessment_tests(p_row jsonb, p_previous jsonb, p_history jsonb, p_refs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
declare m jsonb; v numeric; old numeric; confidence text; band jsonb; result jsonb:='[]'; is_record boolean; ref jsonb;
begin
 for m in select value from jsonb_array_elements($catalog$[{"key":"peso","label":"Peso","unit":"kg","pillar":"composicao"},{"key":"altura","label":"Altura","unit":"cm","pillar":"composicao"},{"key":"imc","label":"IMC","unit":"kg/m²","pillar":"composicao"},{"key":"gordura_corporal","label":"Gordura corporal","unit":"%","pillar":"composicao"},{"key":"massa_muscular","label":"Massa muscular","unit":"kg","pillar":"composicao"},{"key":"massa_magra","label":"Massa magra","unit":"kg","pillar":"composicao"},{"key":"massa_gorda","label":"Massa gorda","unit":"kg","pillar":"composicao"},{"key":"agua_corporal","label":"Água corporal","unit":"%","pillar":"composicao"},{"key":"taxa_metabolica","label":"Taxa metabólica","unit":"kcal","pillar":"composicao"},{"key":"circunferencia_braco","label":"Circunferência · Braço","unit":"cm","pillar":"composicao"},{"key":"circunferencia_peitoral","label":"Circunferência · Peitoral","unit":"cm","pillar":"composicao"},{"key":"circunferencia_cintura","label":"Circunferência · Cintura","unit":"cm","pillar":"composicao"},{"key":"circunferencia_quadril","label":"Circunferência · Quadril","unit":"cm","pillar":"composicao"},{"key":"circunferencia_coxa","label":"Circunferência · Coxa","unit":"cm","pillar":"composicao"},{"key":"circunferencia_panturrilha","label":"Circunferência · Panturrilha","unit":"cm","pillar":"composicao"},{"key":"dobra_triceps","label":"Dobra · Tríceps","unit":"mm","pillar":"composicao"},{"key":"dobra_peitoral","label":"Dobra · Peitoral","unit":"mm","pillar":"composicao"},{"key":"dobra_abdominal","label":"Dobra · Abdominal","unit":"mm","pillar":"composicao"},{"key":"dobra_suprailiaca","label":"Dobra · Suprailíaca","unit":"mm","pillar":"composicao"},{"key":"dobra_coxa","label":"Dobra · Coxa","unit":"mm","pillar":"composicao"},{"key":"dobra_panturrilha","label":"Dobra · Panturrilha","unit":"mm","pillar":"composicao"},{"key":"dobra_subescapular","label":"Dobra · Subescapular","unit":"mm","pillar":"composicao"},{"key":"dobra_axilar_media","label":"Dobra · Axilar média","unit":"mm","pillar":"composicao"},{"key":"rm1_empurrar_superior","label":"Supino · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rm1_empurrar_perna","label":"Empurrar perna · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rm1_puxar_costas","label":"Puxada / remada · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rm1_puxar_inferior","label":"Puxar inferior · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rml_abs","label":"Abdominais","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_flexao","label":"Flexões","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_agachamento","label":"Agachamentos","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_pull","label":"Barra fixa","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_elevacao_p","label":"Elevação pélvica","unit":"reps","pillar":"resistencia","higher":true},{"key":"core_prancha_seg","label":"Prancha","unit":"s","pillar":"core","higher":true},{"key":"core_side_plank_esq_seg","label":"Prancha lateral esquerda","unit":"s","pillar":"core","higher":true},{"key":"core_side_plank_dir_seg","label":"Prancha lateral direita","unit":"s","pillar":"core","higher":true},{"key":"cardio_bpm_repouso","label":"Frequência cardíaca de repouso","unit":"bpm","pillar":"cardio"},{"key":"cardio_bpm_max","label":"Frequência cardíaca máxima","unit":"bpm","pillar":"cardio"},{"key":"cardio_sprint_vel","label":"Velocidade no sprint","unit":"km/h","pillar":"cardio","higher":true},{"key":"vo2_estimado","label":"VO₂ máximo estimado","unit":"ml/kg/min","pillar":"cardio","trust":"ESTIMADO"},{"key":"fc_recuperacao_1min","label":"Recuperação em 1 minuto","unit":"bpm","pillar":"cardio"},{"key":"mob_overhead_squat","label":"Overhead squat","unit":"pts","pillar":"mobilidade","higher":true},{"key":"mob_quadril","label":"Mobilidade de quadril","unit":"pts","pillar":"mobilidade","higher":true},{"key":"mob_tornozelo","label":"Mobilidade de tornozelo","unit":"pts","pillar":"mobilidade","higher":true},{"key":"mob_ombro","label":"Mobilidade de ombro","unit":"pts","pillar":"mobilidade","higher":true},{"key":"gordura_bioimpedancia","label":"Gordura por bioimpedância","unit":"%","pillar":"composicao","trust":"DERIVADO"},{"key":"sentar_levantar_30s","label":"Sentar e levantar · 30 segundos","unit":"reps","pillar":"resistencia"},{"key":"step_test_fc_1min","label":"Frequência após step test · 1 minuto","unit":"bpm","pillar":"cardio"},{"key":"equilibrio_unipodal_esq_seg","label":"Equilíbrio unipodal esquerdo","unit":"s","pillar":"mobilidade"},{"key":"equilibrio_unipodal_dir_seg","label":"Equilíbrio unipodal direito","unit":"s","pillar":"mobilidade"},{"key":"sentar_alcancar_cm","label":"Sentar e alcançar","unit":"cm","pillar":"mobilidade"},{"key":"circunferencia_pescoco","label":"Circunferência · Pescoço","unit":"cm","pillar":"composicao"}]$catalog$::jsonb) loop
 if coalesce(p_row->>(m->>'key'),p_row#>>array['dados_adicionais',m->>'key']) is null then continue; end if;
 begin v:=coalesce(p_row->>(m->>'key'),p_row#>>array['dados_adicionais',m->>'key'])::numeric; exception when invalid_text_representation then continue; end;
 if v::text in ('NaN','Infinity','-Infinity') then continue; end if;
 confidence:=coalesce(p_row#>>array['dados_adicionais','confianca',m->>'key'],m->>'trust',case when m->>'key' in ('imc','massa_magra','massa_gorda') or (m->>'key'='gordura_corporal' and p_row#>>'{dados_adicionais,metodo_gordura_score}'='dobras') then 'DERIVADO' else 'CONFIRMADO' end);
 if m->>'key'='vo2_estimado' then confidence:='ESTIMADO'; end if;
 if coalesce(p_row->>'origem','') IN ('avaliacao_guiada','peso_avulso','autoavaliacao','self_checkin') AND m->>'key' LIKE 'rm1_%' THEN confidence:='ESTIMADO'; END IF;
 if m->>'key'='gordura_corporal' AND coalesce(p_row#>>'{dados_adicionais,metodo_gordura}',p_row#>>'{dados_adicionais,metodo_gordura_score}','') ~* '(estim|navy)' THEN confidence:='ESTIMADO'; END IF;
 if confidence not in ('CONFIRMADO','DERIVADO','ESTIMADO','NAO_DISPONIVEL') then confidence:='NAO_DISPONIVEL'; end if;
 old:=null; begin old:=coalesce(p_previous->>(m->>'key'),p_previous#>>array['dados_adicionais',m->>'key'])::numeric; exception when invalid_text_representation then old:=null; end;
 IF NOT coalesce(public.fn_assessment_metric_compatible(p_row,p_previous,m->>'key'),false) OR coalesce(p_previous#>>array['dados_adicionais','confianca',m->>'key'],'CONFIRMADO') NOT IN ('CONFIRMADO','DERIVADO') THEN old:=null; END IF;
 ref:=null; band:=null;
 select value into ref from jsonb_array_elements(coalesce(p_refs,'[]')) where value->>'teste'=m->>'key' and value->>'protocolo'=p_row#>>'{dados_adicionais,protocolo}' and value->>'unidade'=m->>'unit' limit 1;
 if ref is not null then select value into band from jsonb_array_elements(ref->'limites') where (value->>'min' is null or v>=(value->>'min')::numeric) and (value->>'max' is null or v<(value->>'max')::numeric) limit 1; end if;
 is_record:=false;
 if coalesce((p_row->>'oficial')::boolean,false) and coalesce((m->>'higher')::boolean,false) and confidence in ('CONFIRMADO','DERIVADO') then
 select count(*)>0 and v>max((value->>(m->>'key'))::numeric) into is_record from jsonb_array_elements(coalesce(p_history,'[]')) where public.fn_assessment_metric_compatible(p_row,value,m->>'key') and (value->>'oficial')::boolean and value->>'data_avaliacao'<p_row->>'data_avaliacao' and value->>(m->>'key') is not null and coalesce(value#>>array['dados_adicionais','confianca',m->>'key'],'CONFIRMADO')<>'ESTIMADO';
 end if;
 result:=result||jsonb_build_array(jsonb_build_object('chave',m->>'key','rotulo',m->>'label','pilar',m->>'pillar','valor',v,'unidade',m->>'unit','delta',case when confidence='ESTIMADO' then null else v-old end,'recorde',coalesce(is_record,false),'confianca',confidence,'faixa',band->>'rotulo','fonte',case when band is not null then ref->>'fonte' end));
 end loop;
 return result;
end;
$function$;
