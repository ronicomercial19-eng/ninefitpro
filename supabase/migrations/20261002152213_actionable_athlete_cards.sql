-- Allow owners to correct their diary without transferring a record to another athlete.
CREATE POLICY "Athletes update own nutrition logs" ON public.nutrition_logs
FOR UPDATE TO authenticated
USING (athlete_id IN (SELECT id FROM public.athletes WHERE user_id=(SELECT auth.uid()))
  OR athlete_id IN (SELECT athlete_id FROM public.athlete_auth_link WHERE user_id=(SELECT auth.uid())))
WITH CHECK ((athlete_id IN (SELECT id FROM public.athletes WHERE user_id=(SELECT auth.uid()))
  OR athlete_id IN (SELECT athlete_id FROM public.athlete_auth_link WHERE user_id=(SELECT auth.uid())))
  AND calories >= 0 AND protein >= 0 AND carbs >= 0 AND fat >= 0);

CREATE POLICY "Linked athletes view own diets" ON public.student_diet_assignments
FOR SELECT TO authenticated
USING (student_id IN (SELECT athlete_id FROM public.athlete_auth_link WHERE user_id=(SELECT auth.uid())));

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS google_calendar_status text NOT NULL DEFAULT 'not_synced'
  CHECK (google_calendar_status IN ('not_synced','synced','pending','failed'));

-- Preserve atomic debit and existing authorization boundary, and reject expired balances.
CREATE OR REPLACE FUNCTION public.fn_class_credit_debit(p_athlete uuid, p_appt uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  UPDATE public.student_credits SET used_credits=used_credits+1, updated_at=now()
  WHERE student_id=p_athlete AND total_credits-used_credits>=1
    AND (expires_at IS NULL OR expires_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date);
  IF NOT FOUND THEN RAISE EXCEPTION 'insufficient_or_expired_credits' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.credit_transactions(athlete_id,amount,reason,metadata)
  VALUES(p_athlete,-1,p_reason,jsonb_build_object('domain','class_credit','kind','booked','appointment_id',p_appt));
END $function$;
-- This debit helper is called by privileged appointment triggers, never directly by clients.
REVOKE EXECUTE ON FUNCTION public.fn_class_credit_debit(uuid,uuid,text) FROM PUBLIC, anon, authenticated;

-- A day's state must come from its own execution, not another workout on the same date.
CREATE OR REPLACE FUNCTION public.fn_get_week_workouts(p_athlete_id uuid,p_week_start date DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_periodization record; v_week json;
  v_week_start date := coalesce(p_week_start,date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')::date);
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.athletes a LEFT JOIN public.athlete_auth_link al ON al.athlete_id=a.id
    WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR al.user_id=auth.uid())) THEN
    RAISE EXCEPTION 'not_authorized_for_athlete' USING ERRCODE='42501';
  END IF;
  SELECT ap.status,ap.periodization_model_id,ap.match_percentage INTO v_periodization
  FROM public.athlete_periodizations ap WHERE ap.athlete_id=p_athlete_id AND ap.status IN ('active','in_progress') ORDER BY ap.assigned_at DESC LIMIT 1;
  SELECT json_agg(row_to_json(d) ORDER BY d.workout_date,d.day_number) INTO v_week FROM (
    SELECT dw.id,dw.day_number,dw.day_name,dw.workout_date,dw.workout_type,
      CASE WHEN dw.workout_type='rest' THEN 'rest' ELSE coalesce(wx.status,'planned') END AS status,wx.execution_id,
      (SELECT json_agg(json_build_object('id',ex.id,'name',ex.name,'video_url',ex.video_url,'gif_url',ex.gif_url,
        'sets',we.sets,'reps_range',we.reps_range,'rest_seconds',we.rest_seconds) ORDER BY we.exercise_order)
        FROM public.workout_exercises we JOIN public.exercises ex ON ex.id=we.exercise_id WHERE we.daily_workout_id=dw.id) AS exercises
    FROM public.daily_workouts dw LEFT JOIN LATERAL (
      SELECT e.id AS execution_id,e.status FROM public.workout_executions e
      WHERE e.athlete_id=p_athlete_id AND e.daily_workout_id=dw.id ORDER BY e.created_at DESC LIMIT 1
    ) wx ON true
    WHERE dw.athlete_id=p_athlete_id AND dw.workout_date BETWEEN v_week_start AND v_week_start+6 AND dw.workout_type IS DISTINCT FROM 'quick'
  ) d;
  RETURN json_build_object('phase_status',coalesce(v_periodization.status,'sem_periodizacao'),'periodization_model_id',v_periodization.periodization_model_id,
    'match_percentage',v_periodization.match_percentage,'week_start',v_week_start,'week_end',v_week_start+6,'week',coalesce(v_week,'[]'::json));
END $function$;
REVOKE EXECUTE ON FUNCTION public.fn_get_week_workouts(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_get_week_workouts(uuid,date) TO authenticated;
