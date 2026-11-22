-- Reconcile read models without changing historical executions or access grants.
CREATE OR REPLACE FUNCTION private.fitpro_athlete_goal(p_athlete_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $goal$
 SELECT jsonb_build_object(
  'value',coalesce(d.goal,nullif(btrim(a.primary_goal::text),''),nullif(btrim(a.objetivo::text),'')),
  'source',CASE WHEN d.goal IS NOT NULL THEN 'student_declared' ELSE 'athlete_registration' END,
  'registered',coalesce(nullif(btrim(a.primary_goal::text),''),nullif(btrim(a.objetivo::text),'')))
 FROM public.athletes a
 LEFT JOIN LATERAL (
  SELECT nullif(btrim(p.goal::text),'') goal
  FROM public.user_parameters p JOIN public.user_context_settings s ON s.user_id=p.user_id
  WHERE p.user_id=coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1))
    AND 'goal'=ANY(coalesce(s.declared_keys,'{}'::text[]))
 ) d ON true
 WHERE a.id=p_athlete_id;
$goal$;
-- Only the existing authorized SECURITY DEFINER entry points call this helper.
REVOKE ALL ON FUNCTION private.fitpro_athlete_goal(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.fitpro_student_context(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
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
    FROM public.workout_executions WHERE athlete_id=v_id AND status='completed' AND completion_valid AND started_at IS NOT NULL AND workout_date BETWEEN v_today-29 AND v_today GROUP BY 1
  ) t;
  WITH active_days AS (
    SELECT checkin_date d FROM public.daily_checkins WHERE athlete_id=v_id AND sono BETWEEN 1 AND 5 AND energia BETWEEN 1 AND 5 AND humor BETWEEN 1 AND 5 AND motivacao BETWEEN 1 AND 5 AND dor BETWEEN 1 AND 5
    UNION SELECT workout_date FROM public.workout_executions WHERE athlete_id=v_id AND status='completed' AND completion_valid
    UNION SELECT date FROM public.nutrition_logs WHERE athlete_id=v_id
    UNION SELECT log_date FROM public.hydration_logs WHERE athlete_id=v_id
    UNION SELECT review_date FROM public.athlete_day_reviews WHERE athlete_id=v_id AND rating IS NOT NULL
  ) SELECT jsonb_build_object('source','durable_records','window_days',30,
    'active_days_30d',(SELECT count(*) FROM active_days WHERE d BETWEEN v_today-29 AND v_today),
    'completed_workouts_30d',(SELECT count(*) FROM public.workout_executions WHERE athlete_id=v_id AND status='completed' AND completion_valid AND workout_date BETWEEN v_today-29 AND v_today),
    'nutrition_days_30d',(SELECT count(DISTINCT date) FROM public.nutrition_logs WHERE athlete_id=v_id AND date BETWEEN v_today-29 AND v_today),
    'hydration_days_30d',(SELECT count(DISTINCT log_date) FROM public.hydration_logs WHERE athlete_id=v_id AND log_date BETWEEN v_today-29 AND v_today),
    'review_days_30d',(SELECT count(*) FROM public.athlete_day_reviews WHERE athlete_id=v_id AND rating IS NOT NULL AND review_date BETWEEN v_today-29 AND v_today),
    'training_windows',v_hours) INTO v_observed;
  SELECT * INTO v_c FROM public.daily_checkins WHERE athlete_id = v_id AND checkin_date = v_today;
  v_complete := coalesce(v_c.sono BETWEEN 1 AND 5 AND v_c.energia BETWEEN 1 AND 5 AND v_c.humor BETWEEN 1 AND 5 AND v_c.motivacao BETWEEN 1 AND 5 AND v_c.dor BETWEEN 1 AND 5,false);
  IF v_complete THEN v_readiness := round(((v_c.sono - 1) * 30 + (v_c.energia - 1) * 30 + ((6 - v_c.dor) - 1) * 20 + (v_c.humor - 1) * 10 + (v_c.motivacao - 1) * 10) / 4.0); END IF;
  SELECT count(*) INTO v_meals FROM public.nutrition_logs WHERE athlete_id = v_id AND date = v_today;
  SELECT coalesce(sum(amount_ml), 0) INTO v_water FROM public.hydration_logs WHERE athlete_id = v_id AND log_date = v_today;
  SELECT exists(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_id AND workout_date=v_today AND status='completed' AND completion_valid), exists(SELECT 1 FROM public.workout_executions WHERE athlete_id=v_id AND workout_date=v_today AND status IN ('in_progress','paused','started')) INTO v_done, v_started;
  SELECT exists(SELECT 1 FROM public.daily_workouts WHERE athlete_id=v_id AND workout_date=v_today AND coalesce(workout_type,'') NOT IN ('rest','recovery','descanso')), exists(SELECT 1 FROM public.daily_workouts WHERE athlete_id=v_id AND workout_date=v_today AND workout_type IN ('rest','recovery','descanso')) INTO v_scheduled, v_rest;
  SELECT rating INTO v_review FROM public.athlete_day_reviews WHERE athlete_id=v_id AND review_date=v_today;
  v_rest := v_rest OR exists(SELECT 1 FROM public.athlete_day_reviews WHERE athlete_id=v_id AND review_date=v_today AND training_choice='rest');
  v_safe := coalesce(v_c.dor >= 3, false) OR nullif(btrim(v_c.dor_local), '') IS NOT NULL;
  v_safe := v_safe OR coalesce(jsonb_array_length(v_declared->'injury_zones'),0)>0 OR exists(SELECT 1 FROM public.pain_reports WHERE athlete_id=v_id AND coalesce(status,'pending') NOT IN ('resolved','dismissed') AND created_at>=now()-interval '24 hours');
  WITH days AS (SELECT generate_series(v_today - 6, v_today, interval '1 day')::date AS d)
  SELECT jsonb_build_object(
    'treino', round(count(*) FILTER (WHERE exists(SELECT 1 FROM public.workout_executions w WHERE w.athlete_id=v_id AND w.workout_date=d AND w.status='completed' AND w.completion_valid)) * 100.0 / 7),
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

CREATE OR REPLACE FUNCTION public.fn_coach_overview(p_start date, p_end date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR coalesce(private.fitpro_actor_role() IN('professor','trainer','admin','super_admin'),false) IS FALSE THEN RAISE EXCEPTION 'professional_required' USING ERRCODE='42501';END IF;
 IF p_start IS NULL OR p_end IS NULL OR p_start>p_end OR p_end-p_start>366 THEN RAISE EXCEPTION 'invalid_period';END IF;
 RETURN jsonb_build_object('start',p_start,'end',p_end,'generated_at',now(),'students',coalesce((
 SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'active',coalesce(a.activated,false),'goal',private.fitpro_athlete_goal(a.id)->>'value',
 'completed_workouts',(SELECT count(*) FROM public.workout_executions w WHERE w.athlete_id=a.id AND w.status='completed' AND w.completion_valid AND w.workout_date BETWEEN p_start AND p_end),
 'prescribed_sessions',(SELECT count(*) FROM public.daily_workouts w WHERE w.athlete_id=a.id AND w.workout_date BETWEEN p_start AND p_end AND coalesce(w.workout_type,'') NOT IN('rest','descanso','recovery')),
 'avg_rpe',(SELECT round(avg(CASE WHEN w.avg_rpe BETWEEN 1 AND 10 THEN w.avg_rpe END),1) FROM public.workout_executions w WHERE w.athlete_id=a.id AND w.status='completed' AND w.completion_valid AND w.workout_date BETWEEN p_start AND p_end),
 'duration_minutes',(SELECT coalesce(sum(w.duration_minutes),0) FROM public.workout_executions w WHERE w.athlete_id=a.id AND w.status='completed' AND w.completion_valid AND w.workout_date BETWEEN p_start AND p_end),
 'assignments',coalesce((SELECT jsonb_agg(jsonb_build_object('student_id',student_id,'end_date',end_date,'is_active',is_active)) FROM public.student_training_assignments WHERE student_id=a.id AND is_active),'[]'::jsonb)) ORDER BY a.name,a.id)
 FROM public.athletes a WHERE private.fitpro_can_manage_athlete(a.id) AND a.is_test_account IS NOT TRUE),'[]'::jsonb));
END $function$;

CREATE OR REPLACE FUNCTION public.fn_get_assessment_hub(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_owner boolean; v_assessments jsonb; v_sources jsonb; v_workouts jsonb; v_loads jsonb; v_records jsonb; v_age int; v_gender text; v_settings jsonb;
begin
 if not public.fn_assessment_can_read(p_athlete_id) then raise exception 'not authorized' using errcode='42501'; end if;
 select (a.user_id=auth.uid() or exists(select 1 from athlete_auth_link l where l.athlete_id=a.id and l.user_id=auth.uid())),coalesce(extract(year from age(current_date,a.birthdate))::int,a.age),lower(a.gender)
 into v_owner,v_age,v_gender from athletes a where a.id=p_athlete_id;
 select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('oficial',public.fn_assessment_is_official(to_jsonb(a)),'peso_score',public.fn_assessment_weight(to_jsonb(a))) order by a.data_avaliacao,a.created_at,a.id),'[]') into v_assessments
 from avaliacoes_unificadas a where a.athlete_id=p_athlete_id and (coalesce(v_owner,false) or not exists(select 1 from athlete_data_sources s where s.athlete_id=p_athlete_id and s.tipo=a.origem and not s.escopo_professor));
 select coalesce(jsonb_agg(x),'[]') into v_sources from (
 select o.origem tipo,o.n registros,o.ultima,coalesce(s.status,'active') status,coalesce(s.escopo_professor,true) escopo_professor,s.conectado_em
 from (select origem,count(*) n,max(data_avaliacao) ultima from avaliacoes_unificadas where athlete_id=p_athlete_id group by origem)o
 left join athlete_data_sources s on s.athlete_id=p_athlete_id and s.tipo=o.origem
 where coalesce(v_owner,false) or coalesce(s.escopo_professor,true)
 )x;
 select coalesce(jsonb_agg(x order by x.date),'[]') into v_workouts from (
 select 'fitpro:'||id id,workout_date date,coalesce(phase_name,'Treino concluído') name,total_volume_kg "volumeKg",avg_rpe rpe,'FitPro' source from workout_executions where athlete_id=p_athlete_id and status='completed' and completion_valid
 union all select 'progress:'||id,data_treino,coalesce(nome,'Treino concluído'),volume_total,pse_medio,'Progress Tracker' from treinos_realizados where athlete_id=p_athlete_id
 )x;
 select coalesce(jsonb_agg(x order by x.date),'[]') into v_loads from (
 select 'fitpro:'||s.id id,e.workout_date date,s.exercise_name exercise,s.actual_weight kg,s.actual_reps reps,'FitPro' source from workout_exercise_sets s join workout_executions e on e.id=s.execution_id where e.athlete_id=p_athlete_id and e.status='completed' and e.completion_valid and s.completed and s.actual_weight>0
 union all select 'progress:'||id,data_registro,exercicio,carga_max,reps,'Progress Tracker' from registros_carga where athlete_id=p_athlete_id and carga_max>0
 )x;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'date',r.data_pr,'exercise',r.exercicio,'value',r.valor,'unit',r.unidade,'type',r.tipo) order by r.data_pr),'[]') into v_records from personal_records r where r.athlete_id=p_athlete_id and (coalesce(v_owner,false) or not exists(select 1 from athlete_data_sources withheld where withheld.athlete_id=p_athlete_id and not withheld.escopo_professor)) and not public.fn_assessment_record_excluded(r.athlete_id,r.data_pr,r.exercicio,r.valor);
 select to_jsonb(s)-'athlete_id' into v_settings from athlete_reassessment_settings s where athlete_id=p_athlete_id;
 return jsonb_build_object('contract_version',2,'legacy_screen',case when coalesce(v_owner,false) then public.fn_get_ron_progresso_screen(p_athlete_id) else '{}'::jsonb end,'can_manage',coalesce(v_owner,false),'assessments',v_assessments,'sources',v_sources,'workouts',v_workouts,'loads',v_loads,'records',v_records,
 'goals',coalesce((select jsonb_agg(to_jsonb(m) order by prazo nulls last) from metas_progresso m where athlete_id=p_athlete_id),'[]'),
 'references',coalesce((select jsonb_agg(to_jsonb(r)) from ref_faixas r where v_age between idade_min and idade_max and lower(sexo)=v_gender),'[]'),
 'settings',coalesce(v_settings,jsonb_build_object('interval_weeks',8,'reminder_enabled',false)));
end; $function$;

CREATE OR REPLACE FUNCTION public.fn_coach_student_context(p_athlete_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_context jsonb;v_uid uuid;v_today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF auth.uid() IS NULL OR (auth.jwt()->>'is_anonymous')::boolean IS DISTINCT FROM FALSE OR NOT private.fitpro_can_manage_athlete(p_athlete_id) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 v_context:=private.fitpro_student_context(p_athlete_id);
 SELECT coalesce(a.user_id,(SELECT user_id FROM public.athlete_auth_link WHERE athlete_id=a.id ORDER BY created_at LIMIT 1)) INTO v_uid FROM public.athletes a WHERE a.id=p_athlete_id;
 RETURN jsonb_build_object('version',1,'generated_at',now(),
 'athlete',(SELECT jsonb_build_object('id',id,'name',name,'goal',private.fitpro_athlete_goal(id)->>'value','goal_source',private.fitpro_athlete_goal(id)->>'source','registered_goal',private.fitpro_athlete_goal(id)->>'registered','restrictions',injuries_limitations) FROM public.athletes WHERE id=p_athlete_id),
 'daily_context',v_context,
 'workouts',coalesce((SELECT jsonb_agg(t ORDER BY workout_date DESC) FROM (SELECT id,workout_date,status,completion_valid,completion_validation_reason,completed_at,duration_minutes,avg_rpe,daily_workout_id FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date BETWEEN v_today-29 AND v_today ORDER BY workout_date DESC LIMIT 60)t),'[]'::jsonb),
 'prescriptions',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,training_name,start_date,end_date,is_active,training_type FROM public.student_training_assignments WHERE student_id=p_athlete_id ORDER BY created_at DESC LIMIT 20)t),'[]'::jsonb),
 'assessments',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,data_avaliacao,peso,gordura_corporal,massa_muscular,score_global FROM public.avaliacoes_unificadas WHERE athlete_id=p_athlete_id ORDER BY data_avaliacao DESC LIMIT 10)t),'[]'::jsonb),
 'pain_reports',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,body_region,intensity,status,source,created_at FROM public.pain_reports WHERE athlete_id=p_athlete_id ORDER BY created_at DESC LIMIT 20)t),'[]'::jsonb),
 'activities',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,recorded_at,distance_m,duration_seconds,source FROM public.bio_activity_logs WHERE user_id=v_uid AND source='move_gps' ORDER BY recorded_at DESC LIMIT 20)t),'[]'::jsonb),
 'habits',coalesce((SELECT jsonb_agg(jsonb_build_object('id',h.id,'title',h.title,'target_per_week',h.target_per_week,'dates',coalesce((SELECT jsonb_agg(d.habit_date ORDER BY d.habit_date DESC) FROM public.student_habit_days d WHERE d.habit_id=h.id AND d.user_id=v_uid AND d.habit_date>=v_today-29),'[]'::jsonb))) FROM public.student_habits h WHERE h.user_id=v_uid),'[]'::jsonb),
 'protocols',coalesce((SELECT jsonb_agg(t) FROM (SELECT c.protocol_id,p.name,c.completion_date FROM private.student_protocol_completions c JOIN public.biohacker_protocols p ON p.id=c.protocol_id WHERE c.athlete_id=p_athlete_id ORDER BY c.completion_date DESC LIMIT 30)t),'[]'::jsonb),
 'appointments',coalesce((SELECT jsonb_agg(t) FROM (SELECT id,title,scheduled_at,duration,status FROM public.appointments WHERE student_id=p_athlete_id AND scheduled_at>=now()-interval '30 days' ORDER BY scheduled_at DESC LIMIT 30)t),'[]'::jsonb),
 'nutrition',(SELECT jsonb_build_object('meals',count(*),'days',count(DISTINCT date)) FROM public.nutrition_logs WHERE athlete_id=p_athlete_id AND date BETWEEN v_today-29 AND v_today),
 'hydration',(SELECT jsonb_build_object('water_ml',coalesce(sum(amount_ml),0),'days',count(DISTINCT log_date)) FROM public.hydration_logs WHERE athlete_id=p_athlete_id AND log_date BETWEEN v_today-29 AND v_today));
END $function$;

CREATE OR REPLACE FUNCTION public.fn_coach_students()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'user_id',coalesce(a.user_id,(SELECT l.user_id FROM public.athlete_auth_link l WHERE l.athlete_id=a.id ORDER BY l.created_at LIMIT 1)),'goal',private.fitpro_athlete_goal(a.id)->>'value','active',coalesce(a.activated,false)) ORDER BY a.name,a.id),'[]'::jsonb)
 FROM public.athletes a WHERE auth.uid() IS NOT NULL AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
 AND private.fitpro_can_manage_athlete(a.id) AND a.is_test_account IS NOT TRUE;
$function$;

NOTIFY pgrst,'reload schema';
