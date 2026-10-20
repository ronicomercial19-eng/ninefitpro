-- Refine existing readers without changing historical rows or score formulas.
do $migration$
declare d text;
begin
 select pg_get_functiondef('public.fn_assessment_is_official(jsonb)'::regprocedure) into d;
 d:=replace(d,'c.value=''ESTIMADO''','c.value not in (''CONFIRMADO'',''DERIVADO'')');
 execute d;
 select pg_get_functiondef('public.fn_get_historico_performance(uuid)'::regprocedure) into d;
 d:=replace(d,'WHERE athlete_id = p_athlete_id','WHERE athlete_id = p_athlete_id AND public.fn_assessment_is_official(to_jsonb(avaliacoes_unificadas))');
 execute d;
end $migration$;

create or replace function public.check_and_create_pr_from_assessment(p_assessment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_row record; t record; previous_max numeric;
begin
 select * into v_row from avaliacoes_unificadas where id=p_assessment_id;
 if v_row.id is null or v_row.athlete_id is null or coalesce(v_row.origem,'') in ('avaliacao_guiada','peso_avulso','autoavaliacao') then return; end if;
 for t in select * from (values
 ('rm1_empurrar_perna','Leg Press (1RM)',v_row.rm1_empurrar_perna),
 ('rm1_puxar_costas','Remada (1RM)',v_row.rm1_puxar_costas),
 ('rm1_empurrar_superior','Supino Reto (1RM)',v_row.rm1_empurrar_superior),
 ('rm1_puxar_inferior','Stiff (1RM)',v_row.rm1_puxar_inferior)) m(key,label,value)
 loop
 if t.value is null or t.value<=0 or coalesce(v_row.dados_adicionais#>>array['confianca',t.key],'CONFIRMADO') not in ('CONFIRMADO','DERIVADO') then continue; end if;
 select greatest(coalesce((select max((to_jsonb(a)->>t.key)::numeric) from avaliacoes_unificadas a where a.athlete_id=v_row.athlete_id and a.id<>v_row.id and a.data_avaliacao<=v_row.data_avaliacao and coalesce(a.origem,'') not in ('avaliacao_guiada','peso_avulso','autoavaliacao') and coalesce(a.dados_adicionais#>>array['confianca',t.key],'CONFIRMADO') in ('CONFIRMADO','DERIVADO')),0),coalesce((select max(valor) from personal_records r where r.athlete_id=v_row.athlete_id and r.exercicio=t.label and r.data_pr<=v_row.data_avaliacao and not public.fn_assessment_record_excluded(r.athlete_id,r.data_pr,r.exercicio,r.valor)),0)) into previous_max;
 if t.value>previous_max and not exists(select 1 from personal_records where athlete_id=v_row.athlete_id and exercicio=t.label and data_pr=v_row.data_avaliacao and valor=t.value) then
 insert into personal_records(athlete_id,exercicio,tipo,valor,unidade,data_pr) values(v_row.athlete_id,t.label,'forca',t.value,'kg',v_row.data_avaliacao);
 end if;
 end loop;
end; $$;
