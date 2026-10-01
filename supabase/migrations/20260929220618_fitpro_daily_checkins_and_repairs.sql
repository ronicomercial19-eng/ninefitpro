-- Self-reported completion. Does not invent GPS, calories, sets or meal macros.
CREATE OR REPLACE FUNCTION public.fn_fitpro_daily_checkin(p_kind text, p_date date, p_slot text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_athlete uuid; v_id uuid; v_event text; v_goal record; v_goal_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  IF p_kind NOT IN ('treino','nutri','move') OR p_date IS NULL OR abs(p_date - current_date) > 1 OR length(p_slot) > 40 THEN RAISE EXCEPTION 'invalid_checkin'; END IF;
  v_athlete := public.fn_current_athlete_id();
  IF v_athlete IS NULL THEN RAISE EXCEPTION 'athlete_not_found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || p_kind || p_date::text || p_slot, 0));
  SELECT id INTO v_id FROM public.master_registry WHERE user_id=v_user AND source='fitpro_daily_checkin' AND payload->>'kind'=p_kind AND payload->>'date'=p_date::text AND payload->>'slot'=p_slot LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN jsonb_build_object('success',true,'already_completed',true,'id',v_id); END IF;
  IF p_kind='move' THEN
    SELECT * INTO v_goal FROM public.metas_progresso WHERE athlete_id=v_athlete AND status='ativa' AND (metrica IN ('distancia','corrida') OR unidade='km') ORDER BY created_at DESC LIMIT 1;
    IF v_goal.id IS NULL THEN RAISE EXCEPTION 'Cadastre sua meta de corrida em Progresso antes de concluir o MOVE.'; END IF;
    UPDATE public.metas_progresso SET valor_atual=valor_meta,status='concluida',updated_at=now() WHERE id=v_goal.id;
    v_goal_id := v_goal.id;
  END IF;
  v_event := CASE p_kind WHEN 'treino' THEN 'workout_complete' WHEN 'nutri' THEN 'nutrition_checkin' ELSE 'move_completed' END;
  INSERT INTO public.master_registry(user_id,event_type,source,payload) VALUES(v_user,v_event,'fitpro_daily_checkin',jsonb_build_object('kind',p_kind,'date',p_date,'slot',p_slot,'athlete_id',v_athlete,'self_reported',true,'goal_id',v_goal_id)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('success',true,'id',v_id);
END $$;
REVOKE ALL ON FUNCTION public.fn_fitpro_daily_checkin(text,date,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_daily_checkin(text,date,text) TO authenticated;
