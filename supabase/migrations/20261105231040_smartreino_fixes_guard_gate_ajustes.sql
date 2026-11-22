ALTER TABLE public.daily_workouts ADD COLUMN IF NOT EXISTS ajustes_anteriores jsonb;

DO $$
DECLARE
  d text; nd text;
  old_guard text; new_guard text;
  old_gate text; new_gate text;
  old_del text; new_del text;
  n int;
BEGIN
  -- 1) fn_aplicar_protocolo_9x9x9: aceitar coach/admin via assert_athlete_access
  SELECT pg_get_functiondef('public.fn_aplicar_protocolo_9x9x9(uuid,text,date)'::regprocedure) INTO d;
  old_guard := E'  IF auth.uid() IS NULL OR NOT EXISTS (\n    SELECT 1 FROM public.athletes a WHERE a.id = p_athlete_id AND (\n      a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id = a.id AND l.user_id = auth.uid())\n    )\n  ) THEN RAISE EXCEPTION ''not authorized'' USING ERRCODE = ''42501''; END IF;';
  new_guard := '  PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);';
  n := (length(d) - length(replace(d, old_guard, ''))) / length(old_guard);
  IF n <> 1 THEN RAISE EXCEPTION 'guard match count = %', n; END IF;
  nd := replace(d, old_guard, new_guard);
  EXECUTE nd;

  -- 2) prescrever_treino: exigir os 4 blocos (gate) + 3) preservar changes_json antes de zerar
  SELECT pg_get_functiondef('public.prescrever_treino(uuid,date)'::regprocedure) INTO d;

  old_gate := 'IF jsonb_array_length(coalesce(v_dia_treino->''bloco9'',''[]''::jsonb))=0 THEN';
  new_gate := 'IF jsonb_array_length(coalesce(v_dia_treino->''neural'',''[]''::jsonb))=0 OR jsonb_array_length(coalesce(v_dia_treino->''integracao'',''[]''::jsonb))=0 OR jsonb_array_length(coalesce(v_dia_treino->''bloco9'',''[]''::jsonb))=0 OR jsonb_array_length(coalesce(v_dia_treino->''reset'',''[]''::jsonb))=0 THEN';
  n := (length(d) - length(replace(d, old_gate, ''))) / length(old_gate);
  IF n <> 1 THEN RAISE EXCEPTION 'gate match count = %', n; END IF;
  nd := replace(d, old_gate, new_gate);

  old_del := '    DELETE FROM workout_exercises WHERE daily_workout_id = v_daily_workout_id;';
  new_del := '    UPDATE daily_workouts SET ajustes_anteriores = changes_json WHERE id = v_daily_workout_id AND changes_json IS NOT NULL AND changes_json <> ''{}''::jsonb;' || E'\n' || old_del;
  n := (length(nd) - length(replace(nd, old_del, ''))) / length(old_del);
  IF n <> 1 THEN RAISE EXCEPTION 'delete match count = %', n; END IF;
  nd := replace(nd, old_del, new_del);
  EXECUTE nd;
END $$;;
