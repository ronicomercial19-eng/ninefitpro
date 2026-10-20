-- A coach must not recover withheld assessment values through the PR collection.
do $migration$
declare d text;
begin
 select pg_get_functiondef('public.fn_get_assessment_hub(uuid)'::regprocedure) into d;
 d:=replace(d,'''unit'',r.unidade)','''unit'',r.unidade,''type'',r.tipo)');
 d:=replace(d,'r.athlete_id=p_athlete_id and not public.fn_assessment_record_excluded',E'r.athlete_id=p_athlete_id and (coalesce(v_owner,false) or not exists(select 1 from athlete_data_sources withheld where withheld.athlete_id=p_athlete_id and not withheld.escopo_professor)) and not public.fn_assessment_record_excluded');
 execute d;
end $migration$;
