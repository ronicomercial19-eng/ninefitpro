-- Shared professional/student workspace. No reassignment or historical data rewrite.
CREATE OR REPLACE FUNCTION public.fn_coach_students()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'user_id',coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)),'goal',coalesce(a.primary_goal,a.objetivo),'active',coalesce(a.activated,false)) ORDER BY a.name,a.id),'[]'::jsonb)
 FROM public.athletes a WHERE auth.uid() IS NOT NULL AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
 AND private.fitpro_can_manage_athlete(a.id) AND a.is_test_account IS NOT TRUE;
$$;
REVOKE ALL ON FUNCTION public.fn_coach_students() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_students() TO authenticated;
CREATE OR REPLACE FUNCTION private.fitpro_student_context(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := (SELECT coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)) FROM public.athletes a WHERE a.id=p_athlete_id); v_id uuid := p_athlete_id;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_c public.daily_checkins;
  v_meals integer := 0; v_water integer := 0; v_done boolean := false; v_started boolean := false; v_scheduled boolean := false; v_rest boolean := false; v_review integer;
  v_readiness numeric := null; v_coverage numeric := 0; v_dimensions jsonb := '{}'::jsonb; v_complete boolean := false; v_safe boolean := false; v_streak integer := 0; v_settings public.user_context_settings; v_declared jsonb; v_observed jsonb; v_hours jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT private.fitpro_can_manage_athlete(p_athlete_id) OR coalesce((auth.jwt()->>'is_anonymous')::boolean, true) THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  IF v_id IS NULL THEN RETURN jsonb_build_object('version', 3, 'status', 'no_athlete_profile', 'date', v_today); END IF;
  SELECT * INTO v_settings FROM public.user_context_settings WHERE user_id=v_uid;
  SELECT coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) INTO v_declared
  FROM public.user_parameters p CROSS JOIN LATERAL jsonb_each(to_jsonb(p)) e
  WHERE p.user_id=v_uid AND e.value<>'null'::jsonb AND e.key=ANY(coalesce(v_settings.declared_keys,'{}'::text[]));
  SELECT coalesce(jsonb_agg(t ORDER BY samples DESC,training_window),'[]'::jsonb) INTO v_hours FROM (
    SELECT CASE WHEN extract(hour FROM started_at AT TIME ZONE 'America/Sao_Paulo')<12 THEN 'morning'
      WHEN extract(hour FROM started_at AT TIME ZONE 'America/Sao_Paulo')<18 THEN 'afternoon' ELSE 'night' END training_window,count(*) samples
    FROM public.workout_executions WHERE athlete_id=v_id AND status='completed' AND started_at IS NOT NULL AND workout_date BETWEEN v_today-29 AND v_today GROUP BY 1
  ) t;
  WITH active_days AS (
    SELECT checkin_date d FROM public.daily_checkins WHERE athlete_id=v_id AND sono BETWEEN 1 AND 5 AND energia BETWEEN 1 AND 5 AND humor BETWEEN 1 AND 5 AND motivacao BETWEEN 1 AND 5 AND dor BETWEEN 1 AND 5
    UNION SELECT workout_date FROM public.workout_executions WHERE athlete_id=v_id AND status='completed'
    UNION SELECT date FROM public.nutrition_logs WHERE athlete_id=v_id
    UNION SELECT log_date FROM public.hydration_logs WHERE athlete_id=v_id
    UNION SELECT review_date FROM public.athlete_day_reviews WHERE athlete_id=v_id AND rating IS NOT NULL
  ) SELECT jsonb_build_object('source','durable_records','window_days',30,
    'active_days_30d',(SELECT count(*) FROM active_days WHERE d BETWEEN v_today-29 AND v_today),
    'completed_workouts_30d',(SELECT count(*) FROM public.workout_executions WHERE athlete_id=v_id AND status='completed' AND workout_date BETWEEN v_today-29 AND v_today),
    'nutrition_days_30d',(SELECT count(DISTINCT date) FROM public.nutrition_logs WHERE athlete_id=v_id AND date BETWEEN v_today-29 AND v_today),
    'hydration_days_30d',(SELECT count(DISTINCT log_date) FROM public.hydration_logs WHERE athlete_id=v_id AND log_date BETWEEN v_today-29 AND v_today),
    'review_days_30d',(SELECT count(*) FROM public.athlete_day_reviews WHERE athlete_id=v_id AND rating IS NOT NULL AND review_date BETWEEN v_today-29 AND v_today),
    'training_windows',v_hours) INTO v_observed;
  SELECT * INTO v_c FROM public.daily_checkins WHERE athlete_id = v_id AND checkin_date = v_today;
  v_complete := coalesce(v_c.sono BETWEEN 1 AND 5 AND v_c.energia BETWEEN 1 AND 5 AND v_c.humor BETWEEN 1 AND 5 AND v_c.motivacao BETWEEN 1 AND 5 AND v_c.dor BETWEEN 1 AND 5,false);
  IF v_complete THEN v_readiness := round(((v_c.sono - 1) * 30 + (v_c.energia - 1) * 30 + ((6 - v_c.dor) - 1) * 20 + (v_c.humor - 1) * 10 + (v_c.motivacao - 1) * 10) / 4.0); END IF;
  SELECT count(*) INTO v_meals FROM public.nutrition_logs WHERE athlete_id = v_id AND date = v_today;
  SELECT coalesce(sum(amount_ml), 0) INTO v_water FROM public.hydration_logs WHERE athlete_id = v_id AND log_date = v_today;
  SELECT exists(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_id AND workout_date=v_today AND status='completed'), exists(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_id AND workout_date=v_today AND status IN ('in_progress','paused','started')) INTO v_done, v_started;
  SELECT exists(SELECT 1 FROM public.daily_workouts WHERE athlete_id=v_id AND workout_date=v_today AND coalesce(workout_type,'') NOT IN ('rest','recovery','descanso')), exists(SELECT 1 FROM public.daily_workouts WHERE athlete_id=v_id AND workout_date=v_today AND workout_type IN ('rest','recovery','descanso')) INTO v_scheduled, v_rest;
  SELECT rating INTO v_review FROM public.athlete_day_reviews WHERE athlete_id=v_id AND review_date=v_today;
  v_rest := v_rest OR exists(SELECT 1 FROM public.athlete_day_reviews WHERE athlete_id=v_id AND review_date=v_today AND training_choice='rest');
  v_safe := coalesce(v_c.dor >= 3, false) OR nullif(btrim(v_c.dor_local), '') IS NOT NULL;
  v_safe := v_safe OR coalesce(jsonb_array_length(v_declared->'injury_zones'),0)>0 OR exists(SELECT 1 FROM public.pain_reports WHERE athlete_id=v_id AND coalesce(status,'pending') NOT IN ('resolved','dismissed') AND created_at>=now()-interval '24 hours');
  WITH days AS (SELECT generate_series(v_today - 6, v_today, interval '1 day')::date AS d)
  SELECT jsonb_build_object(
    'treino', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.workout_executions w WHERE w.athlete_id=v_id AND w.workout_date=d AND w.status='completed')) * 100.0 / 7),
    'nutri', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.nutrition_logs n WHERE n.athlete_id=v_id AND n.date=d)) * 100.0 / 7),
    'sono', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.daily_checkins c WHERE c.athlete_id=v_id AND c.checkin_date=d AND c.sono BETWEEN 1 AND 5)) * 100.0 / 7),
    'hidr', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.hydration_logs h WHERE h.athlete_id=v_id AND h.log_date=d)) * 100.0 / 7),
    'calibracao', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.daily_checkins c WHERE c.athlete_id=v_id AND c.checkin_date=d AND c.sono BETWEEN 1 AND 5 AND c.energia BETWEEN 1 AND 5 AND c.humor BETWEEN 1 AND 5 AND c.motivacao BETWEEN 1 AND 5 AND c.dor BETWEEN 1 AND 5)) * 100.0 / 7)
  ) INTO v_dimensions FROM days;
  SELECT round(avg(value::numeric)) INTO v_coverage FROM jsonb_each_text(v_dimensions);
  WITH days AS (
    SELECT DISTINCT checkin_date d FROM public.daily_checkins WHERE athlete_id=v_id AND checkin_date<=v_today
      AND sono BETWEEN 1 AND 5 AND energia BETWEEN 1 AND 5 AND humor BETWEEN 1 AND 5 AND motivacao BETWEEN 1 AND 5 AND dor BETWEEN 1 AND 5
  ), anchor AS (SELECT max(d) d FROM days WHERE d>=v_today-1), numbered AS (
    SELECT days.d,row_number() OVER(ORDER BY days.d DESC)::integer n FROM days WHERE days.d<=(SELECT d FROM anchor)
  ) SELECT count(*) INTO v_streak FROM numbered WHERE numbered.d=(SELECT d FROM anchor)-numbered.n+1;
  RETURN jsonb_build_object(
    'version',3,'status','available','date',v_today,'generated_at',now(),
    'profile',jsonb_build_object(
      'complete',exists(select 1 from public.user_context_settings s where s.user_id=v_uid and s.pdi_completed_at is not null),
      'completed_at',(select s.pdi_completed_at from public.user_context_settings s where s.user_id=v_uid),
      'declared',v_declared,
      'preferences',coalesce((select s.preferences from public.user_context_settings s where s.user_id=v_uid),'{}'::jsonb),
      'observed',v_observed,
      'inferred',jsonb_build_object('training_window',CASE WHEN coalesce((v_hours->0->>'samples')::integer,0)>=5 THEN v_hours->0->>'training_window' END,'source','workout_started_at','requires_confirmation',true)
    ),
    'calibration',jsonb_build_object('complete',v_complete,'sleep',v_c.sono,'energy',v_c.energia,'mood',v_c.humor,'motivation',v_c.motivacao,'pain',v_c.dor,'pain_location',v_c.dor_local,'observed_at',v_c.created_at),
    'safety',jsonb_build_object('review_required',v_safe,'reason',CASE WHEN v_safe THEN 'pain_reported' END,'is_medical_clearance',false),
    'today',jsonb_build_object('workout_completed',v_done,'workout_in_progress',v_started,'workout_scheduled',v_scheduled,'rest_day',v_rest,'meals',v_meals,'water_ml',v_water,'review',v_review),
    'sync',jsonb_build_object('value',v_readiness,'readiness',v_readiness,'status',CASE WHEN v_complete THEN 'available' ELSE 'not_collected' END,'confidence',CASE WHEN v_complete THEN 'self_report_complete' ELSE 'insufficient_daily_signals' END,'record_coverage',v_coverage,'coverage_dimensions',v_dimensions,'formula','SYNC diário: sono 30% + energia 30% + dor invertida 20% + humor 10% + motivação 10%. Cobertura de 7 dias é exibida separadamente e não altera o SYNC.','parameters',jsonb_build_object('scale','1-5','required_signals',5,'business_timezone','America/Sao_Paulo','window','dia local atual'),'source','daily_checkins/durable_records','is_medical_clearance',false),
    'streak',v_streak);
END;
$function$;



REVOKE ALL ON FUNCTION private.fitpro_student_context(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.fn_coach_student_context(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_context jsonb;v_uid uuid;v_today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 v_context:=private.fitpro_student_context(p_athlete_id);
 SELECT coalesce(a.user_id,(SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=a.id ORDER BY created_at LIMIT 1)) INTO v_uid FROM public.athletes a WHERE a.id=p_athlete_id;
 RETURN jsonb_build_object('version',1,'generated_at',now(),
 'athlete',(SELECT jsonb_build_object('id',id,'name',name,'goal',coalesce(primary_goal,objetivo),'restrictions',injuries_limitations) FROM public.athletes WHERE id=p_athlete_id),
 'daily_context',v_context,
 'workouts',coalesce((SELECT jsonb_agg(t ORDER BY workout_date DESC) FROM (SELECT id,workout_date,status,completed_at,duration_minutes,avg_rpe,daily_workout_id FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date BETWEEN v_today-29 AND v_today ORDER BY workout_date DESC LIMIT 60)t),'[]'::jsonb),
 'prescriptions',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,training_name,start_date,end_date,is_active,training_type FROM public.student_training_assignments WHERE student_id=p_athlete_id ORDER BY created_at DESC LIMIT 20)t),'[]'::jsonb),
 'assessments',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,data_avaliacao,peso,gordura_corporal,massa_muscular,score_global FROM public.avaliacoes_unificadas WHERE athlete_id=p_athlete_id ORDER BY data_avaliacao DESC LIMIT 10)t),'[]'::jsonb),
 'pain_reports',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,body_region,intensity,status,source,created_at FROM public.pain_reports WHERE athlete_id=p_athlete_id ORDER BY created_at DESC LIMIT 20)t),'[]'::jsonb),
 'activities',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,recorded_at,distance_m,duration_seconds,source FROM public.bio_activity_logs WHERE user_id=v_uid AND source='move_gps' ORDER BY recorded_at DESC LIMIT 20)t),'[]'::jsonb),
 'habits',coalesce((SELECT jsonb_agg(jsonb_build_object('id',h.id,'title',h.title,'target_per_week',h.target_per_week,'dates',coalesce((SELECT jsonb_agg(d.habit_date ORDER BY d.habit_date DESC) FROM public.student_habit_days d WHERE d.habit_id=h.id AND d.user_id=v_uid AND d.habit_date>=v_today-29),'[]'::jsonb))) FROM public.student_habits h WHERE h.user_id=v_uid),'[]'::jsonb),
 'protocols',coalesce((SELECT jsonb_agg(t) FROM (SELECT c.protocol_id,p.name,c.completion_date FROM private.student_protocol_completions c JOIN public.biohacker_protocols p ON p.id=c.protocol_id WHERE c.athlete_id=p_athlete_id ORDER BY c.completion_date DESC LIMIT 30)t),'[]'::jsonb),
 'appointments',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,title,scheduled_at,duration,status FROM public.appointments WHERE student_id=p_athlete_id AND scheduled_at>=now()-interval '30 days' ORDER BY scheduled_at DESC LIMIT 30)t),'[]'::jsonb),
 'nutrition',(SELECT jsonb_build_object('meals',count(*),'days',count(DISTINCT date)) FROM public.nutrition_logs WHERE athlete_id=p_athlete_id AND date BETWEEN v_today-29 AND v_today),
 'hydration',(SELECT jsonb_build_object('water_ml',coalesce(sum(amount_ml),0),'days',count(DISTINCT log_date)) FROM public.hydration_logs WHERE athlete_id=p_athlete_id AND log_date BETWEEN v_today-29 AND v_today));
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_student_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_student_context(uuid) TO authenticated;

CREATE TABLE private.professor_delivery_receipts(
 request_id uuid PRIMARY KEY,actor_id uuid NOT NULL,athlete_id uuid NOT NULL REFERENCES public.athletes(id),fingerprint text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE private.professor_delivery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.professor_delivery_receipts FROM PUBLIC,anon,authenticated;
CREATE TABLE public.student_prescription_versions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),athlete_id uuid NOT NULL REFERENCES public.athletes(id),daily_workout_id uuid NOT NULL REFERENCES public.daily_workouts(id),author_id uuid NOT NULL,request_id uuid NOT NULL UNIQUE,snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX student_prescription_versions_athlete ON public.student_prescription_versions(athlete_id,created_at DESC);
ALTER TABLE public.student_prescription_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY prescription_version_read ON public.student_prescription_versions FOR SELECT TO authenticated
 USING((SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND (private.fitpro_can_manage_athlete(athlete_id) OR athlete_id=(SELECT public.fn_current_athlete_id())));
REVOKE ALL ON public.student_prescription_versions FROM anon,authenticated;
GRANT SELECT ON public.student_prescription_versions TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_professor_publish_workout(p_athlete_id uuid,p_date date,p_title text,p_exercises jsonb,p_request_id uuid,p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_day public.daily_workouts;v_item jsonb;v_order integer:=0;v_fingerprint text;v_receipt private.professor_delivery_receipts;v_result jsonb;v_target uuid;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR p_date IS NULL OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 120 OR jsonb_typeof(p_exercises) IS DISTINCT FROM 'array' OR jsonb_array_length(p_exercises) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'invalid_prescription';END IF;
 v_fingerprint:=md5(jsonb_build_array(p_athlete_id,p_date,p_title,p_exercises,p_expected_updated_at)::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO v_receipt FROM private.professor_delivery_receipts WHERE request_id=p_request_id;
 IF FOUND THEN IF v_receipt.actor_id<>auth.uid() OR v_receipt.fingerprint<>v_fingerprint THEN RAISE EXCEPTION 'request_conflict';END IF;RETURN v_receipt.result||jsonb_build_object('already_published',true);END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text||p_date::text,0));
 IF EXISTS(SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=p_date AND status IN('started','in_progress','paused','completed','skipped')) THEN RAISE EXCEPTION 'workout_already_started' USING ERRCODE='55000';END IF;
 SELECT * INTO v_day FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=p_date ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
 IF FOUND AND (p_expected_updated_at IS NULL OR coalesce(v_day.updated_at,v_day.created_at) IS DISTINCT FROM p_expected_updated_at) THEN RAISE EXCEPTION 'prescription_changed_reload' USING ERRCODE='40001';END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
  IF NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=(v_item->>'exercise_id')::uuid) OR (v_item->>'sets')::integer NOT BETWEEN 1 AND 10 OR nullif(btrim(v_item->>'reps_range'),'') IS NULL OR length(v_item->>'reps_range')>60 OR (v_item->>'rest_seconds')::integer NOT BETWEEN 0 AND 600 OR NOT(v_item ?& ARRAY['exercise_id','sets','reps_range','rest_seconds']) THEN RAISE EXCEPTION 'invalid_exercise';END IF;
 END LOOP;
 IF v_day.id IS NULL THEN
  INSERT INTO public.daily_workouts(athlete_id,workout_date,day_number,day_name,focus_muscles,workout_type,override_locked,updated_at) VALUES(p_athlete_id,p_date,extract(isodow FROM p_date),btrim(p_title),ARRAY[]::text[],'hypertrophy',true,now()) RETURNING * INTO v_day;
 ELSE
  INSERT INTO public.student_prescription_versions(athlete_id,daily_workout_id,author_id,request_id,snapshot)
  VALUES(p_athlete_id,v_day.id,auth.uid(),gen_random_uuid(),jsonb_build_object('source','baseline_before_edit','captured_by',auth.uid(),'title',v_day.day_name,'date',v_day.workout_date,'exercises',(SELECT coalesce(jsonb_agg(to_jsonb(w) ORDER BY w.exercise_order),'[]'::jsonb) FROM public.workout_exercises w WHERE w.daily_workout_id=v_day.id)));
  DELETE FROM public.workout_exercises WHERE daily_workout_id=v_day.id;
  UPDATE public.daily_workouts SET day_name=btrim(p_title),override_locked=true,updated_at=now() WHERE id=v_day.id RETURNING * INTO v_day;
 END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_exercises) LOOP
  v_order:=v_order+1;
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds,notes,override_locked)
  VALUES(v_day.id,(v_item->>'exercise_id')::uuid,v_order,(v_item->>'sets')::integer,v_item->>'reps_range',(v_item->>'rest_seconds')::integer,left(v_item->>'notes',1000),true);
 END LOOP;
 UPDATE public.daily_workouts SET changes_json=jsonb_build_object('source','professor_review','exercises',(SELECT jsonb_agg(jsonb_build_object('exercise_id',w.exercise_id,'sets',w.sets,'reps',w.reps_range,'rest_seconds',w.rest_seconds,'name',e.name,'order',w.exercise_order) ORDER BY w.exercise_order) FROM public.workout_exercises w JOIN public.exercises e ON e.id=w.exercise_id WHERE w.daily_workout_id=v_day.id)) WHERE id=v_day.id;
 INSERT INTO public.student_prescription_versions(athlete_id,daily_workout_id,author_id,request_id,snapshot) VALUES(p_athlete_id,v_day.id,auth.uid(),p_request_id,jsonb_build_object('title',p_title,'date',p_date,'exercises',p_exercises));
 SELECT coalesce(a.user_id,(SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=a.id ORDER BY created_at LIMIT 1)) INTO v_target FROM public.athletes a WHERE a.id=p_athlete_id;
 IF v_target IS NOT NULL AND current_setting('fitpro.suppress_workout_notice',true) IS DISTINCT FROM 'true' THEN INSERT INTO public.notifications(user_id,title,message,type,action_url,related_id,related_table) VALUES(v_target,'Treino publicado','Seu profissional publicou o treino de '||p_date::text||'.','info','/9fit/train?tab=semana&date='||p_date::text,v_day.id,'daily_workouts');END IF;
 v_result:=jsonb_build_object('saved',true,'daily_workout_id',v_day.id,'athlete_id',p_athlete_id,'date',p_date,'updated_at',v_day.updated_at,'already_published',false);
 INSERT INTO private.professor_delivery_receipts VALUES(p_request_id,auth.uid(),p_athlete_id,v_fingerprint,v_result,now());
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_publish_workout(uuid,date,text,jsonb,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_publish_workout(uuid,date,text,jsonb,uuid,timestamptz) TO authenticated;

-- Native professional/student conversation, separate from personal AI and support.
CREATE OR REPLACE FUNCTION private.fitpro_can_read_student(p_athlete_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND private.fitpro_actor_role() IS NOT NULL
 AND (private.fitpro_can_manage_athlete(p_athlete_id) OR EXISTS(SELECT 1 FROM public.athletes WHERE id=p_athlete_id AND user_id=auth.uid()) OR EXISTS(SELECT 1 FROM public.athlete_auth_link WHERE athlete_id=p_athlete_id AND user_id=auth.uid()));
$$;
REVOKE ALL ON FUNCTION private.fitpro_can_read_student(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fitpro_can_read_student(uuid) TO authenticated;
CREATE TABLE public.student_professional_messages(
 id uuid PRIMARY KEY,athlete_id uuid NOT NULL REFERENCES public.athletes(id),sender_user_id uuid NOT NULL REFERENCES auth.users(id),sender_role text NOT NULL CHECK(sender_role IN('student','professional')),body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 4000),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX student_professional_messages_history ON public.student_professional_messages(athlete_id,created_at DESC,id DESC);
ALTER TABLE public.student_professional_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_message_read ON public.student_professional_messages FOR SELECT TO authenticated USING(private.fitpro_can_read_student(athlete_id));
REVOKE ALL ON public.student_professional_messages FROM anon,authenticated;
GRANT SELECT ON public.student_professional_messages TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_student_professional()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=public.fn_current_athlete_id();v_result jsonb;
BEGIN
 IF NOT coalesce(private.fitpro_can_read_student(v_id),false) THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501';END IF;
 SELECT jsonb_build_object('athlete_id',a.id,'coach_name',p.full_name,'available',a.coach_id IS NOT NULL AND p.is_active IS NOT FALSE) INTO v_result FROM public.athletes a LEFT JOIN public.profiles p ON p.user_id=a.coach_id WHERE a.id=v_id;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.fn_student_professional() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_student_professional() TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_send_student_message(p_athlete_id uuid,p_body text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old public.student_professional_messages;v_role text;v_receiver uuid;v_coach uuid;
BEGIN
 IF NOT coalesce(private.fitpro_can_read_student(p_athlete_id),false) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR length(btrim(coalesce(p_body,''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid_message';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO v_old FROM public.student_professional_messages WHERE id=p_request_id;
 IF FOUND THEN IF v_old.sender_user_id<>auth.uid() OR v_old.athlete_id<>p_athlete_id OR v_old.body<>btrim(p_body) THEN RAISE EXCEPTION 'request_conflict';END IF;RETURN jsonb_build_object('saved',true,'id',v_old.id,'already_sent',true);END IF;
 SELECT coach_id INTO v_coach FROM public.athletes WHERE id=p_athlete_id;
 IF v_coach IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=v_coach AND is_active IS NOT FALSE AND role::text IN('professor','trainer','admin','super_admin')) THEN RAISE EXCEPTION 'professional_unavailable';END IF;
 v_role:=CASE WHEN private.fitpro_can_manage_athlete(p_athlete_id) THEN 'professional' ELSE 'student' END;
 INSERT INTO public.student_professional_messages(id,athlete_id,sender_user_id,sender_role,body) VALUES(p_request_id,p_athlete_id,auth.uid(),v_role,btrim(p_body));
 IF v_role='student' THEN v_receiver:=v_coach;
 ELSE SELECT coalesce(a.user_id,(SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=a.id ORDER BY created_at LIMIT 1)) INTO v_receiver FROM public.athletes a WHERE a.id=p_athlete_id;END IF;
 IF v_receiver IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,message,type,action_url,related_id,related_table)
 VALUES(v_receiver,'Nova mensagem','Você recebeu uma mensagem na conversa com seu profissional/aluno.','info',CASE WHEN v_role='student' THEN '/app/mensagens?athlete='||p_athlete_id::text ELSE '/9fit/mensagens' END,p_request_id,'student_professional_messages');END IF;
 RETURN jsonb_build_object('saved',true,'id',p_request_id,'already_sent',false);
END $$;
REVOKE ALL ON FUNCTION public.fn_send_student_message(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_send_student_message(uuid,text,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

ALTER POLICY fitpro_postura_read ON public.postura_scans USING(
 (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND (SELECT private.fitpro_actor_role()) IS NOT NULL
 AND CASE WHEN athlete_id IS NOT NULL THEN private.fitpro_can_read_student(athlete_id)
 ELSE user_id=(SELECT auth.uid()) OR EXISTS(SELECT 1 FROM public.athletes a WHERE a.user_id=postura_scans.user_id AND private.fitpro_can_manage_athlete(a.id)) END);
ALTER POLICY fitpro_postura_insert ON public.postura_scans WITH CHECK(
 user_id=(SELECT auth.uid()) AND status='pending' AND (result IS NULL OR result='{}'::jsonb)
 AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND (SELECT private.fitpro_actor_role()) IS NOT NULL
 AND (athlete_id IS NULL OR private.fitpro_can_read_student(athlete_id)));
CREATE OR REPLACE FUNCTION public.fn_coach_overview(p_start date,p_end date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) IS FALSE THEN RAISE EXCEPTION 'professional_required' USING ERRCODE='42501';END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start>p_end OR p_end-p_start>366 THEN RAISE EXCEPTION 'invalid_period';END IF;
 RETURN jsonb_build_object('start',p_start,'end',p_end,'generated_at',now(),'students',coalesce((
 SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'active',coalesce(a.activated,false),'goal',coalesce(a.primary_goal,a.objetivo),
 'completed_workouts',(SELECT count(*) FROM public.workout_executions w WHERE w.athlete_id=a.id AND w.status='completed' AND w.workout_date BETWEEN p_start AND p_end),
 'prescribed_sessions',(SELECT count(*) FROM public.daily_workouts w WHERE w.athlete_id=a.id AND w.workout_date BETWEEN p_start AND p_end AND coalesce(w.workout_type,'') NOT IN('rest','descanso','recovery')),
 'avg_rpe',(SELECT round(avg(w.avg_rpe),1) FROM public.workout_executions w WHERE w.athlete_id=a.id AND w.status='completed' AND w.workout_date BETWEEN p_start AND p_end),
 'duration_minutes',(SELECT coalesce(sum(w.duration_minutes),0) FROM public.workout_executions w WHERE w.athlete_id=a.id AND w.status='completed' AND w.workout_date BETWEEN p_start AND p_end),
 'assignments',coalesce((SELECT jsonb_agg(jsonb_build_object('student_id',student_id,'end_date',end_date,'is_active',is_active)) FROM public.student_training_assignments WHERE student_id=a.id AND is_active),'[]'::jsonb)) ORDER BY a.name,a.id)
 FROM public.athletes a WHERE private.fitpro_can_manage_athlete(a.id) AND a.is_test_account IS NOT TRUE),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_overview(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_overview(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_professor_grant_credits(p_athlete_id uuid,p_amount integer,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.student_credits;v_receipt private.professor_delivery_receipts;v_fingerprint text:=md5(jsonb_build_array('credits',p_athlete_id,p_amount)::text);v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR p_amount IS NULL OR p_amount NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'invalid_credit_amount';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO v_receipt FROM private.professor_delivery_receipts WHERE request_id=p_request_id;
 IF FOUND THEN IF v_receipt.actor_id<>auth.uid() OR v_receipt.fingerprint<>v_fingerprint THEN RAISE EXCEPTION 'request_conflict';END IF;RETURN v_receipt.result;END IF;
 SELECT * INTO v_row FROM public.student_credits WHERE student_id=p_athlete_id FOR UPDATE;
 IF FOUND AND v_row.expires_at IS NOT NULL AND v_row.expires_at<=now() THEN RAISE EXCEPTION 'credit_expired_review_required';END IF;
 INSERT INTO public.student_credits(student_id,total_credits,used_credits) VALUES(p_athlete_id,p_amount,0)
 ON CONFLICT(student_id) DO UPDATE SET total_credits=public.student_credits.total_credits+p_amount,updated_at=now() RETURNING * INTO v_row;
 v_result:=jsonb_build_object('saved',true,'total_credits',v_row.total_credits,'used_credits',v_row.used_credits);
 INSERT INTO private.professor_delivery_receipts VALUES(p_request_id,auth.uid(),p_athlete_id,v_fingerprint,v_result,now());RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_grant_credits(uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_grant_credits(uuid,integer,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION private.fitpro_appointment_conflict_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status::text IN('cancelled','no_show') THEN RETURN NEW;END IF;
 IF coalesce(NEW.duration,60) NOT BETWEEN 1 AND 480 THEN RAISE EXCEPTION 'invalid_appointment_duration';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('teacher:'||coalesce(NEW.teacher_id::text,''),0));
 PERFORM pg_advisory_xact_lock(hashtextextended('student:'||NEW.student_id::text,0));
 IF EXISTS(SELECT 1 FROM public.appointments a WHERE a.id<>NEW.id AND coalesce(a.status::text,'scheduled') NOT IN('cancelled','no_show')
 AND (a.student_id=NEW.student_id OR (NEW.teacher_id IS NOT NULL AND a.teacher_id=NEW.teacher_id))
 AND tstzrange(a.scheduled_at,a.scheduled_at+make_interval(mins=>coalesce(a.duration,60)),'[)') && tstzrange(NEW.scheduled_at,NEW.scheduled_at+make_interval(mins=>coalesce(NEW.duration,60)),'[)')) THEN RAISE EXCEPTION 'appointment_time_conflict' USING ERRCODE='23P01';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_appointment_conflict_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_appointment_conflict BEFORE INSERT OR UPDATE OF scheduled_at,duration,status,student_id,teacher_id ON public.appointments FOR EACH ROW EXECUTE FUNCTION private.fitpro_appointment_conflict_guard();
NOTIFY pgrst,'reload schema';

-- Global AI capabilities and connector configuration are administrative, not student prescription.
DROP POLICY IF EXISTS "skills writable by trainer/admin" ON public.skills;
CREATE POLICY skills_admin_manage ON public.skills FOR ALL TO authenticated
USING((SELECT private.fitpro_actor_role()) IN('admin','super_admin') AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE)
WITH CHECK((SELECT private.fitpro_actor_role()) IN('admin','super_admin') AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
DROP POLICY IF EXISTS "activations writable by trainer/admin" ON public.skill_activations;
CREATE POLICY skill_activations_admin_manage ON public.skill_activations FOR ALL TO authenticated
USING((SELECT private.fitpro_actor_role()) IN('admin','super_admin') AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE)
WITH CHECK((SELECT private.fitpro_actor_role()) IN('admin','super_admin') AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
ALTER POLICY "connectors writable by admin" ON public.api_connectors
USING((SELECT private.fitpro_actor_role()) IN('admin','super_admin') AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE)
WITH CHECK((SELECT private.fitpro_actor_role()) IN('admin','super_admin') AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
CREATE TABLE public.student_workout_drafts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),author_id uuid NOT NULL REFERENCES auth.users(id),athlete_id uuid NOT NULL REFERENCES public.athletes(id),workout_date date NOT NULL,title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 120),exercises jsonb NOT NULL CHECK(jsonb_typeof(exercises)='array' AND jsonb_array_length(exercises)<=40),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(author_id,athlete_id,workout_date));
ALTER TABLE public.student_workout_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY workout_draft_owner ON public.student_workout_drafts FOR ALL TO authenticated
USING(author_id=(SELECT auth.uid()) AND private.fitpro_can_manage_athlete(athlete_id) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE)
WITH CHECK(author_id=(SELECT auth.uid()) AND private.fitpro_can_manage_athlete(athlete_id) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE);
REVOKE ALL ON public.student_workout_drafts FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.student_workout_drafts TO authenticated;

CREATE POLICY fitpro_daily_workouts_coach_select ON public.daily_workouts FOR SELECT TO authenticated
USING((SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND private.fitpro_can_manage_athlete(athlete_id));
CREATE POLICY fitpro_workout_exercises_coach_select ON public.workout_exercises FOR SELECT TO authenticated
USING((SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND EXISTS(SELECT 1 FROM public.daily_workouts d WHERE d.id=workout_exercises.daily_workout_id AND private.fitpro_can_manage_athlete(d.athlete_id)));

CREATE TABLE public.student_training_cycles(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),athlete_id uuid NOT NULL REFERENCES public.athletes(id),author_id uuid NOT NULL REFERENCES auth.users(id),title text NOT NULL,start_date date NOT NULL,end_date date NOT NULL,weeks integer NOT NULL CHECK(weeks BETWEEN 1 AND 12),weekly_template jsonb NOT NULL,request_id uuid NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),CHECK(end_date>=start_date));
CREATE INDEX student_training_cycles_athlete ON public.student_training_cycles(athlete_id,start_date DESC);
ALTER TABLE public.student_training_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY training_cycle_read ON public.student_training_cycles FOR SELECT TO authenticated USING(private.fitpro_can_read_student(athlete_id));
REVOKE ALL ON public.student_training_cycles FROM anon,authenticated;
GRANT SELECT ON public.student_training_cycles TO authenticated;
ALTER TABLE public.daily_workouts ADD COLUMN student_cycle_id uuid REFERENCES public.student_training_cycles(id);
CREATE INDEX daily_workouts_student_cycle ON public.daily_workouts(student_cycle_id) WHERE student_cycle_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.fn_professor_publish_cycle(p_athlete_id uuid,p_start date,p_weeks integer,p_title text,p_drafts jsonb,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_receipt private.professor_delivery_receipts;v_hash text;v_result jsonb;v_cycle uuid;v_item jsonb;v_draft public.student_workout_drafts;v_date date;v_target uuid;v_count integer:=0;v_old_notice text:=current_setting('fitpro.suppress_workout_notice',true);v_template jsonb:='[]'::jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR p_start IS NULL OR p_weeks IS NULL OR p_weeks NOT BETWEEN 1 AND 12 OR length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 120 OR jsonb_typeof(p_drafts) IS DISTINCT FROM 'array' OR jsonb_array_length(p_drafts) NOT BETWEEN 1 AND 7 THEN RAISE EXCEPTION 'invalid_cycle';END IF;
 v_hash:=md5(jsonb_build_array('cycle',p_athlete_id,p_start,p_weeks,p_title,p_drafts)::text);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO v_receipt FROM private.professor_delivery_receipts WHERE request_id=p_request_id;
 IF FOUND THEN IF v_receipt.actor_id<>auth.uid() OR v_receipt.fingerprint<>v_hash THEN RAISE EXCEPTION 'request_conflict';END IF;RETURN v_receipt.result;END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('cycle:'||p_athlete_id::text,0));
 IF EXISTS(SELECT 1 FROM public.student_training_cycles WHERE athlete_id=p_athlete_id AND daterange(start_date,end_date+1,'[)')&&daterange(p_start,p_start+p_weeks*7,'[)')) THEN RAISE EXCEPTION 'cycle_overlap';END IF;
 IF (SELECT count(DISTINCT value->>'weekday') FROM jsonb_array_elements(p_drafts))<>jsonb_array_length(p_drafts) THEN RAISE EXCEPTION 'duplicate_weekday';END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(p_drafts) LOOP
  SELECT * INTO v_draft FROM public.student_workout_drafts WHERE id=(v_item->>'draft_id')::uuid AND author_id=auth.uid() AND athlete_id=p_athlete_id AND workout_date BETWEEN p_start AND p_start+6 FOR SHARE;
  IF NOT FOUND OR v_draft.updated_at IS DISTINCT FROM (v_item->>'updated_at')::timestamptz OR extract(isodow FROM v_draft.workout_date)::integer<>(v_item->>'weekday')::integer THEN RAISE EXCEPTION 'draft_changed_reload' USING ERRCODE='40001';END IF;
  v_template:=v_template||jsonb_build_array(jsonb_build_object('weekday',extract(isodow FROM v_draft.workout_date),'title',v_draft.title,'exercises',v_draft.exercises));
 END LOOP;
 INSERT INTO public.student_training_cycles(athlete_id,author_id,title,start_date,end_date,weeks,weekly_template,request_id) VALUES(p_athlete_id,auth.uid(),btrim(p_title),p_start,p_start+p_weeks*7-1,p_weeks,v_template,p_request_id) RETURNING id INTO v_cycle;
 PERFORM set_config('fitpro.suppress_workout_notice','true',true);
 FOR v_date IN SELECT generate_series(p_start,p_start+p_weeks*7-1,interval '1 day')::date LOOP
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_template) LOOP
   IF extract(isodow FROM v_date)::integer=(v_item->>'weekday')::integer THEN
    v_result:=public.fn_professor_publish_workout(p_athlete_id,v_date,v_item->>'title',v_item->'exercises',md5(p_request_id::text||v_date::text)::uuid,NULL);
    UPDATE public.daily_workouts SET student_cycle_id=v_cycle WHERE id=(v_result->>'daily_workout_id')::uuid;v_count:=v_count+1;
   END IF;
  END LOOP;
 END LOOP;
 PERFORM set_config('fitpro.suppress_workout_notice',coalesce(v_old_notice,'false'),true);
 SELECT coalesce(a.user_id,(SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=a.id ORDER BY created_at LIMIT 1)) INTO v_target FROM public.athletes a WHERE a.id=p_athlete_id;
 IF v_target IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,message,type,action_url,related_id,related_table) VALUES(v_target,'Novo ciclo de treino','Seu profissional publicou um ciclo de '||p_weeks::text||' semanas. Confira as sessões no planejamento.','info','/9fit/planejamento',v_cycle,'student_training_cycles');END IF;
 v_result:=jsonb_build_object('saved',true,'cycle_id',v_cycle,'sessions',v_count,'athlete_id',p_athlete_id);
 INSERT INTO private.professor_delivery_receipts VALUES(p_request_id,auth.uid(),p_athlete_id,v_hash,v_result,now());RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_publish_cycle(uuid,date,integer,text,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_publish_cycle(uuid,date,integer,text,jsonb,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

-- Repair UUID path matching for private periodization PDFs in every reader/uploader.
ALTER POLICY "FitPro periodization PDF read" ON storage.objects
USING(bucket_id='plans-pdfs' AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN private.fitpro_can_read_student(((storage.foldername(name))[1])::uuid) ELSE false END);
ALTER POLICY "FitPro periodization PDF upload" ON storage.objects
WITH CHECK(bucket_id='plans-pdfs' AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid) ELSE false END);
ALTER POLICY "FitPro periodization PDF delete" ON storage.objects
USING(bucket_id='plans-pdfs' AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN private.fitpro_can_manage_athlete(((storage.foldername(name))[1])::uuid) ELSE false END);

CREATE OR REPLACE FUNCTION public.fn_professor_review_adjustment(p_recommendation_id uuid,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.training_adjustment_recommendations;v_status text;
BEGIN
 SELECT * INTO r FROM public.training_adjustment_recommendations WHERE id=p_recommendation_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(r.athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_action NOT IN('accept','reject') OR p_action IS NULL THEN RAISE EXCEPTION 'invalid_review';END IF;
 v_status:=CASE WHEN p_action='accept' THEN 'accepted' ELSE 'rejected' END;
 IF r.status=v_status OR (p_action='accept' AND r.status='applied') THEN RETURN jsonb_build_object('success',true,'already_reviewed',true,'recommendation_id',r.id);END IF;
 IF r.status<>'pending' THEN RAISE EXCEPTION 'recommendation_already_reviewed';END IF;
 UPDATE public.training_adjustment_recommendations SET status=v_status,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=r.id;
 RETURN jsonb_build_object('success',true,'recommendation_id',r.id,'status',v_status);
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_review_adjustment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_review_adjustment(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_professor_adjustment_preview(p_recommendation_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.training_adjustment_recommendations;v_rows jsonb;v_percent numeric;v_supported boolean;
BEGIN
 SELECT * INTO r FROM public.training_adjustment_recommendations WHERE id=p_recommendation_id;
 IF NOT FOUND OR auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(r.athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 v_supported:=r.recommendation_type='reduce_volume' AND jsonb_typeof(r.proposed_changes->'reduce_volume_percent')='number' AND (SELECT count(*) FROM jsonb_object_keys(coalesce(r.proposed_changes,'{}'::jsonb)))=1;
 IF v_supported THEN v_percent:=(r.proposed_changes->>'reduce_volume_percent')::numeric;v_supported:=v_percent BETWEEN 1 AND 50;END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('daily_workout_id',d.id,'date',d.workout_date,'exercise_id',w.exercise_id,'row_id',w.id,'name',e.name,'old_sets',w.sets,'new_sets',CASE WHEN v_supported THEN greatest(1,floor(w.sets*(100-v_percent)/100)::integer) ELSE w.sets END,'reps_range',w.reps_range,'rest_seconds',w.rest_seconds,'notes',w.notes,'updated_at',d.updated_at) ORDER BY d.workout_date,d.id,w.exercise_order,w.id),'[]'::jsonb) INTO v_rows
 FROM public.daily_workouts d JOIN public.workout_exercises w ON w.daily_workout_id=d.id JOIN public.exercises e ON e.id=w.exercise_id
 WHERE d.athlete_id=r.athlete_id AND d.workout_date BETWEEN greatest(r.week_start,(now() AT TIME ZONE 'America/Sao_Paulo')::date) AND r.week_start+6
 AND coalesce(d.workout_type,'') NOT IN('rest','recovery','descanso','quick') AND NOT EXISTS(SELECT 1 FROM public.workout_executions x WHERE x.athlete_id=r.athlete_id AND x.workout_date=d.workout_date AND x.status IN('started','in_progress','paused','completed','skipped'));
 RETURN jsonb_build_object('success',true,'athlete_id',r.athlete_id,'recommendation_id',r.id,'supported',coalesce(v_supported,false),'revision',md5(jsonb_build_array(r.status,r.proposed_changes,v_rows)::text),'changes',v_rows,'proposed_changes',r.proposed_changes);
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_adjustment_preview(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_adjustment_preview(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_professor_apply_adjustment(p_recommendation_id uuid,p_expected_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.training_adjustment_recommendations;v_preview jsonb;v_item jsonb;v_day uuid;v_date date;v_rows jsonb;v_target uuid;v_request uuid;v_count integer:=0;
BEGIN
 SELECT * INTO r FROM public.training_adjustment_recommendations WHERE id=p_recommendation_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(r.athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF r.status='applied' THEN RETURN jsonb_build_object('success',true,'already_applied',true,'recommendation_id',r.id);END IF;
 IF r.status<>'accepted' THEN RAISE EXCEPTION 'recommendation_must_be_accepted';END IF;
 FOR v_date IN SELECT generate_series(r.week_start,r.week_start+6,interval '1 day')::date LOOP PERFORM pg_advisory_xact_lock(hashtextextended(r.athlete_id::text||v_date::text,0));END LOOP;
 v_preview:=public.fn_professor_adjustment_preview(r.id);
 IF NOT(v_preview->>'supported')::boolean THEN RAISE EXCEPTION 'manual_review_required';END IF;
 IF p_expected_revision IS NULL OR v_preview->>'revision'<>p_expected_revision THEN RAISE EXCEPTION 'adjustment_changed_reload' USING ERRCODE='40001';END IF;
 FOR v_item IN SELECT * FROM jsonb_array_elements(v_preview->'changes') LOOP
  IF(v_item->>'old_sets')::integer<>(v_item->>'new_sets')::integer THEN UPDATE public.workout_exercises SET sets=(v_item->>'new_sets')::integer,override_locked=true WHERE id=(v_item->>'row_id')::uuid;v_count:=v_count+1;END IF;
 END LOOP;
 IF v_count=0 THEN RAISE EXCEPTION 'no_eligible_change';END IF;
 FOR v_day IN SELECT DISTINCT (value->>'daily_workout_id')::uuid FROM jsonb_array_elements(v_preview->'changes') LOOP
  UPDATE public.daily_workouts SET override_locked=true,updated_at=now(),changes_json=coalesce(changes_json,'{}'::jsonb)||jsonb_build_object('recommendation_id',r.id,'source','professor_adjustment_review','exercises',(SELECT jsonb_agg(jsonb_build_object('exercise_id',w.exercise_id,'name',e.name,'sets',w.sets,'reps',w.reps_range,'rest_seconds',w.rest_seconds,'order',w.exercise_order) ORDER BY w.exercise_order) FROM public.workout_exercises w JOIN public.exercises e ON e.id=w.exercise_id WHERE w.daily_workout_id=v_day)) WHERE id=v_day;
  SELECT workout_date INTO v_date FROM public.daily_workouts WHERE id=v_day;
  SELECT jsonb_agg(jsonb_build_object('exercise_id',exercise_id,'sets',sets,'reps_range',reps_range,'rest_seconds',rest_seconds,'notes',notes) ORDER BY exercise_order) INTO v_rows FROM public.workout_exercises WHERE daily_workout_id=v_day;
  v_request:=md5(r.id::text||v_day::text)::uuid;
  INSERT INTO public.student_prescription_versions(athlete_id,daily_workout_id,author_id,request_id,snapshot) VALUES(r.athlete_id,v_day,auth.uid(),v_request,jsonb_build_object('date',v_date,'source','reviewed_adjustment','recommendation_id',r.id,'exercises',v_rows,'before_exercises',(SELECT jsonb_agg(value) FROM jsonb_array_elements(v_preview->'changes') WHERE value->>'daily_workout_id'=v_day::text))) ON CONFLICT(request_id) DO NOTHING;
 END LOOP;
 UPDATE public.training_adjustment_recommendations SET status='applied',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=r.id;
 INSERT INTO public.training_adjustment_deliveries(recommendation_id,athlete_id,week_start,status,attempt_count,response,last_error,next_retry_at)
 VALUES(r.id,r.athlete_id,r.week_start,'success',1,jsonb_build_object('native',true,'changed_exercises',v_count),NULL,NULL)
 ON CONFLICT(recommendation_id) DO UPDATE SET status='success',response=excluded.response,last_error=NULL,next_retry_at=NULL;

 SELECT coalesce(a.user_id,(SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=a.id ORDER BY created_at LIMIT 1)) INTO v_target FROM public.athletes a WHERE a.id=r.athlete_id;
 IF v_target IS NOT NULL THEN INSERT INTO public.notifications(user_id,title,message,type,action_url,related_id,related_table) VALUES(v_target,'Treino revisado pelo profissional','Seu profissional revisou o volume das sessões ainda não iniciadas. Confira a prescrição.','info','/9fit/train?tab=semana',r.id,'training_adjustment_recommendations');END IF;
 RETURN jsonb_build_object('success',true,'recommendation_id',r.id,'changed_exercises',v_count,'delivered_to_native_app',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_apply_adjustment(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_apply_adjustment(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION private.fitpro_execution_prescription_lock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.athlete_id::text||NEW.workout_date::text,0));RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_execution_prescription_lock() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_execution_prescription_lock BEFORE INSERT OR UPDATE OF status,daily_workout_id,workout_date ON public.workout_executions FOR EACH ROW EXECUTE FUNCTION private.fitpro_execution_prescription_lock();
CREATE OR REPLACE FUNCTION private.fitpro_prescription_history_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.workout_executions x JOIN public.daily_workouts d ON d.id=OLD.daily_workout_id WHERE x.athlete_id=d.athlete_id AND x.workout_date=d.workout_date AND x.status IN('started','in_progress','paused','completed','skipped')) THEN RAISE EXCEPTION 'workout_already_started' USING ERRCODE='55000';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_prescription_history_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_prescription_history_guard BEFORE UPDATE OR DELETE ON public.workout_exercises FOR EACH ROW EXECUTE FUNCTION private.fitpro_prescription_history_guard();
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION public.fn_professor_adjustment_analytics(p_athlete_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_rows jsonb;v_summary jsonb;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) IS FALSE THEN RAISE EXCEPTION 'professional_required' USING ERRCODE='42501';END IF;
 IF p_athlete_id IS NOT NULL AND NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(t ORDER BY created_at DESC),'[]'::jsonb) INTO v_rows FROM(
 SELECT r.id,r.athlete_id,r.week_start,r.status,r.recommendation_type,r.rationale,r.created_at,r.proposed_changes,EXISTS(SELECT 1 FROM public.student_prescription_versions v WHERE v.athlete_id=r.athlete_id AND v.snapshot->>'recommendation_id'=r.id::text) native_delivery_confirmed,jsonb_build_object('name',a.name) athletes,
 coalesce((SELECT jsonb_agg(jsonb_build_object('accepted',f.accepted,'rating',f.rating,'outcome',f.outcome,'created_at',f.created_at)) FROM public.training_adjustment_feedback f WHERE f.recommendation_id=r.id),'[]'::jsonb) training_adjustment_feedback,
 coalesce((SELECT jsonb_agg(jsonb_build_object('status',d.status,'attempt_count',d.attempt_count)) FROM public.training_adjustment_deliveries d WHERE d.recommendation_id=r.id),'[]'::jsonb) training_adjustment_deliveries
 FROM public.training_adjustment_recommendations r JOIN public.athletes a ON a.id=r.athlete_id WHERE private.fitpro_can_manage_athlete(r.athlete_id) AND(p_athlete_id IS NULL OR r.athlete_id=p_athlete_id) ORDER BY r.created_at DESC LIMIT 500)t;
 SELECT jsonb_build_object('total',count(*),'pending',count(*)FILTER(WHERE value->>'status'='pending'),'accepted',count(*)FILTER(WHERE value->>'status'='accepted'),'applied',count(*)FILTER(WHERE value->>'status'='applied'),'rejected',count(*)FILTER(WHERE value->>'status'='rejected'),'delivered',count(*)FILTER(WHERE (value->>'native_delivery_confirmed')::boolean),'failed_delivery',count(*)FILTER(WHERE value#>>'{training_adjustment_deliveries,0,status}'='failed')) INTO v_summary FROM jsonb_array_elements(v_rows);
 RETURN jsonb_build_object('success',true,'recommendations',v_rows,'summary',v_summary);
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_adjustment_analytics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_adjustment_analytics(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_professor_confirm_adjustment_delivery(p_recommendation_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.training_adjustment_recommendations;
BEGIN
 SELECT * INTO r FROM public.training_adjustment_recommendations WHERE id=p_recommendation_id;
 IF NOT FOUND OR auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(r.athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF r.status<>'applied' OR NOT EXISTS(SELECT 1 FROM public.student_prescription_versions WHERE athlete_id=r.athlete_id AND snapshot->>'recommendation_id'=r.id::text) THEN RAISE EXCEPTION 'native_delivery_not_confirmed';END IF;
 RETURN jsonb_build_object('success',true,'recommendation_id',r.id,'idempotent',true,'native_delivery_confirmed',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_confirm_adjustment_delivery(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_confirm_adjustment_delivery(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_professor_publish_reviewed_adjustment(p_athlete_id uuid,p_recommendation_id uuid,p_date date,p_title text,p_exercises jsonb,p_request_id uuid,p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.training_adjustment_recommendations;v_result jsonb;
BEGIN
 SELECT * INTO r FROM public.training_adjustment_recommendations WHERE id=p_recommendation_id FOR UPDATE;
 IF NOT FOUND OR auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(r.athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF r.athlete_id IS DISTINCT FROM p_athlete_id THEN RAISE EXCEPTION 'student_scope_conflict' USING ERRCODE='42501';END IF;
 IF r.status NOT IN('accepted','applied') THEN RAISE EXCEPTION 'recommendation_must_be_accepted';END IF;
 IF p_date NOT BETWEEN r.week_start AND r.week_start+6 OR p_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'adjustment_date_outside_review_week';END IF;
 IF EXISTS(SELECT 1 FROM public.student_prescription_versions WHERE request_id=p_request_id AND snapshot ? 'recommendation_id' AND snapshot->>'recommendation_id'<>r.id::text) THEN RAISE EXCEPTION 'request_conflict';END IF;
 v_result:=public.fn_professor_publish_workout(r.athlete_id,p_date,p_title,p_exercises,p_request_id,p_expected_updated_at);
 UPDATE public.student_prescription_versions SET snapshot=snapshot||jsonb_build_object('recommendation_id',r.id,'source','manual_professional_review') WHERE request_id=p_request_id AND athlete_id=r.athlete_id;
 UPDATE public.training_adjustment_recommendations SET status='applied',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=r.id;
 INSERT INTO public.training_adjustment_deliveries(recommendation_id,athlete_id,week_start,status,attempt_count,response,last_error,next_retry_at)
 VALUES(r.id,r.athlete_id,r.week_start,'success',1,jsonb_build_object('native',true,'manual_review',true,'daily_workout_id',v_result->'daily_workout_id'),NULL,NULL)
 ON CONFLICT(recommendation_id) DO UPDATE SET status='success',response=excluded.response,last_error=NULL,next_retry_at=NULL;
 RETURN v_result||jsonb_build_object('recommendation_id',r.id,'native_delivery_confirmed',true);
END $$;
REVOKE ALL ON FUNCTION public.fn_professor_publish_reviewed_adjustment(uuid,uuid,date,text,jsonb,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_publish_reviewed_adjustment(uuid,uuid,date,text,jsonb,uuid,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_professor_exercise_facets()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
SELECT jsonb_build_object('muscles',coalesce((SELECT jsonb_agg(value ORDER BY value) FROM(SELECT DISTINCT unnest(target_muscles) value FROM public.exercises)t),'[]'::jsonb),'equipment',coalesce((SELECT jsonb_agg(value ORDER BY value) FROM(SELECT DISTINCT equipment value FROM public.exercises WHERE nullif(equipment,'') IS NOT NULL)t),'[]'::jsonb),'goals',coalesce((SELECT jsonb_agg(value ORDER BY value) FROM(SELECT DISTINCT goal value FROM public.exercises WHERE nullif(goal,'') IS NOT NULL)t),'[]'::jsonb))
WHERE auth.uid() IS NOT NULL AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND private.fitpro_actor_role() IN('professor','trainer','admin','super_admin');
$$;
REVOKE ALL ON FUNCTION public.fn_professor_exercise_facets() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_professor_exercise_facets() TO authenticated;

CREATE TABLE public.professional_ai_turns(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),coach_id uuid NOT NULL REFERENCES auth.users(id),athlete_id uuid NOT NULL REFERENCES public.athletes(id),request_id uuid NOT NULL UNIQUE,question text NOT NULL,answer text NOT NULL,mode text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX professional_ai_turns_history ON public.professional_ai_turns(coach_id,athlete_id,created_at DESC);
ALTER TABLE public.professional_ai_turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY professional_ai_history_read ON public.professional_ai_turns FOR SELECT TO authenticated USING(coach_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND private.fitpro_can_manage_athlete(athlete_id));
CREATE POLICY professional_ai_history_remove ON public.professional_ai_turns FOR DELETE TO authenticated USING(coach_id=(SELECT auth.uid()) AND (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND private.fitpro_can_manage_athlete(athlete_id));
REVOKE ALL ON public.professional_ai_turns FROM anon,authenticated;
GRANT SELECT,DELETE ON public.professional_ai_turns TO authenticated;
CREATE OR REPLACE FUNCTION public.fn_save_professional_ai_turn(p_athlete_id uuid,p_request_id uuid,p_question text,p_answer text,p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old public.professional_ai_turns;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 IF p_request_id IS NULL OR length(coalesce(p_question,'')) NOT BETWEEN 1 AND 4000 OR length(coalesce(p_answer,'')) NOT BETWEEN 1 AND 60000 OR p_mode NOT IN('chat','recommendations','analyze_progress') THEN RAISE EXCEPTION 'invalid_ai_history';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 SELECT * INTO v_old FROM public.professional_ai_turns WHERE request_id=p_request_id;
 IF FOUND THEN IF v_old.coach_id<>auth.uid() OR v_old.athlete_id<>p_athlete_id OR v_old.question<>p_question OR v_old.answer<>p_answer THEN RAISE EXCEPTION 'request_conflict';END IF;RETURN jsonb_build_object('saved',true,'id',v_old.id);END IF;
 INSERT INTO public.professional_ai_turns(coach_id,athlete_id,request_id,question,answer,mode) VALUES(auth.uid(),p_athlete_id,p_request_id,p_question,p_answer,p_mode) RETURNING * INTO v_old;
 RETURN jsonb_build_object('saved',true,'id',v_old.id);
END $$;
REVOKE ALL ON FUNCTION public.fn_save_professional_ai_turn(uuid,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_professional_ai_turn(uuid,uuid,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION public.fn_coach_subscription_context(p_athlete_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid;v_sub record;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 SELECT coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)) INTO v_uid FROM public.athletes a WHERE a.id=p_athlete_id;
 IF v_uid IS NULL THEN RETURN jsonb_build_object('linked',false,'subscription',NULL);END IF;
 SELECT status,expires_at,activated_at INTO v_sub FROM public.user_subscriptions WHERE user_id=v_uid
 ORDER BY (status IN('active','trialing') AND(expires_at IS NULL OR expires_at>now())) DESC,activated_at DESC NULLS LAST LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('linked',true,'subscription',NULL);END IF;
 RETURN jsonb_build_object('linked',true,'subscription',jsonb_build_object('status',v_sub.status,'expires_at',v_sub.expires_at));
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_subscription_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_subscription_context(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
