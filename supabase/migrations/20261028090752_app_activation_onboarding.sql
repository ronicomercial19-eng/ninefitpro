CREATE TABLE public.app_onboarding (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 athlete_id uuid NOT NULL REFERENCES public.athletes(id),
 answers jsonb NOT NULL DEFAULT '{}',
 revision integer NOT NULL DEFAULT 0,
 completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_onboarding ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_onboarding FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.app_onboarding TO authenticated;
CREATE POLICY onboarding_own_read ON public.app_onboarding FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()) AND NOT coalesce((SELECT(auth.jwt()->>'is_anonymous')::boolean),false));
CREATE POLICY onboarding_coach_read ON public.app_onboarding FOR SELECT TO authenticated USING(private.fitpro_can_manage_athlete(athlete_id));

CREATE OR REPLACE FUNCTION public.fn_save_app_onboarding(p_patch jsonb,p_revision integer,p_complete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE u uuid:=auth.uid();a uuid;v public.app_onboarding;x jsonb;k text;d date;
BEGIN
 IF u IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'account_required' USING ERRCODE='42501';END IF;
 a:=public.fn_current_athlete_id();IF a IS NULL THEN RAISE EXCEPTION 'athlete_profile_required';END IF;
 IF p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR octet_length(p_patch::text)>8192 THEN RAISE EXCEPTION 'invalid_onboarding';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) f WHERE f NOT IN('welcome_seen','full_name','birthdate','weight_kg','height_cm','experience','training_days','session_minutes','training_environment','equipment','current_pain','movement_limitations')) THEN RAISE EXCEPTION 'unsupported_onboarding_field';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('app-onboarding:'||u::text,0));
 SELECT * INTO v FROM public.app_onboarding WHERE user_id=u FOR UPDATE;
 IF p_revision IS NULL OR p_revision<>coalesce(v.revision,0) THEN RAISE EXCEPTION 'onboarding_revision_conflict';END IF;
 x:=coalesce(v.answers,'{}')||p_patch;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_patch) e WHERE e.value='null'::jsonb AND e.key NOT IN('birthdate','weight_kg','height_cm')) THEN RAISE EXCEPTION 'null_onboarding_field';END IF;
 FOREACH k IN ARRAY ARRAY['welcome_seen','current_pain'] LOOP
  IF x?k AND jsonb_typeof(x->k)<>'boolean' THEN RAISE EXCEPTION 'invalid_onboarding_boolean';END IF;
 END LOOP;
 IF x?'full_name' AND (jsonb_typeof(x->'full_name')<>'string' OR length(btrim(x->>'full_name')) NOT BETWEEN 2 AND 150) THEN RAISE EXCEPTION 'invalid_name';END IF;
 IF x?'birthdate' AND x->'birthdate'<>'null'::jsonb THEN
  IF jsonb_typeof(x->'birthdate')<>'string' OR x->>'birthdate'!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'invalid_birthdate';END IF;
  d:=(x->>'birthdate')::date;IF d<date '1900-01-01' OR d>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'invalid_birthdate';END IF;
 END IF;
 FOREACH k IN ARRAY ARRAY['weight_kg','height_cm','session_minutes'] LOOP
  IF x?k AND x->k<>'null'::jsonb THEN
   IF jsonb_typeof(x->k)<>'number' THEN RAISE EXCEPTION 'invalid_measurement';END IF;
   IF (k='weight_kg' AND(x->>k)::numeric NOT BETWEEN 20 AND 400) OR(k='height_cm' AND(x->>k)::numeric NOT BETWEEN 80 AND 250) OR(k='session_minutes' AND((x->>k)::numeric NOT BETWEEN 10 AND 120 OR(x->>k)!~'^[0-9]+$')) THEN RAISE EXCEPTION 'invalid_measurement';END IF;
  END IF;
 END LOOP;
 IF x?'experience' AND x->>'experience' NOT IN('beginner','intermediate','advanced') THEN RAISE EXCEPTION 'invalid_experience';END IF;
 IF x?'training_environment' AND x->>'training_environment' NOT IN('home','gym','outdoors') THEN RAISE EXCEPTION 'invalid_training_environment';END IF;
 IF x?'training_days' THEN
  IF jsonb_typeof(x->'training_days')<>'array' THEN RAISE EXCEPTION 'invalid_training_days';END IF;
  IF jsonb_array_length(x->'training_days') NOT BETWEEN 1 AND 7 OR EXISTS(SELECT 1 FROM jsonb_array_elements(x->'training_days') e WHERE e NOT IN('1'::jsonb,'2','3','4','5','6','7')) OR(SELECT count(DISTINCT e) FROM jsonb_array_elements(x->'training_days') e)<>jsonb_array_length(x->'training_days') THEN RAISE EXCEPTION 'invalid_training_days';END IF;
 END IF;
 IF x?'equipment' THEN
  IF jsonb_typeof(x->'equipment')<>'array' THEN RAISE EXCEPTION 'invalid_equipment';END IF;
  IF jsonb_array_length(x->'equipment')>6 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(x->'equipment') e WHERE e NOT IN('dumbbells','barbell','machines','bands','bench','mat')) THEN RAISE EXCEPTION 'invalid_equipment';END IF;
 END IF;
 IF x?'movement_limitations' AND(jsonb_typeof(x->'movement_limitations')<>'string' OR length(x->>'movement_limitations')>1000) THEN RAISE EXCEPTION 'invalid_limitations';END IF;
 IF coalesce(p_complete,false) THEN
  IF NOT(x?&ARRAY['welcome_seen','full_name','experience','training_days','session_minutes','training_environment','equipment','current_pain','movement_limitations']) OR x->'welcome_seen'<>'true'::jsonb THEN RAISE EXCEPTION 'onboarding_incomplete';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_context_settings s JOIN public.user_parameters p ON p.user_id=s.user_id WHERE s.user_id=u AND s.pdi_completed_at IS NOT NULL AND s.declared_keys @> ARRAY['goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions']) THEN RAISE EXCEPTION 'confirmed_pdi_required';END IF;
 END IF;
 INSERT INTO public.app_onboarding(user_id,athlete_id,answers,revision,completed_at)
 VALUES(u,a,x,coalesce(v.revision,0)+1,CASE WHEN coalesce(p_complete,false) THEN coalesce(v.completed_at,now()) ELSE v.completed_at END)
 ON CONFLICT(user_id) DO UPDATE SET answers=excluded.answers,revision=excluded.revision,completed_at=excluded.completed_at,updated_at=now() RETURNING * INTO v;
 IF p_patch?'full_name' THEN
  UPDATE public.profiles SET full_name=btrim(x->>'full_name') WHERE user_id=u;
  UPDATE public.athletes SET name=btrim(x->>'full_name') WHERE id=a;
 END IF;
 IF p_patch?'birthdate' THEN UPDATE public.athletes SET birthdate=(x->>'birthdate')::date WHERE id=a;END IF;
 IF p_patch?'experience' THEN UPDATE public.athletes SET experience_level=CASE x->>'experience' WHEN 'beginner' THEN 'Iniciante' WHEN 'advanced' THEN 'Avançado' ELSE 'Intermediário' END WHERE id=a;END IF;
 IF p_patch?'training_days' THEN UPDATE public.athletes SET weekly_frequency=jsonb_array_length(x->'training_days'),sessions_per_week=jsonb_array_length(x->'training_days') WHERE id=a;END IF;
 IF p_patch?'session_minutes' OR p_patch?'training_environment' THEN
  PERFORM public.fn_save_pdi('{}',false,jsonb_strip_nulls(jsonb_build_object('session_minutes',x->'session_minutes','training_environment',x->'training_environment')));
 END IF;
 RETURN jsonb_build_object('saved',true,'onboarding',to_jsonb(v));
END $$;
REVOKE ALL ON FUNCTION public.fn_save_app_onboarding(jsonb,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_save_app_onboarding(jsonb,integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_get_app_onboarding()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid:=auth.uid();a uuid;j jsonb;sub jsonb;w jsonb;
BEGIN
 IF u IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'account_required' USING ERRCODE='42501';END IF;
 a:=public.fn_current_athlete_id();IF a IS NULL THEN RAISE EXCEPTION 'athlete_profile_required';END IF;
 SELECT to_jsonb(o) INTO j FROM public.app_onboarding o WHERE user_id=u;
 SELECT jsonb_build_object('name',p.name,'status',s.status,'expires_at',s.expires_at,'period',s.metadata->>'period') INTO sub FROM public.user_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id WHERE s.user_id=u AND s.status IN('active','trialing') AND(s.expires_at IS NULL OR s.expires_at>now()) ORDER BY s.expires_at DESC NULLS FIRST LIMIT 1;
 SELECT jsonb_build_object('id',d.id,'title',d.day_name,'date',d.workout_date) INTO w FROM public.daily_workouts d WHERE d.athlete_id=a AND d.workout_date>=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND EXISTS(SELECT 1 FROM public.workout_exercises e WHERE e.daily_workout_id=d.id AND e.exercise_id IS NOT NULL AND e.sets>0 AND nullif(btrim(e.reps_range),'') IS NOT NULL) ORDER BY d.workout_date LIMIT 1;
 RETURN jsonb_build_object('onboarding',j,'full_name',(SELECT name FROM public.athletes WHERE id=a),'birthdate',(SELECT birthdate FROM public.athletes WHERE id=a),'subscription',sub,'next_workout',w,'assignments',coalesce((SELECT jsonb_agg(to_jsonb(t)) FROM(SELECT id,training_name,training_type,training_data,html_file_url FROM public.student_training_assignments WHERE student_id=a AND is_active AND(start_date IS NULL OR start_date<=(now() AT TIME ZONE 'America/Sao_Paulo')::date) AND(end_date IS NULL OR end_date>=(now() AT TIME ZONE 'America/Sao_Paulo')::date) ORDER BY created_at DESC LIMIT 10)t),'[]'),'first_workout_completed',EXISTS(SELECT 1 FROM public.workout_executions WHERE athlete_id=a AND status='completed' AND completion_valid IS TRUE));
END $$;
REVOKE ALL ON FUNCTION public.fn_get_app_onboarding() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_get_app_onboarding() TO authenticated;
NOTIFY pgrst,'reload schema';
