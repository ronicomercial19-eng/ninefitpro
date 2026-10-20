-- Shared once by FitPro and Progress Tracker. Additive; no historical data deletion.
create or replace function public.fn_assessment_can_read(p_athlete_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists (
   select 1 from athletes a where a.id=p_athlete_id and (
     a.user_id=auth.uid() or a.coach_id=auth.uid()
     or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=auth.uid())
     or exists(select 1 from alunos al where al.id=a.aluno_id and al.professor_id=auth.uid())
   )
 );
$$;
revoke all on function public.fn_assessment_can_read(uuid) from public,anon;
grant execute on function public.fn_assessment_can_read(uuid) to authenticated;

create or replace function public.fn_assessment_is_official(p_row jsonb)
returns boolean language sql immutable set search_path=public as $$
 select coalesce(p_row->>'origem','') not in ('avaliacao_guiada','peso_avulso','autoavaliacao')
 and coalesce((p_row->>'score_global')::numeric,0)>0
 and coalesce(p_row#>>'{dados_adicionais,confianca_score}','DERIVADO')<>'ESTIMADO'
 and not exists(select 1 from jsonb_each_text(coalesce(p_row#>'{dados_adicionais,confianca}','{}'::jsonb)) c where c.key ~ '^(rm1_|rml_|core_|cardio_|mob_|score_)' and c.value='ESTIMADO');
$$;

create table public.ref_faixas (
 id uuid primary key default gen_random_uuid(), teste text not null, sexo text not null,
 idade_min integer not null check(idade_min>=0), idade_max integer not null check(idade_max>=idade_min),
 limites jsonb not null check(jsonb_typeof(limites)='array'), fonte text not null check(length(trim(fonte))>0),
 protocolo text not null, unidade text not null, criado_em timestamptz not null default now(),
 unique(teste,sexo,idade_min,idade_max,protocolo)
);
comment on table public.ref_faixas is 'Only sourced protocol reference bands. limites: [{min,max,rotulo}]. No invented seed values.';
alter table public.ref_faixas enable row level security;
create policy ref_faixas_read on public.ref_faixas for select to authenticated using (true);
grant select on public.ref_faixas to authenticated;
revoke all on public.ref_faixas from anon;

create table public.athlete_data_sources (
 athlete_id uuid not null references public.athletes(id) on delete cascade,
 tipo text not null, status text not null default 'active' check(status in ('active','disconnected','erasure_requested')),
 conectado_em timestamptz not null default now(), escopo_professor boolean not null default true,
 updated_at timestamptz not null default now(), primary key(athlete_id,tipo)
);
alter table public.athlete_data_sources enable row level security;
create policy athlete_sources_owner on public.athlete_data_sources for all to authenticated
 using (exists(select 1 from athletes a where a.id=athlete_id and (a.user_id=(select auth.uid()) or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=(select auth.uid())))))
 with check (exists(select 1 from athletes a where a.id=athlete_id and (a.user_id=(select auth.uid()) or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=(select auth.uid())))));
grant select on public.athlete_data_sources to authenticated;

create table public.athlete_reassessment_settings (
 athlete_id uuid primary key references public.athletes(id) on delete cascade,
 interval_weeks integer not null default 8 check(interval_weeks between 2 and 52),
 reminder_enabled boolean not null default false, updated_at timestamptz not null default now()
);
alter table public.athlete_reassessment_settings enable row level security;
create policy reassessment_owner_read on public.athlete_reassessment_settings for select to authenticated using(public.fn_assessment_can_read(athlete_id));
grant select on public.athlete_reassessment_settings to authenticated;

-- H2 event model: no simulated sensor readings and no write endpoint until a real device is integrated.
create table public.avaliacao_tentativas (
 id uuid primary key default gen_random_uuid(), avaliacao_id uuid not null references public.avaliacoes_unificadas(id) on delete cascade,
 teste text not null, ordem integer not null check(ordem>0), carga_kg numeric not null check(carga_kg>=0),
 reps integer not null check(reps>=0), valida boolean not null, velocidade_ms numeric check(velocidade_ms>=0),
 origem_velocidade text, created_at timestamptz not null default now(), unique(avaliacao_id,teste,ordem),
 check(velocidade_ms is null or nullif(trim(origem_velocidade),'') is not null)
);
alter table public.avaliacao_tentativas enable row level security;
create policy attempts_read on public.avaliacao_tentativas for select to authenticated using(exists(select 1 from avaliacoes_unificadas a where a.id=avaliacao_id and public.fn_assessment_can_read(a.athlete_id)));
grant select on public.avaliacao_tentativas to authenticated;
create index assessment_athlete_date_hub_idx on public.avaliacoes_unificadas(athlete_id,data_avaliacao,id);

create or replace function public.fn_save_assessment_preferences(p_athlete_id uuid,p_interval_weeks integer default null,p_reminder boolean default null,p_source text default null,p_source_status text default null,p_share_coach boolean default null)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from athletes a where a.id=p_athlete_id and (a.user_id=auth.uid() or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=auth.uid()))) then raise exception 'not authorized' using errcode='42501'; end if;
 if p_interval_weeks is not null and p_interval_weeks not between 2 and 52 then raise exception 'Intervalo inválido'; end if;
 if p_interval_weeks is not null or p_reminder is not null then
 insert into athlete_reassessment_settings(athlete_id,interval_weeks,reminder_enabled) values(p_athlete_id,coalesce(p_interval_weeks,8),coalesce(p_reminder,false))
 on conflict(athlete_id) do update set interval_weeks=coalesce(p_interval_weeks,athlete_reassessment_settings.interval_weeks),reminder_enabled=coalesce(p_reminder,athlete_reassessment_settings.reminder_enabled),updated_at=now();
 end if;
 if p_source is not null then
 if p_source_status is not null and p_source_status not in ('active','disconnected','erasure_requested') then raise exception 'Status inválido'; end if;
 if not exists(select 1 from avaliacoes_unificadas where athlete_id=p_athlete_id and origem=p_source) and not exists(select 1 from athlete_data_sources where athlete_id=p_athlete_id and tipo=p_source) then raise exception 'Fonte não vinculada a este perfil'; end if;
 insert into athlete_data_sources(athlete_id,tipo,status,escopo_professor) values(p_athlete_id,p_source,coalesce(p_source_status,'active'),coalesce(p_share_coach,true))
 on conflict(athlete_id,tipo) do update set status=coalesce(p_source_status,athlete_data_sources.status),escopo_professor=coalesce(p_share_coach,athlete_data_sources.escopo_professor),updated_at=now();
 end if;
 return jsonb_build_object('success',true);
end; $$;
revoke all on function public.fn_save_assessment_preferences(uuid,integer,boolean,text,text,boolean) from public,anon;
grant execute on function public.fn_save_assessment_preferences(uuid,integer,boolean,text,text,boolean) to authenticated;

create or replace function public.fn_assessment_record_excluded(p_athlete_id uuid,p_date date,p_exercise text,p_value numeric)
returns boolean language sql stable set search_path=public as $$
 with metric as (select case when lower(p_exercise) like '%supino%' then 'rm1_empurrar_superior' when lower(p_exercise) ~ '(leg press|agachamento)' then 'rm1_empurrar_perna' when lower(p_exercise) ~ '(remada|puxada)' then 'rm1_puxar_costas' when lower(p_exercise) ~ '(stiff|terra)' then 'rm1_puxar_inferior' end key),
 matching as(select a.*,public.fn_assessment_is_official(to_jsonb(a)) official from avaliacoes_unificadas a,metric m where a.athlete_id=p_athlete_id and a.data_avaliacao=p_date and (to_jsonb(a)->>m.key)::numeric=p_value)
 select exists(select 1 from matching where not official) and not exists(select 1 from matching where official);
$$;
revoke all on function public.fn_assessment_record_excluded(uuid,date,text,numeric) from public,anon;
grant execute on function public.fn_assessment_record_excluded(uuid,date,text,numeric) to authenticated;

create or replace function public.fn_get_assessment_hub(p_athlete_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_owner boolean; v_assessments jsonb; v_sources jsonb; v_workouts jsonb; v_loads jsonb; v_records jsonb; v_age int; v_gender text; v_settings jsonb;
begin
 if not public.fn_assessment_can_read(p_athlete_id) then raise exception 'not authorized' using errcode='42501'; end if;
 select (a.user_id=auth.uid() or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=auth.uid())),coalesce(extract(year from age(current_date,a.birthdate))::int,a.age),lower(a.gender)
 into v_owner,v_age,v_gender from athletes a where a.id=p_athlete_id;
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('oficial',public.fn_assessment_is_official(to_jsonb(a))) order by a.data_avaliacao,a.created_at,a.id),'[]') into v_assessments
 from avaliacoes_unificadas a where a.athlete_id=p_athlete_id and (coalesce(v_owner,false) or not exists(select 1 from athlete_data_sources s where s.athlete_id=p_athlete_id and s.tipo=a.origem and not s.escopo_professor));
 select coalesce(jsonb_agg(x),'[]') into v_sources from (
 select o.origem tipo,o.n registros,o.ultima,coalesce(s.status,'active') status,coalesce(s.escopo_professor,true) escopo_professor,s.conectado_em
 from (select origem,count(*) n,max(data_avaliacao) ultima from avaliacoes_unificadas where athlete_id=p_athlete_id group by origem)o
 left join athlete_data_sources s on s.athlete_id=p_athlete_id and s.tipo=o.origem
 where coalesce(v_owner,false) or coalesce(s.escopo_professor,true)
 )x;
 select coalesce(jsonb_agg(x order by x.date),'[]') into v_workouts from (
 select 'fitpro:'||id id,workout_date date,coalesce(phase_name,'Treino concluído') name,total_volume_kg "volumeKg",avg_rpe rpe,'FitPro' source from workout_executions where athlete_id=p_athlete_id and status='completed'
 union all select 'progress:'||id,data_treino,coalesce(nome,'Treino concluído'),volume_total,pse_medio,'Progress Tracker' from treinos_realizados where athlete_id=p_athlete_id
 )x;
 select coalesce(jsonb_agg(x order by x.date),'[]') into v_loads from (
 select 'fitpro:'||s.id id,e.workout_date date,s.exercise_name exercise,s.actual_weight kg,s.actual_reps reps,'FitPro' source from workout_exercise_sets s join workout_executions e on e.id=s.execution_id where e.athlete_id=p_athlete_id and e.status='completed' and s.completed and s.actual_weight>0
 union all select 'progress:'||id,data_registro,exercicio,carga_max,reps,'Progress Tracker' from registros_carga where athlete_id=p_athlete_id and carga_max>0
 )x;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.data_pr,'exercise',r.exercicio,'value',r.valor,'unit',r.unidade) order by r.data_pr),'[]') into v_records from personal_records r where r.athlete_id=p_athlete_id and not public.fn_assessment_record_excluded(r.athlete_id,r.data_pr,r.exercicio,r.valor);
 select to_jsonb(s)-'athlete_id' into v_settings from athlete_reassessment_settings s where athlete_id=p_athlete_id;
 return jsonb_build_object('contract_version',2,'can_manage',coalesce(v_owner,false),'assessments',v_assessments,'sources',v_sources,'workouts',v_workouts,'loads',v_loads,'records',v_records,
 'goals',coalesce((select jsonb_agg(to_jsonb(m) order by prazo nulls last) from metas_progresso m where athlete_id=p_athlete_id),'[]'),
 'references',coalesce((select jsonb_agg(to_jsonb(r)) from ref_faixas r where v_age between idade_min and idade_max and lower(sexo)=v_gender),'[]'),
 'settings',coalesce(v_settings,jsonb_build_object('interval_weeks',8,'reminder_enabled',false)));
end; $$;
revoke all on function public.fn_get_assessment_hub(uuid) from public,anon;
grant execute on function public.fn_get_assessment_hub(uuid) to authenticated;

create or replace function public.fn_get_avaliacao_detalhe(p_athlete_id uuid,p_avaliacao_id uuid,p_comparar text default 'anterior')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_hub jsonb; v_current jsonb; v_compare jsonb; v_attempts jsonb;
begin
 if p_comparar not in ('anterior','primeira') then raise exception 'Comparação inválida'; end if;
 v_hub:=public.fn_get_assessment_hub(p_athlete_id);
 select value into v_current from jsonb_array_elements(v_hub->'assessments') where value->>'id'=p_avaliacao_id::text;
 if v_current is null then raise exception 'Avaliação não encontrada para este perfil' using errcode='42501'; end if;
 select value into v_compare from jsonb_array_elements(v_hub->'assessments') where value->>'id'<>p_avaliacao_id::text and (value->>'data_avaliacao',value->>'created_at',value->>'id')<(v_current->>'data_avaliacao',v_current->>'created_at',v_current->>'id')
 and (value->>'oficial')::boolean=(v_current->>'oficial')::boolean and value->>'origem'=case when (v_current->>'oficial')::boolean then value->>'origem' else v_current->>'origem' end
 order by case when p_comparar='primeira' then value->>'data_avaliacao' end asc,case when p_comparar='anterior' then value->>'data_avaliacao' end desc,value->>'created_at' desc limit 1;
 select coalesce(jsonb_agg(to_jsonb(t) order by teste,ordem),'[]') into v_attempts from avaliacao_tentativas t where avaliacao_id=p_avaliacao_id;
 return jsonb_build_object('avaliacao',v_current,'comparacao',v_compare,'tipo_comparacao',p_comparar,'historico',v_hub->'assessments','references',v_hub->'references','tentativas',v_attempts,'testes',public.fn_assessment_tests(v_current,v_compare,v_hub->'assessments',v_hub->'references'));
end; $$;
revoke all on function public.fn_get_avaliacao_detalhe(uuid,uuid,text) from public,anon;
grant execute on function public.fn_get_avaliacao_detalhe(uuid,uuid,text) to authenticated;

-- Existing definitions were inspected before this migration. Keep the existing response shape.
do $migration$
declare d text;
begin
 select pg_get_functiondef('public.fn_get_ron_progresso_screen(uuid)'::regprocedure) into d;
 d:=replace(d,'WHERE athlete_id = p_athlete_id AND score_global > 0','WHERE athlete_id = p_athlete_id AND score_global > 0 AND public.fn_assessment_is_official(to_jsonb(avaliacoes_unificadas))');
 d:=replace(d,'FROM public.personal_records','FROM (SELECT * FROM public.personal_records WHERE NOT public.fn_assessment_record_excluded(athlete_id,data_pr,exercicio,valor)) personal_records');
 execute d;
 select pg_get_functiondef('public.fn_get_historico_performance(uuid)'::regprocedure) into d;
 d:=replace(d,'BEGIN',E'BEGIN\n IF NOT public.fn_assessment_can_read(p_athlete_id) THEN RAISE EXCEPTION ''not authorized'' USING ERRCODE=''42501''; END IF;');
 execute d;
 select pg_get_functiondef('public.salvar_avaliacao(uuid,jsonb)'::regprocedure) into d;
 d:=replace(d,'DECLARE v_exists boolean;','DECLARE v_exists boolean; v_aluno_id uuid;');
 d:=replace(d,'BEGIN',E'BEGIN\n SELECT al.id INTO v_aluno_id FROM public.alunos al WHERE al.id=p_estudante_id AND al.professor_id=auth.uid();\n IF v_aluno_id IS NULL THEN SELECT a.aluno_id INTO v_aluno_id FROM public.athletes a WHERE a.id=p_estudante_id AND (a.coach_id=auth.uid() OR EXISTS(SELECT 1 FROM public.alunos al WHERE al.id=a.aluno_id AND al.professor_id=auth.uid())); END IF;\n IF auth.uid() IS NULL OR v_aluno_id IS NULL THEN RAISE EXCEPTION ''not authorized'' USING ERRCODE=''42501''; END IF;');
 d:=replace(d,E'p_estudante_id, ''manual''',E'v_aluno_id, ''manual''');
 d:=replace(d,'EXCEPTION WHEN OTHERS THEN','EXCEPTION WHEN insufficient_privilege THEN RAISE; WHEN OTHERS THEN');
 execute d;
end $migration$;

revoke all on function public.check_and_create_pr_from_assessment(uuid) from public,anon,authenticated;
grant execute on function public.check_and_create_pr_from_assessment(uuid) to service_role;

-- Self-reported and estimated assessments remain stored, but cannot create official PRs.
create or replace function public.trg_fn_create_pr_from_assessment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if coalesce(new.origem,'') not in ('avaliacao_guiada','peso_avulso','autoavaliacao') and not(coalesce(new.dados_adicionais->'confianca','{}'::jsonb)::text like '%ESTIMADO%') then perform public.check_and_create_pr_from_assessment(new.id); end if;
 return new;
end; $$;

-- Daily reminder is opt-in, idempotent, and uses the existing notifications inbox.
create or replace function public.fn_emit_reassessment_reminders()
returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into notifications(user_id,type,event_type,title,message,action_url,related_table,related_id)
 select coalesce(a.user_id,l.user_id),'info','reassessment_reminder','Sua reavaliação está próxima','A reavaliação sugerida está a 3 dias. Confirme a data com seu professor.','/9fit/progresso/reavaliacao','avaliacoes_unificadas',last_a.id
 from athlete_reassessment_settings s join athletes a on a.id=s.athlete_id
 left join lateral(select user_id from athlete_auth_link where athlete_id=a.id limit 1)l on true
 join lateral(select au.id,au.data_avaliacao from avaliacoes_unificadas au where au.athlete_id=a.id and public.fn_assessment_is_official(to_jsonb(au)) order by data_avaliacao desc,created_at desc limit 1)last_a on true
 where s.reminder_enabled and last_a.data_avaliacao+s.interval_weeks*7=current_date+3 and coalesce(a.user_id,l.user_id) is not null
 and not exists(select 1 from notifications n where n.user_id=coalesce(a.user_id,l.user_id) and n.event_type='reassessment_reminder' and n.related_id=last_a.id);
 get diagnostics n=row_count; return n;
end; $$;
revoke all on function public.fn_emit_reassessment_reminders() from public,anon,authenticated;
grant execute on function public.fn_emit_reassessment_reminders() to service_role;
select cron.schedule('assessment-reassessment-reminders','0 12 * * *','select public.fn_emit_reassessment_reminders()');

-- Metric catalog is mirrored by assessmentMetrics.ts in both products.
create or replace function public.fn_assessment_tests(p_row jsonb,p_previous jsonb,p_history jsonb,p_refs jsonb)
returns jsonb language plpgsql immutable set search_path=public as $fn$
declare m jsonb; v numeric; old numeric; confidence text; band jsonb; result jsonb:='[]'; is_record boolean; ref jsonb;
begin
 for m in select value from jsonb_array_elements($catalog$[{"key":"peso","label":"Peso","unit":"kg","pillar":"composicao"},{"key":"altura","label":"Altura","unit":"cm","pillar":"composicao"},{"key":"imc","label":"IMC","unit":"kg/m²","pillar":"composicao"},{"key":"gordura_corporal","label":"Gordura corporal","unit":"%","pillar":"composicao"},{"key":"massa_muscular","label":"Massa muscular","unit":"kg","pillar":"composicao"},{"key":"massa_magra","label":"Massa magra","unit":"kg","pillar":"composicao"},{"key":"massa_gorda","label":"Massa gorda","unit":"kg","pillar":"composicao"},{"key":"agua_corporal","label":"Água corporal","unit":"%","pillar":"composicao"},{"key":"taxa_metabolica","label":"Taxa metabólica","unit":"kcal","pillar":"composicao"},{"key":"circunferencia_braco","label":"Circunferência · Braço","unit":"cm","pillar":"composicao"},{"key":"circunferencia_peitoral","label":"Circunferência · Peitoral","unit":"cm","pillar":"composicao"},{"key":"circunferencia_cintura","label":"Circunferência · Cintura","unit":"cm","pillar":"composicao"},{"key":"circunferencia_quadril","label":"Circunferência · Quadril","unit":"cm","pillar":"composicao"},{"key":"circunferencia_coxa","label":"Circunferência · Coxa","unit":"cm","pillar":"composicao"},{"key":"circunferencia_panturrilha","label":"Circunferência · Panturrilha","unit":"cm","pillar":"composicao"},{"key":"dobra_triceps","label":"Dobra · Tríceps","unit":"mm","pillar":"composicao"},{"key":"dobra_peitoral","label":"Dobra · Peitoral","unit":"mm","pillar":"composicao"},{"key":"dobra_abdominal","label":"Dobra · Abdominal","unit":"mm","pillar":"composicao"},{"key":"dobra_suprailiaca","label":"Dobra · Suprailíaca","unit":"mm","pillar":"composicao"},{"key":"dobra_coxa","label":"Dobra · Coxa","unit":"mm","pillar":"composicao"},{"key":"dobra_panturrilha","label":"Dobra · Panturrilha","unit":"mm","pillar":"composicao"},{"key":"dobra_subescapular","label":"Dobra · Subescapular","unit":"mm","pillar":"composicao"},{"key":"dobra_axilar_media","label":"Dobra · Axilar média","unit":"mm","pillar":"composicao"},{"key":"rm1_empurrar_superior","label":"Supino · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rm1_empurrar_perna","label":"Empurrar perna · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rm1_puxar_costas","label":"Puxada / remada · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rm1_puxar_inferior","label":"Puxar inferior · 1RM","unit":"kg","pillar":"forca","higher":true},{"key":"rml_abs","label":"Abdominais","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_flexao","label":"Flexões","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_agachamento","label":"Agachamentos","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_pull","label":"Barra fixa","unit":"reps","pillar":"resistencia","higher":true},{"key":"rml_elevacao_p","label":"Elevação pélvica","unit":"reps","pillar":"resistencia","higher":true},{"key":"core_prancha_seg","label":"Prancha","unit":"s","pillar":"core","higher":true},{"key":"core_side_plank_esq_seg","label":"Prancha lateral esquerda","unit":"s","pillar":"core","higher":true},{"key":"core_side_plank_dir_seg","label":"Prancha lateral direita","unit":"s","pillar":"core","higher":true},{"key":"cardio_bpm_repouso","label":"Frequência cardíaca de repouso","unit":"bpm","pillar":"cardio"},{"key":"cardio_bpm_max","label":"Frequência cardíaca máxima","unit":"bpm","pillar":"cardio"},{"key":"cardio_sprint_vel","label":"Velocidade no sprint","unit":"km/h","pillar":"cardio","higher":true},{"key":"vo2_estimado","label":"VO₂ máximo estimado","unit":"ml/kg/min","pillar":"cardio","trust":"ESTIMADO"},{"key":"fc_recuperacao_1min","label":"Recuperação em 1 minuto","unit":"bpm","pillar":"cardio"},{"key":"mob_overhead_squat","label":"Overhead squat","unit":"pts","pillar":"mobilidade","higher":true},{"key":"mob_quadril","label":"Mobilidade de quadril","unit":"pts","pillar":"mobilidade","higher":true},{"key":"mob_tornozelo","label":"Mobilidade de tornozelo","unit":"pts","pillar":"mobilidade","higher":true},{"key":"mob_ombro","label":"Mobilidade de ombro","unit":"pts","pillar":"mobilidade","higher":true},{"key":"gordura_bioimpedancia","label":"Gordura por bioimpedância","unit":"%","pillar":"composicao","trust":"DERIVADO"}]$catalog$::jsonb) loop
 if coalesce(p_row->>(m->>'key'),p_row#>>array['dados_adicionais',m->>'key']) is null then continue; end if;
 begin v:=coalesce(p_row->>(m->>'key'),p_row#>>array['dados_adicionais',m->>'key'])::numeric; exception when invalid_text_representation then continue; end;
 if v::text in ('NaN','Infinity','-Infinity') then continue; end if;
 confidence:=coalesce(p_row#>>array['dados_adicionais','confianca',m->>'key'],m->>'trust',case when m->>'key' in ('imc','massa_magra','massa_gorda') or (m->>'key'='gordura_corporal' and p_row#>>'{dados_adicionais,metodo_gordura_score}'='dobras') then 'DERIVADO' else 'CONFIRMADO' end);
 if m->>'key'='vo2_estimado' then confidence:='ESTIMADO'; end if;
 if confidence not in ('CONFIRMADO','DERIVADO','ESTIMADO','NAO_DISPONIVEL') then confidence:='NAO_DISPONIVEL'; end if;
 old:=null; begin old:=coalesce(p_previous->>(m->>'key'),p_previous#>>array['dados_adicionais',m->>'key'])::numeric; exception when invalid_text_representation then old:=null; end;
 ref:=null; band:=null;
 select value into ref from jsonb_array_elements(coalesce(p_refs,'[]')) where value->>'teste'=m->>'key' and value->>'protocolo'=p_row#>>'{dados_adicionais,protocolo}' and value->>'unidade'=m->>'unit' limit 1;
 if ref is not null then select value into band from jsonb_array_elements(ref->'limites') where (value->>'min' is null or v>=(value->>'min')::numeric) and (value->>'max' is null or v<(value->>'max')::numeric) limit 1; end if;
 is_record:=false;
 if coalesce((p_row->>'oficial')::boolean,false) and coalesce((m->>'higher')::boolean,false) and confidence in ('CONFIRMADO','DERIVADO') then
 select count(*)>0 and v>max((value->>(m->>'key'))::numeric) into is_record from jsonb_array_elements(coalesce(p_history,'[]')) where (value->>'oficial')::boolean and value->>'data_avaliacao'<p_row->>'data_avaliacao' and value->>(m->>'key') is not null and coalesce(value#>>array['dados_adicionais','confianca',m->>'key'],'CONFIRMADO')<>'ESTIMADO';
 end if;
 result:=result||jsonb_build_array(jsonb_build_object('chave',m->>'key','rotulo',m->>'label','pilar',m->>'pillar','valor',v,'unidade',m->>'unit','delta',case when confidence='ESTIMADO' then null else v-old end,'recorde',coalesce(is_record,false),'confianca',confidence,'faixa',band->>'rotulo','fonte',case when band is not null then ref->>'fonte' end));
 end loop;
 return result;
end; $fn$;
revoke all on function public.fn_assessment_tests(jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.fn_assessment_tests(jsonb,jsonb,jsonb,jsonb) to authenticated;
