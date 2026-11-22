create or replace function public.fn_guided_num(p jsonb, k text, lo numeric, hi numeric)
returns numeric language plpgsql immutable set search_path = '' as $$
declare v numeric;
begin
  if p is null or p->k is null or jsonb_typeof(p->k) = 'null' then return null; end if;
  if jsonb_typeof(p->k) <> 'number' then raise exception 'Valor inválido em %', k using errcode = '22023'; end if;
  v := (p->>k)::numeric;
  if v < lo or v > hi then raise exception 'Valor fora do intervalo plausível em % (% a %)', k, lo, hi using errcode = '22023'; end if;
  return v;
end $$;
revoke all on function public.fn_guided_num(jsonb, text, numeric, numeric) from public, anon;
grant execute on function public.fn_guided_num(jsonb, text, numeric, numeric) to authenticated;

create or replace function public.fn_salvar_avaliacao_guiada_v2(
  p_athlete_id uuid,
  p_data jsonb,
  p_atualizar_perfil boolean default false,
  p_data_avaliacao date default current_date
) returns json language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_peso numeric; v_altura numeric; v_imc numeric;
  v_extra jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.athletes a where a.id = p_athlete_id and (
      a.user_id = auth.uid() or exists (select 1 from public.athlete_auth_link l where l.athlete_id = a.id and l.user_id = auth.uid())
    )
  ) then raise exception 'not authorized' using errcode = '42501'; end if;

  if p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 20000 then
    raise exception 'Dados inválidos' using errcode = '22023';
  end if;

  v_peso := public.fn_guided_num(p_data, 'peso', 20, 400);
  v_altura := public.fn_guided_num(p_data, 'altura', 100, 250);
  if v_peso is not null and v_altura is not null then
    v_imc := round(v_peso / power(v_altura / 100.0, 2), 2);
  end if;

  v_extra := jsonb_build_object(
    'versao', 'guiada_v2',
    'nivel', p_data->>'nivel',
    'confianca', p_data->>'confianca',
    'triagem_par_q', p_data->'triagem',
    'metodo_gordura', p_data->>'metodo_gordura',
    'circunferencia_pescoco', public.fn_guided_num(p_data, 'circunferencia_pescoco', 20, 80),
    'sentar_levantar_30s', public.fn_guided_num(p_data, 'sentar_levantar_30s', 0, 80),
    'condicoes_medicao', p_data->'condicoes'
  );

  insert into public.avaliacoes_unificadas (
    athlete_id, origem, data_avaliacao, peso, altura, imc, gordura_corporal,
    circunferencia_cintura, circunferencia_quadril, circunferencia_braco, circunferencia_coxa, circunferencia_panturrilha,
    rml_flexao, rml_agachamento, rml_abs, rml_pull,
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
    public.fn_guided_num(p_data, 'core_prancha_seg', 0, 1800),
    public.fn_guided_num(p_data, 'core_side_plank_esq_seg', 0, 900),
    public.fn_guided_num(p_data, 'core_side_plank_dir_seg', 0, 900),
    public.fn_guided_num(p_data, 'cardio_bpm_repouso', 30, 130)::int,
    public.fn_guided_num(p_data, 'rm1_empurrar_superior', 0, 500),
    public.fn_guided_num(p_data, 'rm1_empurrar_perna', 0, 1000),
    public.fn_guided_num(p_data, 'rm1_puxar_costas', 0, 500),
    v_extra
  )
  on conflict on constraint avaliacoes_unificadas_aluno_id_data_avaliacao_origem_key do update set
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

  -- Só atualiza o perfil se o usuário confirmou de forma explícita.
  if p_atualizar_perfil then
    update public.athletes set
      peso_kg = coalesce(v_peso, peso_kg),
      altura_cm = coalesce(v_altura, altura_cm)
    where id = p_athlete_id;
  end if;

  return json_build_object('success', true, 'id', v_id, 'imc', v_imc);
end $$;
revoke all on function public.fn_salvar_avaliacao_guiada_v2(uuid, jsonb, boolean, date) from public, anon;
grant execute on function public.fn_salvar_avaliacao_guiada_v2(uuid, jsonb, boolean, date) to authenticated;;
