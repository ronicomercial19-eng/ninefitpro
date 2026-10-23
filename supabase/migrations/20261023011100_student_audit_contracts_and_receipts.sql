-- F01/F02/F05/F06/F10/F11/F12/F15: additive contracts and atomic receipts.
-- Existing records and legacy RPC signatures are preserved.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.student_reward_receipts (
  athlete_id uuid NOT NULL REFERENCES public.athletes(id), event_type text NOT NULL,
  event_id text NOT NULL, xp integer NOT NULL CHECK(xp>=0), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(athlete_id,event_type,event_id)
);
ALTER TABLE private.student_reward_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.student_reward_receipts FROM PUBLIC,anon,authenticated;
CREATE TABLE private.student_protocol_completions (
  athlete_id uuid NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  protocol_id uuid NOT NULL REFERENCES public.biohacker_protocols(id) ON DELETE CASCADE,
  completion_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(athlete_id,protocol_id,completion_date)
);
ALTER TABLE private.student_protocol_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.student_protocol_completions FROM PUBLIC,anon,authenticated;
-- Preserve historical totals: pre-migration completed sessions never receive retroactive XP.
-- A zero receipt means grandfathered, not that historical XP was absent.
INSERT INTO private.student_reward_receipts(athlete_id,event_type,event_id,xp)
SELECT athlete_id,'workout_completed',id::text,0 FROM public.workout_executions
WHERE status='completed' ON CONFLICT DO NOTHING;


CREATE TABLE public.student_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 120),
  target_per_week integer NOT NULL DEFAULT 5 CHECK(target_per_week BETWEEN 1 AND 7),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,user_id), UNIQUE(user_id,title)
);
CREATE TABLE public.student_habit_days (
  habit_id uuid NOT NULL, user_id uuid NOT NULL REFERENCES auth.users(id),
  habit_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(habit_id,habit_date),
  FOREIGN KEY(habit_id,user_id) REFERENCES public.student_habits(id,user_id) ON DELETE CASCADE
);
ALTER TABLE public.student_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_habit_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY habits_owner ON public.student_habits FOR ALL TO authenticated
  USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY habit_days_read ON public.student_habit_days FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY habit_days_add ON public.student_habit_days FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()) AND habit_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date);
CREATE POLICY habit_days_remove ON public.student_habit_days FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()) AND habit_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.student_habits TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.student_habit_days TO authenticated;
REVOKE ALL ON public.student_habits,public.student_habit_days FROM anon;
CREATE INDEX student_habit_days_owner ON public.student_habit_days(user_id,habit_date);
ALTER TABLE public.bio_activity_logs ADD COLUMN IF NOT EXISTS duration_seconds integer CHECK(duration_seconds>=0);
ALTER TABLE public.workout_progress ADD COLUMN IF NOT EXISTS execution_id uuid REFERENCES public.workout_executions(id);
CREATE UNIQUE INDEX IF NOT EXISTS workout_progress_execution_receipt ON public.workout_progress(execution_id) WHERE execution_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.fn_get_daily_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := auth.uid(); v_id uuid := public.fn_current_athlete_id();
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_c public.daily_checkins;
  v_meals integer := 0; v_water integer := 0; v_done boolean := false; v_started boolean := false; v_scheduled boolean := false; v_rest boolean := false; v_review integer;
  v_readiness numeric := null; v_coverage numeric := 0; v_dimensions jsonb := '{}'::jsonb; v_complete boolean := false; v_safe boolean := false; v_streak integer := 0; v_settings public.user_context_settings; v_declared jsonb; v_observed jsonb; v_hours jsonb;
BEGIN
  IF v_uid IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean, false) THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
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


CREATE OR REPLACE FUNCTION public.fn_award_xp(p_athlete_id uuid, p_amount integer, p_source text DEFAULT 'unknown'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(new_total_xp integer, new_level integer, leveled_up boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_prev_xp int;
  v_prev_level int;
  v_new_xp int;
  v_new_level int;
  v_event text; v_inserted boolean; v_execution uuid;
begin
  -- Shared content can award only from the receipt trigger, never from browser RPC.
  if coalesce(p_source,'') like 'share%' and pg_trigger_depth()=0 then
    raise exception 'share_event_required' using errcode='42501';
  end if;
  if p_athlete_id is null or p_amount is null or p_amount = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and (
        a.user_id = (select auth.uid())
        or a.coach_id = (select auth.uid())
        or exists (select 1 from public.athlete_auth_link l where l.athlete_id=a.id and l.user_id=(select auth.uid()))
        or public.is_admin((select auth.uid()))
        or public.is_trainer((select auth.uid()))
      )
  ) then
    raise exception 'athlete_access_denied' using errcode = '42501';
  end if;

  IF p_source='workout_completed' THEN
    v_execution := nullif(p_metadata->>'execution_id','')::uuid;
    IF v_execution IS NULL OR NOT EXISTS(SELECT 1 FROM public.workout_executions WHERE id=v_execution AND athlete_id=p_athlete_id AND status='completed')
      OR NOT EXISTS(SELECT 1 FROM public.workout_exercise_sets WHERE execution_id=v_execution AND completed) THEN RAISE EXCEPTION 'confirmed_execution_required'; END IF;
    v_event := v_execution::text; p_amount := 200;
  ELSIF p_source='protocol_completed' THEN
    v_event := nullif(p_metadata->>'protocol_id','');
    IF v_event IS NULL OR NOT EXISTS(SELECT 1 FROM private.student_protocol_completions WHERE athlete_id=p_athlete_id AND protocol_id::text=v_event AND completion_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date) THEN RAISE EXCEPTION 'confirmed_protocol_required'; END IF;
    v_event := v_event||':'||(now() AT TIME ZONE 'America/Sao_Paulo')::date::text; p_amount := 150;
  END IF;
  IF v_event IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text||p_source||v_event,0));
    INSERT INTO private.student_reward_receipts(athlete_id,event_type,event_id,xp)
    VALUES(p_athlete_id,p_source,v_event,p_amount) ON CONFLICT DO NOTHING RETURNING true INTO v_inserted;
    IF NOT coalesce(v_inserted,false) THEN
      RETURN QUERY SELECT coalesce(a.total_xp,0),coalesce(a.level,1),false FROM public.athletes a WHERE a.id=p_athlete_id;
      RETURN;
    END IF;
  END IF;

  select coalesce(total_xp,0), coalesce(level,1)
    into v_prev_xp, v_prev_level
  from public.athletes where id = p_athlete_id for update;

  if not found then
    raise exception 'athlete % not found', p_athlete_id;
  end if;

  v_new_xp := greatest(0, v_prev_xp + p_amount);
  v_new_level := greatest(1, floor(v_new_xp::numeric / 1000)::int + 1);

  update public.athletes
     set total_xp = v_new_xp, level = v_new_level, updated_at = now()
   where id = p_athlete_id;

  perform public.log_event(
    'created'::event_type, 'athlete_xp', p_athlete_id, null,
    jsonb_build_object('amount', p_amount, 'source', p_source, 'meta', p_metadata,
                       'new_total_xp', v_new_xp, 'new_level', v_new_level, 'event_key', 'xp_awarded')
  );

  return query select v_new_xp, v_new_level, (v_new_level > v_prev_level);
end;
$function$;


CREATE OR REPLACE FUNCTION public.fn_submit_workout_feedback(p_execution_id uuid,p_rpe integer,p_duration_minutes integer,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=public.fn_current_athlete_id(); v_session public.workout_executions; v_already boolean; v_name text; v_sets integer; v_reps integer;
BEGIN
  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR v_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  IF p_rpe IS NULL OR p_rpe NOT BETWEEN 1 AND 10 OR p_duration_minutes IS NULL OR p_duration_minutes NOT BETWEEN 1 AND 1440 OR length(coalesce(p_notes,''))>3000 THEN RAISE EXCEPTION 'invalid_feedback'; END IF;
  SELECT * INTO v_session FROM public.workout_executions WHERE id=p_execution_id AND athlete_id=v_id AND status='completed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'completed_execution_required' USING ERRCODE='42501'; END IF;
  SELECT count(*),coalesce(sum(actual_reps),0) INTO v_sets,v_reps FROM public.workout_exercise_sets WHERE execution_id=p_execution_id AND completed;
  IF v_sets=0 THEN RAISE EXCEPTION 'no_completed_sets'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_id::text||'workout_completed'||p_execution_id::text,0));
  SELECT exists(SELECT 1 FROM private.student_reward_receipts WHERE athlete_id=v_id AND event_type='workout_completed' AND event_id=p_execution_id::text) INTO v_already;
  UPDATE public.workout_executions SET avg_rpe=p_rpe,rating=greatest(1,least(5,ceil(p_rpe/2.0)::integer)),duration_minutes=p_duration_minutes
  WHERE id=p_execution_id;
  v_name:=coalesce(v_session.phase_name,'Treino concluído');
  INSERT INTO public.workout_progress(execution_id,aluno_id,athlete_id,exercise_name,training_name,date,completed_at,duration_minutes,rpe,notes,sets,reps)
  VALUES(p_execution_id,v_id,v_id,v_name,v_name,v_session.workout_date,v_session.completed_at,p_duration_minutes,p_rpe,p_notes,v_sets,v_reps)
  ON CONFLICT(execution_id) WHERE execution_id IS NOT NULL DO UPDATE SET rpe=excluded.rpe,duration_minutes=excluded.duration_minutes,notes=excluded.notes;
  PERFORM public.fn_award_xp(v_id,200,'workout_completed',jsonb_build_object('execution_id',p_execution_id));
  RETURN jsonb_build_object('saved',true,'execution_id',p_execution_id,'xp_awarded',CASE WHEN v_already THEN 0 ELSE 200 END,'already_awarded',v_already);
END $$;
REVOKE ALL ON FUNCTION public.fn_submit_workout_feedback(uuid,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_submit_workout_feedback(uuid,integer,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_complete_student_protocol(p_protocol_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=public.fn_current_athlete_id(); v_protocol public.biohacker_protocols; v_event text; v_already boolean;
BEGIN
  IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR v_id IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='42501'; END IF;
  v_event:=p_protocol_id::text||':'||(now() AT TIME ZONE 'America/Sao_Paulo')::date::text;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_id::text||'protocol_completed'||v_event,0));
  SELECT * INTO v_protocol FROM public.biohacker_protocols WHERE id=p_protocol_id AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'protocol_unavailable'; END IF;
  SELECT exists(SELECT 1 FROM private.student_reward_receipts WHERE athlete_id=v_id AND event_type='protocol_completed' AND event_id=v_event) INTO v_already;
  IF NOT v_already THEN
    INSERT INTO private.student_protocol_completions(athlete_id,protocol_id,completion_date)
    VALUES(v_id,p_protocol_id,(now() AT TIME ZONE 'America/Sao_Paulo')::date) ON CONFLICT DO NOTHING;
    IF v_protocol.skill_id IS NOT NULL THEN
      INSERT INTO public.skill_events(skill_id,user_id,event_type,metadata) VALUES(v_protocol.skill_id,auth.uid(),'complete',jsonb_build_object('protocol_id',p_protocol_id,'source','student_protocol'));
    END IF;
    PERFORM public.fn_award_xp(v_id,150,'protocol_completed',jsonb_build_object('protocol_id',p_protocol_id));
  END IF;
  RETURN jsonb_build_object('saved',true,'xp_awarded',CASE WHEN v_already THEN 0 ELSE 150 END,'already_completed',v_already);
END $$;
REVOKE ALL ON FUNCTION public.fn_complete_student_protocol(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_complete_student_protocol(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
