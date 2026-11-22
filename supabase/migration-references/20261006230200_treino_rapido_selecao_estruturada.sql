-- Treino rápido: seleção estruturada (round-robin pernas/empurrar/puxar/core) no lugar de random().
-- Penaliza o feito nas últimas 48h; desempate por hash estável (atleta+dia): mesmo dia = mesmo treino.
CREATE OR REPLACE FUNCTION public.fn_treino_rapido(p_athlete_id uuid, p_objetivo text DEFAULT NULL::text, p_tempo_min integer DEFAULT 20, p_equipamento text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  SELECT json_agg(row_to_json(e) ORDER BY t.ord) INTO v_exercises
  FROM (
    SELECT g.*, row_number() OVER (ORDER BY g.rk, CASE g.grp WHEN 'pernas' THEN 1 WHEN 'empurrar' THEN 2 WHEN 'puxar' THEN 3 WHEN 'core' THEN 4 ELSE 5 END, g.h) AS ord
    FROM (
      SELECT f.*, row_number() OVER (PARTITION BY f.grp ORDER BY f.recent, f.h) AS rk
      FROM (
        SELECT x.id,x.name,x.video_url,x.gif_url,x.instructions,x.description,x.target_muscles,x.difficulty_level,x.equipment,
          (SELECT CASE
             WHEN bool_or(lower(m) ~ '(inferiores|glúteos|gluteos|isquio|quadr|perna)') THEN 'pernas'
             WHEN bool_or(lower(m) ~ '(peitoral|tríceps|triceps|deltoid|ombro)') THEN 'empurrar'
             WHEN bool_or(lower(m) ~ '(dorsal|latíssimo|latissimo|romboide|trapézio|trapezio|bíceps|biceps)') THEN 'puxar'
             WHEN bool_or(lower(m) ~ '(core|abdômen|abdomen|erector)') THEN 'core'
             ELSE 'outros' END
           FROM unnest(x.target_muscles) m) AS grp,
          EXISTS (SELECT 1 FROM public.workout_exercise_sets s JOIN public.workout_executions w ON w.id=s.execution_id WHERE w.athlete_id=p_athlete_id AND w.status='completed' AND w.completed_at>now()-interval '48 hours' AND s.exercise_name=x.name) AS recent,
          hashtextextended(x.id::text||p_athlete_id::text||v_date::text,0) AS h
        FROM public.exercises x
        WHERE (nullif(x.video_url,'') IS NOT NULL OR nullif(x.gif_url,'') IS NOT NULL OR nullif(x.instructions,'') IS NOT NULL)
          AND (('gym'=ANY(v_resources))
            OR ('bodyweight'=ANY(v_resources) AND x.equipment IN ('Peso Corporal','nenhum','Mobilidade') AND lower(x.name) !~ '(halter|dumbbell|el.stic|band|trx|barra|banco|máquina|maquina|cabo|polia|corda|bola|rolo|foam|kettlebell)')
            OR ('dumbbells'=ANY(v_resources) AND lower(x.name) ~ '(halter|dumbbell)' AND lower(x.name) ~ '(eleva|desenvolvimento|rosca direta|rosca alternada|agachamento|avanço|afundo|stiff|remada curvada)' AND lower(x.name) !~ '(banco|inclinado|sentado|scott|supino|crucifixo|máquina|maquina|polia|cabo)')
            OR ('bands'=ANY(v_resources) AND lower(x.name) ~ '(el.stic|resistance band)' AND lower(x.name) !~ '(barra|banco|máquina|maquina|polia)'))
          AND (CASE WHEN v_goal IN ('mobility','recovery') THEN x.equipment='Mobilidade' WHEN v_goal='strength' THEN x.goal IN ('strength','hypertrophy') ELSE x.goal='endurance' END)
          AND (lower(coalesce(v_profile.experience_level,'beginner')) NOT IN ('beginner','iniciante') OR coalesce(lower(x.difficulty_level),'') NOT IN ('advanced','avançado','avancado') AND x.equipment NOT IN ('Crossfit','Pliométricos'))
      ) f
    ) g
    ORDER BY ord
    LIMIT v_limit
  ) t
  CROSS JOIN LATERAL (SELECT t.id,t.name,t.video_url,t.gif_url,t.instructions,t.description,t.target_muscles,t.difficulty_level,t.equipment,v_sets AS sets,v_reps AS reps_range,v_rest AS rest_seconds) e;

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
