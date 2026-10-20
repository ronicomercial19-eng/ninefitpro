-- Keep one complete official row, with real identity links and all supported measurements.
create or replace function public.salvar_avaliacao(p_estudante_id uuid,p_dados jsonb)
returns table(success boolean,message text) language plpgsql security definer set search_path=public as $$
declare v_aluno uuid; v_athlete uuid; v_payload jsonb; v_columns text; v_updates text; item record; v numeric;
begin
 if auth.uid() is null then raise exception 'not authorized' using errcode='42501'; end if;
 select id into v_aluno from alunos where id=p_estudante_id and professor_id=auth.uid();
 if v_aluno is null then select a.aluno_id into v_aluno from athletes a where a.id=p_estudante_id and (a.coach_id=auth.uid() or exists(select 1 from alunos al where al.id=a.aluno_id and al.professor_id=auth.uid())); end if;
 if v_aluno is null then raise exception 'not authorized' using errcode='42501'; end if;
 select case when count(*)=1 then (array_agg(id))[1] end into v_athlete from athletes where aluno_id=v_aluno;
 if jsonb_typeof(p_dados)<>'object' then raise exception 'Dados de avaliação inválidos'; end if;
 select coalesce(jsonb_object_agg(e.key,e.value),'{}') into v_payload from jsonb_each(p_dados) e
 where e.key=any(array['data_avaliacao','peso','altura','imc','gordura_corporal','massa_muscular','massa_magra','massa_gorda','agua_corporal','taxa_metabolica','circunferencia_braco','circunferencia_peitoral','circunferencia_cintura','circunferencia_quadril','circunferencia_coxa','circunferencia_panturrilha','dobra_triceps','dobra_peitoral','dobra_abdominal','dobra_suprailiaca','dobra_coxa','dobra_panturrilha','dobra_subescapular','dobra_axilar_media','rml_abs','rml_flexao','rml_agachamento','rml_pull','rml_elevacao_p','rm1_empurrar_perna','rm1_puxar_costas','rm1_empurrar_superior','rm1_puxar_inferior','core_prancha_seg','core_side_plank_esq_seg','core_side_plank_dir_seg','cardio_sprint_vel','cardio_bpm_repouso','cardio_bpm_max','mob_overhead_squat','mob_quadril','mob_tornozelo','mob_ombro','score_forca','score_resistencia','score_core','score_cardio','score_mobilidade','score_global','observacoes','flags_inteligentes','dados_adicionais','exames','avaliacao_exames','avaliador_nome','avaliador_cref','protocolo_alterado'])
 and exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='avaliacoes_unificadas' and c.column_name=e.key);
 for item in select e.key,e.value from jsonb_each_text(v_payload)e join information_schema.columns c on c.table_schema='public' and c.table_name='avaliacoes_unificadas' and c.column_name=e.key where c.data_type in ('numeric','integer','smallint','double precision','real') loop
 if item.value is null then continue; end if;
 v:=item.value::numeric;
 if v::text in ('NaN','Infinity','-Infinity') or v<0 or (item.key='peso' and (v<=0 or v>700)) or (item.key='gordura_corporal' and v>80) or (item.key like 'score_%' and v>100) then raise exception 'Medida inválida: %',item.key; end if;
 end loop;
 if coalesce((v_payload->>'data_avaliacao')::date,current_date)>current_date then raise exception 'Data futura não permitida'; end if;
 v_payload:=v_payload||jsonb_build_object('aluno_id',v_aluno,'athlete_id',v_athlete,'origem','manual','data_avaliacao',coalesce((v_payload->>'data_avaliacao')::date,current_date));
 select string_agg(format('%I',key),',' order by key),string_agg(format('%1$I=coalesce(EXCLUDED.%1$I,avaliacoes_unificadas.%1$I)',key),',' order by key) filter(where key not in ('aluno_id','data_avaliacao','origem')) into v_columns,v_updates from jsonb_object_keys(v_payload)key;
 execute format('insert into public.avaliacoes_unificadas(%1$s) select %1$s from jsonb_populate_record(null::public.avaliacoes_unificadas,$1) on conflict(aluno_id,data_avaliacao,origem) do update set %2$s,updated_at=now()',v_columns,v_updates) using v_payload;
 return query select true,'Avaliação salva com sucesso!'::text;
exception when insufficient_privilege then raise; when others then return query select false,sqlerrm::text;
end; $$;

-- Resolve only an explicit link or an unambiguous email; names are not identities.
create or replace function public.fn_resolve_athlete_id_avaliacoes()
returns trigger language plpgsql security definer set search_path=public as $$
declare candidate uuid;
begin
 if new.athlete_id is null and new.aluno_id is not null then
 select case when count(*)=1 then (array_agg(a.id))[1] end into candidate from athletes a where a.aluno_id=new.aluno_id;
 if candidate is null then select case when count(*)=1 then (array_agg(a.id))[1] end into candidate from athletes a join alunos al on al.id=new.aluno_id and nullif(trim(lower(al.email)),'')=nullif(trim(lower(a.email)),''); end if;
 new.athlete_id:=candidate;
 elsif new.aluno_id is null and new.athlete_id is not null then
 select a.aluno_id into candidate from athletes a where a.id=new.athlete_id;
 if candidate is null then select case when count(*)=1 then (array_agg(al.id))[1] end into candidate from alunos al join athletes a on a.id=new.athlete_id and nullif(trim(lower(a.email)),'')=nullif(trim(lower(al.email)),''); end if;
 new.aluno_id:=candidate;
 end if;
 return new;
end; $$;
create or replace function public.fn_resolver_aluno_id()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare candidate uuid;
begin
 if new.aluno_id is not null or new.athlete_id is null then return new; end if;
 select a.aluno_id into candidate from athletes a where a.id=new.athlete_id;
 if candidate is null then select case when count(*)=1 then (array_agg(al.id))[1] end into candidate from alunos al join athletes a on a.id=new.athlete_id and nullif(trim(lower(a.email)),'')=nullif(trim(lower(al.email)),''); end if;
 new.aluno_id:=candidate; return new;
end; $$;
