-- Preserve the existing audited ownership guard and definer boundary of this RPC.
-- Daily writes remain atomic; the new resource vocabulary is fail-closed.
CREATE OR REPLACE FUNCTION public.fn_treino_rapido(p_athlete_id uuid, p_objetivo text DEFAULT NULL, p_tempo_min integer DEFAULT 20, p_equipamento text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public, pg_temp AS $function$
DECLARE
  v_date date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_profile public.athletes%ROWTYPE;
  v_check public.daily_checkins%ROWTYPE;
  v_resources text[];
  v_goal text := CASE WHEN p_objetivo='fatburn' THEN 'cardio' ELSE p_objetivo END;
  v_new boolean := p_equipamento LIKE 'resources:%';
  v_phase text;
  v_sets integer;
  v_reps text;
  v_rest integer;
  v_limit integer;
  v_estimated integer;
  v_id uuid;
  v_exercises json;
BEGIN
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR a.coach_id=auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=auth.uid())) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
  IF v_goal IS NULL OR v_goal NOT IN ('strength','cardio','mobility','recovery') OR p_tempo_min IS NULL OR p_tempo_min NOT IN (15,20,30,45,60) THEN RAISE EXCEPTION 'Objetivo ou duração inválidos'; END IF;
  SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;
  SELECT * INTO v_check FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=v_date;
  IF v_new AND (v_check.id IS NULL OR v_check.sono IS NULL OR v_check.energia IS NULL OR v_check.humor IS NULL OR v_check.motivacao IS NULL OR v_check.dor IS NULL) THEN RAISE EXCEPTION 'Faça a calibração completa antes de montar o treino'; END IF;
  IF v_new AND (coalesce(v_check.dor,0)>=3 OR nullif(trim(v_check.dor_local),'') IS NOT NULL OR (nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes'))) THEN RAISE EXCEPTION 'Revise suas restrições em Ajuste de Treino antes de gerar uma nova sessão'; END IF;
  v_resources := CASE
    WHEN v_new THEN string_to_array(substr(p_equipamento,11),',')
    WHEN p_equipamento IN ('home','outdoor') THEN ARRAY['bodyweight']
    WHEN p_equipamento='home_basic' THEN ARRAY['bodyweight','dumbbells','bands']
    WHEN p_equipamento='gym' THEN ARRAY['gym']
    ELSE NULL END;
  IF v_resources IS NULL OR cardinality(v_resources)=0 OR EXISTS (SELECT 1 FROM unnest(v_resources) r WHERE r NOT IN ('bodyweight','dumbbells','bands','gym')) THEN RAISE EXCEPTION 'Selecione os recursos disponíveis'; END IF;
  SELECT current_phase::text INTO v_phase FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=p_athlete_id LIMIT 1;
  v_sets := CASE WHEN lower(coalesce(v_phase,'')) ~ '(deload|recuper|descarga)' OR lower(coalesce(v_profile.experience_level,'beginner')) IN ('beginner','iniciante') OR coalesce(v_check.energia,5)<=2 OR v_goal='recovery' THEN 2 ELSE 3 END;
  v_reps := CASE WHEN v_goal IN ('mobility','recovery') THEN '20-30 s' WHEN v_goal='cardio' THEN '30 s' ELSE '8-12' END;
  v_rest := CASE WHEN v_goal IN ('mobility','recovery') THEN 30 WHEN coalesce(v_check.energia,5)<=2 THEN 90 ELSE 60 END;
  v_limit := greatest(1,least(10,floor((p_tempo_min-3)*60.0/(v_sets*40+(v_sets-1)*v_rest+30))::integer));
  SELECT json_agg(row_to_json(e)) INTO v_exercises FROM (
    SELECT x.id,x.name,x.video_url,x.gif_url,x.instructions,x.description,x.target_muscles,x.difficulty_level,x.equipment,
      v_sets AS sets,v_reps AS reps_range,v_rest AS rest_seconds
    FROM public.exercises x
    WHERE (nullif(x.video_url,'') IS NOT NULL OR nullif(x.gif_url,'') IS NOT NULL OR nullif(x.instructions,'') IS NOT NULL)
      AND (('gym'=ANY(v_resources))
        OR ('bodyweight'=ANY(v_resources) AND x.equipment IN ('Peso Corporal','nenhum','Mobilidade') AND lower(x.name) !~ '(halter|dumbbell|el.stic|band|trx|barra|banco|máquina|maquina|cabo|polia|corda|bola|rolo|foam|kettlebell)')
        OR ('dumbbells'=ANY(v_resources) AND lower(x.name) ~ '(halter|dumbbell)' AND lower(x.name) ~ '(eleva|desenvolvimento|rosca direta|rosca alternada|agachamento|avanço|afundo|stiff|remada curvada)' AND lower(x.name) !~ '(banco|inclinado|sentado|scott|supino|crucifixo|máquina|maquina|polia|cabo)')
        OR ('bands'=ANY(v_resources) AND lower(x.name) ~ '(el.stic|resistance band)' AND lower(x.name) !~ '(barra|banco|máquina|maquina|polia)'))
      AND (CASE WHEN v_goal IN ('mobility','recovery') THEN x.equipment='Mobilidade' WHEN v_goal='strength' THEN x.goal IN ('strength','hypertrophy') ELSE x.goal='endurance' END)
      AND (lower(coalesce(v_profile.experience_level,'beginner')) NOT IN ('beginner','iniciante') OR coalesce(lower(x.difficulty_level),'') NOT IN ('advanced','avançado','avancado') AND x.equipment NOT IN ('Crossfit','Pliométricos'))
    ORDER BY EXISTS (SELECT 1 FROM public.workout_exercise_sets s JOIN public.workout_executions w ON w.id=s.execution_id WHERE w.athlete_id=p_athlete_id AND w.status='completed' AND w.completed_at>now()-interval '48 hours' AND s.exercise_name=x.name), random()
    LIMIT v_limit
  ) e;
  IF v_exercises IS NULL THEN RAISE EXCEPTION 'O acervo ainda não tem exercícios compatíveis com este objetivo e estes recursos. Revise a seleção ou abra seu treino planejado.'; END IF;
  v_estimated := 3+ceil(json_array_length(v_exercises)*(v_sets*40+(v_sets-1)*v_rest+30)/60.0)::integer;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_athlete_id::text||v_date::text||'quick',0));
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=p_athlete_id AND workout_date=v_date AND phase_name='quick' AND status IN ('in_progress','completed')) THEN RAISE EXCEPTION 'Um treino rápido já foi iniciado hoje. Retome-o em Treino.'; END IF;
  DELETE FROM public.workout_exercises WHERE daily_workout_id IN (SELECT id FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type='quick');
  DELETE FROM public.daily_workouts WHERE athlete_id=p_athlete_id AND workout_date=v_date AND workout_type='quick';
  INSERT INTO public.daily_workouts(athlete_id,day_number,day_name,focus_muscles,workout_type,workout_date)
  VALUES(p_athlete_id,1,'Treino Rápido · '||v_goal,ARRAY['full_body'],'quick',v_date) RETURNING id INTO v_id;
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds)
  SELECT v_id,(e->>'id')::uuid,ordinality,v_sets,v_reps,v_rest FROM json_array_elements(v_exercises) WITH ORDINALITY t(e,ordinality);
  RETURN json_build_object('daily_workout_id',v_id,'exercises',v_exercises,'estimated_duration_min',v_estimated,'preparation_minutes',3,'requested_duration_min',p_tempo_min,'context',json_build_object('experience_level',v_profile.experience_level,'profile_goal',v_profile.primary_goal,'energy',v_check.energia,'sleep',v_check.sono,'recent_history_used',true,'periodization_phase',v_phase));
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_treino_rapido(uuid,text,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_treino_rapido(uuid,text,integer,text) TO authenticated;

-- Quick prescriptions must be readable by their owner after a reload.
CREATE POLICY fitpro_daily_workouts_owner_select ON public.daily_workouts FOR SELECT TO authenticated USING (athlete_id=(SELECT public.fn_current_athlete_id()));
CREATE POLICY fitpro_workout_exercises_owner_select ON public.workout_exercises FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.daily_workouts d WHERE d.id=daily_workout_id AND d.athlete_id=(SELECT public.fn_current_athlete_id())));
ALTER TABLE public.workout_executions ADD COLUMN IF NOT EXISTS daily_workout_id uuid REFERENCES public.daily_workouts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS workout_executions_daily_workout_idx ON public.workout_executions(daily_workout_id);
CREATE OR REPLACE FUNCTION public.fn_start_daily_workout_execution(p_daily_workout_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_day public.daily_workouts%ROWTYPE; v_execution_id uuid;
BEGIN
  SELECT * INTO v_day FROM public.daily_workouts WHERE id=p_daily_workout_id AND athlete_id=public.fn_current_athlete_id();
  IF v_day.id IS NULL THEN RAISE EXCEPTION 'daily_workout_access_denied' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_day.athlete_id::text||v_day.workout_date::text||CASE WHEN v_day.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
  IF NOT EXISTS (SELECT 1 FROM public.workout_exercises WHERE daily_workout_id=v_day.id) THEN RAISE EXCEPTION 'A prescrição não contém exercícios'; END IF;
  IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status='completed') THEN RAISE EXCEPTION 'Este treino já foi concluído'; END IF;
  IF v_day.workout_type='quick' AND EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND phase_name='quick' AND status='completed') THEN RAISE EXCEPTION 'O treino rápido de hoje já foi concluído'; END IF;
  SELECT id INTO v_execution_id FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND daily_workout_id=v_day.id AND status IN ('started','in_progress','paused') ORDER BY created_at DESC LIMIT 1;
  IF v_execution_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.workout_executions WHERE athlete_id=v_day.athlete_id AND workout_date=v_day.workout_date AND status IN ('started','in_progress','paused')) THEN RAISE EXCEPTION 'Retome ou finalize sua sessão em andamento primeiro'; END IF;
    INSERT INTO public.workout_executions(athlete_id,daily_workout_id,workout_date,started_at,status,phase_name) VALUES(v_day.athlete_id,v_day.id,v_day.workout_date,now(),'in_progress',CASE WHEN v_day.workout_type='quick' THEN 'quick' ELSE v_day.day_name END) RETURNING id INTO v_execution_id;
  ELSE UPDATE public.workout_executions SET status='in_progress' WHERE id=v_execution_id AND status='paused';
  END IF;
  RETURN v_execution_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.fn_start_daily_workout_execution(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_start_daily_workout_execution(uuid) TO authenticated;
