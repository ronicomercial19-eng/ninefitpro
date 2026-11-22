
-- Autorizado explicitamente por Ron (16/11/2026): "Autorizo aplicar no banco mfrydtrzjxscbkaiwfnw
-- a migration que adiciona massa_muscular na função fn_salvar_avaliacao_guiada_v2."
-- Mudança puramente aditiva: nenhuma coluna, campo ou regra existente é removida ou alterada.
CREATE OR REPLACE FUNCTION public.fn_salvar_avaliacao_guiada_v2(p_athlete_id uuid, p_data jsonb, p_atualizar_perfil boolean DEFAULT false, p_data_avaliacao date DEFAULT CURRENT_DATE)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
  v_peso numeric; v_altura numeric; v_imc numeric; v_massa_muscular numeric;
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
  IF NOT EXISTS (SELECT 1 FROM jsonb_each_text(p_data) e WHERE e.key IN ('peso','altura','gordura_corporal','massa_muscular','circunferencia_cintura','circunferencia_quadril','circunferencia_braco','circunferencia_coxa','circunferencia_panturrilha','circunferencia_pescoco','rml_flexao','rml_agachamento','rml_abs','rml_pull','rml_elevacao_p','core_prancha_seg','core_side_plank_esq_seg','core_side_plank_dir_seg','cardio_bpm_repouso','rm1_empurrar_superior','rm1_empurrar_perna','rm1_puxar_costas','sentar_levantar_30s','step_test_fc_1min','equilibrio_unipodal_esq_seg','equilibrio_unipodal_dir_seg','sentar_alcancar_cm') AND nullif(btrim(e.value),'') IS NOT NULL)
     AND NOT coalesce(jsonb_typeof(p_data->'fotos')='array' AND jsonb_array_length(p_data->'fotos')>0, false)
  THEN RAISE EXCEPTION 'Informe ao menos uma medida para salvar a avaliação' USING ERRCODE='22023', HINT='guided_requires_measure'; END IF;
  v_peso := public.fn_guided_num(p_data, 'peso', 20, 400);
  v_altura := public.fn_guided_num(p_data, 'altura', 100, 250);
  v_massa_muscular := public.fn_guided_num(p_data, 'massa_muscular', 1, 150);
  if v_peso is not null and v_altura is not null then
    v_imc := round(v_peso / power(v_altura / 100.0, 2), 2);
  end if;

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
    athlete_id, origem, data_avaliacao, peso, altura, imc, gordura_corporal, massa_muscular,
    circunferencia_cintura, circunferencia_quadril, circunferencia_braco, circunferencia_coxa, circunferencia_panturrilha,
    rml_flexao, rml_agachamento, rml_abs, rml_pull, rml_elevacao_p,
    core_prancha_seg, core_side_plank_esq_seg, core_side_plank_dir_seg,
    cardio_bpm_repouso,
    rm1_empurrar_superior, rm1_empurrar_perna, rm1_puxar_costas,
    dados_adicionais
  ) values (
    p_athlete_id, 'avaliacao_guiada', p_data_avaliacao, v_peso, v_altura, v_imc,
    public.fn_guided_num(p_data, 'gordura_corporal', 2, 70),
    v_massa_muscular,
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
    massa_muscular = coalesce(excluded.massa_muscular, public.avaliacoes_unificadas.massa_muscular),
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


 IF jsonb_array_length(v_fotos)>0 AND p_data ? 'photo_consent' AND coalesce((p_data->>'photo_consent')::boolean,false) IS NOT TRUE THEN RAISE EXCEPTION 'photo_consent_required'; END IF;
  insert into public.student_photos (athlete_id, photo_url, photo_type, photo_category, description, taken_date,consented_at,share_with_coach,consent_source)
  select p_athlete_id, f, 'avaliacao', coalesce(split_part(split_part(f, '/', 2), '_', 1), 'frente'), 'Avaliação guiada', p_data_avaliacao,now(),(coalesce((p_data->>'photo_consent')::boolean,false) AND coalesce((p_data->>'share_photos_with_coach')::boolean,false)),CASE WHEN p_data ? 'photo_consent' THEN 'explicit_v1' ELSE 'legacy_wizard_checkbox' END
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
;
