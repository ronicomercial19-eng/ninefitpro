
DO $$
DECLARE v_def text; v_anchor text := '  v_peso := public.fn_guided_num(p_data, ''peso'', 20, 400);';
BEGIN
 SELECT pg_get_functiondef('public.fn_salvar_avaliacao_guiada_v2(uuid,jsonb,boolean,date)'::regprocedure) INTO v_def;
 IF strpos(v_def,v_anchor)=0 THEN RAISE EXCEPTION 'guided_guard_anchor_missing'; END IF;
 IF strpos(v_def,'guided_requires_measure')>0 THEN RETURN; END IF;
 v_def := replace(v_def, v_anchor,
 '  IF NOT EXISTS (SELECT 1 FROM jsonb_each_text(p_data) e WHERE e.key IN (''peso'',''altura'',''gordura_corporal'',''circunferencia_cintura'',''circunferencia_quadril'',''circunferencia_braco'',''circunferencia_coxa'',''circunferencia_panturrilha'',''circunferencia_pescoco'',''rml_flexao'',''rml_agachamento'',''rml_abs'',''rml_pull'',''rml_elevacao_p'',''core_prancha_seg'',''core_side_plank_esq_seg'',''core_side_plank_dir_seg'',''cardio_bpm_repouso'',''rm1_empurrar_superior'',''rm1_empurrar_perna'',''rm1_puxar_costas'',''sentar_levantar_30s'',''step_test_fc_1min'',''equilibrio_unipodal_esq_seg'',''equilibrio_unipodal_dir_seg'',''sentar_alcancar_cm'') AND nullif(btrim(e.value),'''') IS NOT NULL)
     AND NOT (jsonb_typeof(p_data->''fotos'')=''array'' AND jsonb_array_length(p_data->''fotos'')>0)
  THEN RAISE EXCEPTION ''Informe ao menos uma medida para salvar a avaliação'' USING ERRCODE=''22023'', HINT=''guided_requires_measure''; END IF;'
 || E'\n' || v_anchor);
 EXECUTE v_def;
END $$;
;
