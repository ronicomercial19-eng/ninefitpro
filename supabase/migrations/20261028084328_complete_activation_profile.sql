-- Completing the PDI confirms all nine answers; a draft never completes it.
-- Existing completed profiles are preserved until their owner edits the ficha.
CREATE OR REPLACE FUNCTION public.fn_save_pdi(p_patch jsonb,p_complete boolean DEFAULT false,p_preferences jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
 v_uid uuid:=auth.uid();v_existing jsonb;v_row public.user_parameters;
 v_keys text[];v_pref jsonb;v_completed timestamptz;k text;
BEGIN
 IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR public.fn_current_athlete_id() IS NULL THEN RAISE EXCEPTION 'athlete_profile_required' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pdi:'||v_uid::text,0));
 IF p_patch IS NULL OR p_preferences IS NULL OR jsonb_typeof(p_patch)<>'object' OR jsonb_typeof(p_preferences)<>'object' THEN RAISE EXCEPTION 'invalid_profile';END IF;
 IF octet_length(p_patch::text)>8192 OR octet_length(p_preferences::text)>4096 THEN RAISE EXCEPTION 'profile_payload_too_large';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) f WHERE f NOT IN('goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions','base_location_sp')) THEN RAISE EXCEPTION 'unsupported_profile_field';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_preferences) f WHERE f NOT IN('session_minutes','training_environment','assistance','reduced_motion')) THEN RAISE EXCEPTION 'unsupported_preference';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_patch||p_preferences) e WHERE e.value='null'::jsonb) THEN RAISE EXCEPTION 'null_profile_field';END IF;
 IF p_preferences?'session_minutes' AND (jsonb_typeof(p_preferences->'session_minutes')<>'number' OR (p_preferences->>'session_minutes')!~'^[0-9]+$' OR (p_preferences->>'session_minutes')::numeric NOT BETWEEN 10 AND 120) THEN RAISE EXCEPTION 'invalid_session_minutes';END IF;
 IF p_preferences?'training_environment' AND p_preferences->>'training_environment' NOT IN('home','gym','outdoors') THEN RAISE EXCEPTION 'invalid_environment';END IF;
 IF p_preferences?'assistance' AND p_preferences->>'assistance' NOT IN('guided','autonomous','technical') THEN RAISE EXCEPTION 'invalid_assistance';END IF;
 IF p_preferences?'reduced_motion' AND jsonb_typeof(p_preferences->'reduced_motion')<>'boolean' THEN RAISE EXCEPTION 'invalid_motion_preference';END IF;
 FOREACH k IN ARRAY ARRAY['volume_tolerance','stress_sensitivity','time_horizon'] LOOP
  IF p_patch?k AND (jsonb_typeof(p_patch->k)<>'number' OR (p_patch->>k)!~'^[0-9]+$') THEN RAISE EXCEPTION 'invalid_numeric_profile_field';END IF;
 END LOOP;
 IF p_patch?'time_horizon' AND (p_patch->>'time_horizon')::numeric NOT BETWEEN 1 AND 52 THEN RAISE EXCEPTION 'invalid_time_horizon';END IF;
 IF p_patch?'volume_tolerance' AND (p_patch->>'volume_tolerance')::numeric NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'invalid_volume_tolerance';END IF;
 IF p_patch?'stress_sensitivity' AND (p_patch->>'stress_sensitivity')::numeric NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'invalid_stress_sensitivity';END IF;
 FOREACH k IN ARRAY ARRAY['injury_zones','dietary_restrictions'] LOOP
  IF p_patch?k THEN
   IF jsonb_typeof(p_patch->k)<>'array' THEN RAISE EXCEPTION 'invalid_profile_list';END IF;
   IF jsonb_array_length(p_patch->k)>6 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_patch->k) e WHERE jsonb_typeof(e)<>'string') THEN RAISE EXCEPTION 'invalid_profile_list';END IF;
   IF k='injury_zones' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_patch->k) e WHERE e NOT IN('knee','shoulder','back','elbow','ankle','hip')) THEN RAISE EXCEPTION 'invalid_injury_zone';END IF;
   IF k='dietary_restrictions' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_patch->k) e WHERE e NOT IN('vegan','vegetarian','lactose','gluten')) THEN RAISE EXCEPTION 'invalid_dietary_restriction';END IF;
  END IF;
 END LOOP;
 IF p_patch?'base_location_sp' AND (jsonb_typeof(p_patch->'base_location_sp')<>'string' OR length(p_patch->>'base_location_sp')>200) THEN RAISE EXCEPTION 'invalid_location';END IF;
 IF p_complete AND NOT(p_patch?&ARRAY['goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions']) THEN RAISE EXCEPTION 'complete_declared_profile_required';END IF;
 SELECT to_jsonb(u) INTO v_existing FROM public.user_parameters u WHERE user_id=v_uid;
 v_existing:=coalesce(v_existing,'{}')||p_patch||jsonb_build_object('user_id',v_uid);
 SELECT * INTO v_row FROM jsonb_populate_record(NULL::public.user_parameters,v_existing);
 IF p_patch<>'{}'::jsonb THEN
  INSERT INTO public.user_parameters(user_id,goal,recovery_rate,volume_tolerance,peak_window,stress_sensitivity,discomfort_tolerance,time_horizon,injury_zones,dietary_restrictions,base_location_sp)
  VALUES(v_uid,coalesce(v_row.goal,'performance'),coalesce(v_row.recovery_rate,'medium'),coalesce(v_row.volume_tolerance,5),coalesce(v_row.peak_window,'morning'),coalesce(v_row.stress_sensitivity,5),coalesce(v_row.discomfort_tolerance,'moderate'),coalesce(v_row.time_horizon,12),coalesce(v_row.injury_zones,'{}'),coalesce(v_row.dietary_restrictions,'{}'),v_row.base_location_sp)
  ON CONFLICT(user_id) DO UPDATE SET goal=excluded.goal,recovery_rate=excluded.recovery_rate,volume_tolerance=excluded.volume_tolerance,peak_window=excluded.peak_window,stress_sensitivity=excluded.stress_sensitivity,discomfort_tolerance=excluded.discomfort_tolerance,time_horizon=excluded.time_horizon,injury_zones=excluded.injury_zones,dietary_restrictions=excluded.dietary_restrictions,base_location_sp=excluded.base_location_sp;
 END IF;
 SELECT coalesce(declared_keys,'{}'),coalesce(preferences,'{}') INTO v_keys,v_pref FROM public.user_context_settings WHERE user_id=v_uid FOR UPDATE;
 SELECT array_agg(DISTINCT f) INTO v_keys FROM(SELECT unnest(coalesce(v_keys,'{}')) f UNION SELECT jsonb_object_keys(p_patch)) t;
 INSERT INTO public.user_context_settings(user_id,pdi_completed_at,declared_keys,preferences)
 VALUES(v_uid,CASE WHEN p_complete THEN now() END,coalesce(v_keys,'{}'),coalesce(v_pref,'{}')||p_preferences)
 ON CONFLICT(user_id) DO UPDATE SET pdi_completed_at=coalesce(user_context_settings.pdi_completed_at,excluded.pdi_completed_at),declared_keys=excluded.declared_keys,preferences=excluded.preferences,updated_at=now()
 RETURNING pdi_completed_at INTO v_completed;
 RETURN jsonb_build_object('saved',true,'source','declared','completed_at',v_completed,'declared_keys',v_keys);
END $$;
REVOKE ALL ON FUNCTION public.fn_save_pdi(jsonb,boolean,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_pdi(jsonb,boolean,jsonb) TO authenticated;
-- Preserve old completion dates as history, while reporting full completion
-- only when all nine answers and their backing parameter row exist.
DO $migration$
DECLARE d text;old_expression text:=$old$'complete',exists(select 1 from public.user_context_settings s where s.user_id=v_uid and s.pdi_completed_at is not null)$old$;
BEGIN
 SELECT pg_get_functiondef('public.fn_get_daily_context()'::regprocedure) INTO d;
 IF position(old_expression IN d)=0 THEN RAISE EXCEPTION 'daily_context_profile_contract_changed';END IF;
 d:=replace(d,old_expression,$new$'complete',exists(select 1 from public.user_context_settings s join public.user_parameters u on u.user_id=s.user_id where s.user_id=v_uid and s.pdi_completed_at is not null and s.declared_keys @> ARRAY['goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions'])$new$);
 EXECUTE d;
END $migration$;
NOTIFY pgrst,'reload schema';
