create or replace function public.fn_salvar_avaliacao_guiada(
  p_athlete_id uuid,
  p_peso numeric default null,
  p_gordura_corporal numeric default null,
  p_massa_muscular numeric default null,
  p_rm_supino numeric default null,
  p_rm_agachamento numeric default null,
  p_rm_puxada numeric default null,
  p_data_avaliacao date default current_date
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and (
        a.user_id = auth.uid()
        or exists (
          select 1
          from public.athlete_auth_link l
          where l.athlete_id = a.id
            and l.user_id = auth.uid()
        )
      )
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_peso is not null and (p_peso <= 0 or p_peso > 700 or p_peso::text = 'NaN') then
    raise exception 'Peso inválido';
  end if;
  if p_gordura_corporal is not null and (p_gordura_corporal < 0 or p_gordura_corporal > 80 or p_gordura_corporal::text = 'NaN') then
    raise exception 'Percentual inválido';
  end if;
  if exists (
    select 1
    from unnest(array[p_massa_muscular, p_rm_supino, p_rm_agachamento, p_rm_puxada]) v
    where v < 0 or v::text = 'NaN'
  ) then
    raise exception 'Medida inválida';
  end if;

  insert into public.avaliacoes_unificadas (
    athlete_id,
    origem,
    data_avaliacao,
    peso,
    gordura_corporal,
    massa_muscular,
    rm1_empurrar_superior,
    rm1_empurrar_perna,
    rm1_puxar_costas
  ) values (
    p_athlete_id,
    'avaliacao_guiada',
    p_data_avaliacao,
    p_peso,
    p_gordura_corporal,
    p_massa_muscular,
    p_rm_supino,
    p_rm_agachamento,
    p_rm_puxada
  )
  on conflict on constraint avaliacoes_unificadas_aluno_id_data_avaliacao_origem_key
  do update set
    athlete_id = excluded.athlete_id,
    peso = coalesce(excluded.peso, avaliacoes_unificadas.peso),
    gordura_corporal = coalesce(excluded.gordura_corporal, avaliacoes_unificadas.gordura_corporal),
    massa_muscular = coalesce(excluded.massa_muscular, avaliacoes_unificadas.massa_muscular),
    rm1_empurrar_superior = coalesce(excluded.rm1_empurrar_superior, avaliacoes_unificadas.rm1_empurrar_superior),
    rm1_empurrar_perna = coalesce(excluded.rm1_empurrar_perna, avaliacoes_unificadas.rm1_empurrar_perna),
    rm1_puxar_costas = coalesce(excluded.rm1_puxar_costas, avaliacoes_unificadas.rm1_puxar_costas)
  returning id into v_id;

  perform public.fn_calcular_score_avaliacao(v_id);

  update public.athletes
  set peso_kg = coalesce(p_peso, peso_kg)
  where id = p_athlete_id;

  return json_build_object('success', true, 'id', v_id);
end;
$function$;

revoke all on function public.fn_salvar_avaliacao_guiada(uuid, numeric, numeric, numeric, numeric, numeric, numeric, date) from public;
grant execute on function public.fn_salvar_avaliacao_guiada(uuid, numeric, numeric, numeric, numeric, numeric, numeric, date) to authenticated;
