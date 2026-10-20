-- The old and new blocks share a single client RPC and preserve the old payload shape.
do $migration$
declare d text;
begin
 select pg_get_functiondef('public.fn_get_assessment_hub(uuid)'::regprocedure) into d;
 d:=replace(d,'''contract_version'',2,','''contract_version'',2,''legacy_screen'',case when coalesce(v_owner,false) then public.fn_get_ron_progresso_screen(p_athlete_id) else ''{}''::jsonb end,');
 execute d;
 select pg_get_functiondef('public.salvar_avaliacao(uuid,jsonb)'::regprocedure) into d;
 d:=replace(d,'for item in select',E'if jsonb_typeof(v_payload->''flags_inteligentes'')=''string'' then v_payload:=jsonb_set(v_payload,''{flags_inteligentes}'',(v_payload->>''flags_inteligentes'')::jsonb); end if;\n for item in select');
 execute d;
end $migration$;
