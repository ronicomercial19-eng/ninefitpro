
DO $$
DECLARE v_def text; v_old text := 'AND NOT (jsonb_typeof(p_data->''fotos'')=''array'' AND jsonb_array_length(p_data->''fotos'')>0)';
BEGIN
 SELECT pg_get_functiondef('public.fn_salvar_avaliacao_guiada_v2(uuid,jsonb,boolean,date)'::regprocedure) INTO v_def;
 IF strpos(v_def,v_old)=0 THEN RAISE EXCEPTION 'guard_fragment_missing'; END IF;
 v_def := replace(v_def, v_old, 'AND NOT coalesce(jsonb_typeof(p_data->''fotos'')=''array'' AND jsonb_array_length(p_data->''fotos'')>0, false)');
 EXECUTE v_def;
END $$;
;
