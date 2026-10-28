CREATE OR REPLACE FUNCTION public.fn_add_hydration(p_athlete_id uuid,p_amount_ml integer DEFAULT 250)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE total integer;u uuid;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'account_required' USING ERRCODE='42501';END IF;
 IF p_athlete_id IS NULL OR NOT coalesce(p_athlete_id=public.fn_current_athlete_id() OR private.fitpro_can_manage_athlete(p_athlete_id),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_amount_ml IS NULL OR p_amount_ml NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid_water_amount';END IF;
 INSERT INTO public.hydration_logs(athlete_id,amount_ml,log_date)VALUES(p_athlete_id,p_amount_ml,(now() AT TIME ZONE 'America/Sao_Paulo')::date);
 SELECT coalesce(sum(amount_ml),0) INTO total FROM public.hydration_logs WHERE athlete_id=p_athlete_id AND log_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
 SELECT user_id INTO u FROM public.athletes WHERE id=p_athlete_id;
 IF u IS NOT NULL THEN INSERT INTO public.master_registry(user_id,event_type,source,payload)VALUES(u,'hydration_log','app',jsonb_build_object('amount_ml',p_amount_ml,'athlete_id',p_athlete_id));END IF;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.fn_add_hydration(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_add_hydration(uuid,integer) TO authenticated;

-- Retain the existing execution/protocol receipts and award calculation. Add
-- identity, source validation and receipts for the two other active UI callers.
DO $migration$
DECLARE d text;guard text:=$guard$
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'account_required' USING ERRCODE='42501';END IF;
 IF NOT coalesce(p_athlete_id=public.fn_current_athlete_id() OR private.fitpro_can_manage_athlete(p_athlete_id),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_metadata IS NULL OR jsonb_typeof(p_metadata)<>'object' OR octet_length(p_metadata::text)>4096 THEN RAISE EXCEPTION 'invalid_reward_metadata';END IF;
 IF p_source IS NULL OR p_source NOT IN('workout_completed','protocol_completed','check_in','complete_profile_7d','share_bonus') THEN RAISE EXCEPTION 'verified_reward_source_required' USING ERRCODE='42501';END IF;
 IF p_source='check_in' THEN
  IF NOT EXISTS(SELECT 1 FROM public.class_bookings b WHERE b.id::text=p_metadata->>'booking_id' AND b.check_in_at IS NOT NULL AND(b.user_id IN(SELECT user_id FROM public.athletes WHERE id=p_athlete_id UNION SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=p_athlete_id))) THEN RAISE EXCEPTION 'confirmed_booking_required';END IF;
  v_event:='booking:'||(p_metadata->>'booking_id');p_amount:=50;
 ELSIF p_source='complete_profile_7d' THEN
  IF p_athlete_id IS DISTINCT FROM public.fn_current_athlete_id() OR NOT EXISTS(SELECT 1 FROM public.user_context_settings WHERE user_id=auth.uid() AND pdi_completed_at IS NOT NULL) OR coalesce((public.fn_get_daily_context()->>'streak')::int,0)<7 THEN RAISE EXCEPTION 'confirmed_consistency_required';END IF;
  v_event:='complete_profile_7d';p_amount:=500;
 END IF;
$guard$;
BEGIN
 SELECT pg_get_functiondef('public.fn_award_xp(uuid,integer,text,jsonb)'::regprocedure) INTO d;
 IF d !~ E'\nbegin\n' OR position('v_event text' IN d)=0 THEN RAISE EXCEPTION 'xp_contract_changed';END IF;
 d:=regexp_replace(d,E'\nbegin\n',E'\nbegin\n'||guard);
 EXECUTE d;
END $migration$;
NOTIFY pgrst,'reload schema';
