ALTER TABLE public.daily_readiness_decisions ADD COLUMN duration_seconds_base numeric, ADD COLUMN duration_seconds_applied numeric;
CREATE FUNCTION private.readiness_duration_seconds(p_dose text) RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE m text[]; low_value numeric; high_value numeric; unit_value numeric;
BEGIN
 m:=regexp_match(lower(btrim(p_dose)),'^([0-9]+)(-([0-9]+))?[[:space:]]*(s|seg|segundos?|min|minutos?)$');
 IF m IS NULL THEN RETURN NULL;END IF;
 low_value:=m[1]::numeric;high_value:=coalesce(m[3],m[1])::numeric;
 IF low_value<=0 OR high_value<low_value THEN RETURN NULL;END IF;
 unit_value:=CASE WHEN m[4] LIKE 'min%' THEN 60 ELSE 1 END;
 RETURN (low_value+high_value)/2*unit_value;
END $$;
CREATE FUNCTION private.readiness_scaled_duration(p_dose text,p_factor numeric) RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE m text[]; a int; b int; unit_value numeric;
BEGIN
 m:=regexp_match(lower(btrim(p_dose)),'^([0-9]+)(-([0-9]+))?[[:space:]]*(s|seg|segundos?|min|minutos?)$');
 IF m IS NULL THEN RETURN p_dose;END IF;
 unit_value:=CASE WHEN m[4] LIKE 'min%' THEN 60 ELSE 1 END;
 a:=greatest(1,CASE WHEN p_factor<1 THEN ceil(m[1]::numeric*unit_value*p_factor) ELSE floor(m[1]::numeric*unit_value*p_factor) END)::int;
 b:=greatest(a,CASE WHEN p_factor<1 THEN ceil(coalesce(m[3],m[1])::numeric*unit_value*p_factor) ELSE floor(coalesce(m[3],m[1])::numeric*unit_value*p_factor) END)::int;
 RETURN CASE WHEN a=b THEN a::text ELSE a::text||'-'||b::text END||' s';
END $$;
REVOKE ALL ON FUNCTION private.readiness_duration_seconds(text),private.readiness_scaled_duration(text,numeric) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.apply_readiness(p_athlete_id uuid,p_workout_id uuid,p_observe_only boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; w public.daily_workouts; before_rows jsonb:='[]'; base_rows jsonb:='[]'; after_rows jsonb:='[]';
 key text; rec public.daily_readiness_decisions; phase text; original int:=0; desired int:=0; remaining int:=0;
 applied int:=0; item jsonb; qty int; take int; delta numeric; locked boolean:=false;is_timed boolean:=false;base_duration numeric;after_duration numeric;time_budget numeric;rest_budget numeric;effective_factor numeric;parsed_missing boolean:=false;
BEGIN
 d:=private.compute_readiness(p_athlete_id,p_workout_id);
 IF d->>'status'<>'ready' THEN RETURN d; END IF;
 IF p_workout_id IS NOT NULL THEN
  SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id;
  IF w.id IS NULL OR w.workout_date<>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RETURN jsonb_build_object('status','workout_unavailable'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(w.athlete_id::text||w.workout_date::text||CASE WHEN w.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
  SELECT * INTO w FROM public.daily_workouts WHERE id=p_workout_id AND athlete_id=p_athlete_id FOR UPDATE;
  d:=private.compute_readiness(p_athlete_id,p_workout_id);
  IF d->>'status'<>'ready' THEN RETURN d;END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(bool_or(override_locked),false) INTO before_rows,locked FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 END IF;
 base_rows:=coalesce(w.changes_json#>'{readiness,base_exercises}',before_rows);
 SELECT coalesce(sum(greatest(1,coalesce((x->>'sets')::int,1))),0)::int INTO original FROM jsonb_array_elements(base_rows)x;
 delta:=(d->>'volume_pct_total')::numeric;
 is_timed:=lower(coalesce(w.workout_type,'')||' '||coalesce(w.day_name,''))~'(cardio|corrida|running)';
 IF is_timed THEN
  SELECT coalesce(sum(private.readiness_duration_seconds(x->>'reps_range')*greatest(1,coalesce((x->>'sets')::int,1))),0),coalesce(bool_or(private.readiness_duration_seconds(x->>'reps_range') IS NULL),true),
   coalesce(sum(greatest(0,coalesce((x->>'sets')::int,1)-1)*(coalesce((x->>'rest_seconds')::int,60)+(d->>'rest_delta_s')::int)),0)+(3+(d->>'warmup_add_min')::int)*60
   INTO base_duration,parsed_missing,rest_budget FROM jsonb_array_elements(base_rows)x;
  IF w.changes_json->>'readiness_time_budget_seconds'~'^[0-9]+$' THEN time_budget:=(w.changes_json->>'readiness_time_budget_seconds')::numeric;ELSE
   SELECT CASE WHEN settings.preferences->>'session_minutes'~'^[0-9]+$' THEN (settings.preferences->>'session_minutes')::numeric*60 END INTO time_budget
    FROM public.readiness_preferences pref JOIN public.user_context_settings settings ON settings.user_id=pref.user_id WHERE pref.athlete_id=p_athlete_id AND pref.enabled LIMIT 1;
  END IF;
  time_budget:=coalesce(time_budget,base_duration+rest_budget);
  effective_factor:=greatest(.7,least(1.1,1+delta/100,coalesce((time_budget-rest_budget)/nullif(base_duration,0),1)));
 END IF;
 desired:=CASE WHEN delta<0 THEN least(floor(original*.3)::int,floor(original*abs(delta)/100)::int) WHEN delta>=10 THEN least(1,floor(original*.1)::int) ELSE 0 END;
 phase:=CASE WHEN p_workout_id IS NULL OR original=0 THEN 'skipped_no_workout'
  WHEN w.override_locked OR locked OR w.changes_json->>'readiness_suppressed_date'=(d->>'date') OR w.prescription_issue IS NOT NULL OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN 'skipped_locked'
  WHEN (d->>'gate_level')::int>0 OR (is_timed AND (parsed_missing OR base_duration<=0 OR time_budget-rest_budget<base_duration*.7)) THEN 'skipped_review'
  WHEN w.changes_json#>'{readiness,after_exercises}' IS NOT NULL AND before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN 'skipped_changed'
  WHEN p_observe_only OR now()<(d->>'apply_after')::timestamptz THEN 'shadow'
  ELSE 'applied' END;
 IF is_timed AND phase='skipped_review' THEN d:=jsonb_set(d,'{flags}',(d->'flags')||'["timed_session_review"]');END IF;
 key:=md5(p_athlete_id::text||coalesce(p_workout_id::text,'none')||(d-'apply_after')::text||base_rows::text||CASE WHEN phase='skipped_changed' THEN before_rows::text ELSE '' END);
 SELECT * INTO rec FROM public.daily_readiness_decisions WHERE decision_key=key;
 IF rec.id IS NOT NULL AND (rec.status=phase OR (rec.status='applied' AND phase IN('skipped_locked','shadow'))) THEN RETURN to_jsonb(rec); END IF;
 IF phase='applied' THEN
  remaining:=desired;
  -- Restore only the recorded base doses. Never delete or replace exercise identities.
  FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
   UPDATE public.workout_exercises SET sets=(item->>'sets')::int,reps_range=item->>'reps_range',rest_seconds=(item->>'rest_seconds')::int,rpe_target=(item->>'rpe_target')::int WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
  END LOOP;
  IF is_timed THEN
   FOR item IN SELECT value FROM jsonb_array_elements(base_rows) LOOP
    UPDATE public.workout_exercises SET reps_range=private.readiness_scaled_duration(item->>'reps_range',effective_factor) WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
   END LOOP;
  ELSE
  IF delta<0 THEN
   FOR item IN SELECT value FROM jsonb_array_elements(base_rows) ORDER BY (value->>'exercise_order')::int DESC,value->>'id' LOOP
    qty:=greatest(1,coalesce((item->>'sets')::int,1));take:=least(remaining,qty-1);
    UPDATE public.workout_exercises SET sets=qty-take WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
    remaining:=remaining-take;EXIT WHEN remaining=0;
   END LOOP;
  ELSIF delta>=10 AND desired=1 THEN
   SELECT value INTO item FROM jsonb_array_elements(base_rows) WHERE coalesce(value#>>'{observations,block}','')<>'reset' ORDER BY (value->>'exercise_order')::int,value->>'id' LIMIT 1;
   UPDATE public.workout_exercises SET sets=sets+1 WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;remaining:=0;
  END IF;
  END IF;
  UPDATE public.workout_exercises SET rest_seconds=coalesce(rest_seconds,60)+(d->>'rest_delta_s')::int,
   rpe_target=CASE WHEN rpe_target IS NOT NULL THEN greatest(1,floor(rpe_target+(d->>'rpe_cap_delta')::numeric)::int) ELSE rpe_target END WHERE daily_workout_id=w.id;
  SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]'),coalesce(sum(sets),0)::int INTO after_rows,applied FROM public.workout_exercises e WHERE daily_workout_id=w.id;
  IF is_timed THEN SELECT coalesce(sum(private.readiness_duration_seconds(x->>'reps_range')*greatest(1,coalesce((x->>'sets')::int,1))),0) INTO after_duration FROM jsonb_array_elements(after_rows)x;END IF;
  INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,p_athlete_id,auth.uid(),before_rows,after_rows);
  UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')||jsonb_build_object('readiness',jsonb_build_object('base_exercises',base_rows,'after_exercises',after_rows,'decision_key',key,'warmup_add_min',(d->>'warmup_add_min')::int,'base_estimated_duration_minutes',coalesce(w.changes_json#>'{readiness,base_estimated_duration_minutes}',to_jsonb(w.estimated_duration_minutes)))),estimated_duration_minutes=CASE WHEN is_timed THEN ceil((after_duration+rest_budget)/60)::int ELSE estimated_duration_minutes END,updated_at=now() WHERE id=w.id;
 ELSE applied:=original;after_duration:=base_duration; END IF;
 UPDATE public.daily_readiness_decisions SET status='superseded',updated_at=now() WHERE athlete_id=p_athlete_id AND decision_date=(d->>'date')::date AND applied_workout_id IS NOT DISTINCT FROM p_workout_id AND decision_key<>key AND (status NOT IN('superseded','applied') OR (phase='skipped_changed' AND status='applied'));
 INSERT INTO public.daily_readiness_decisions(decision_key,athlete_id,decision_date,checkin_id,rule_set_version,mode,volume_pct_total,volume_pct_applied,rpe_cap_delta,rest_delta_s,warmup_add_min,gate_level,flags,reasons,inputs,applied_workout_id,status,base_sets,applied_sets,duration_seconds_base,duration_seconds_applied)
 VALUES(key,p_athlete_id,(d->>'date')::date,(d->>'checkin_id')::uuid,d->>'rule_set_version',d->>'mode',delta,CASE WHEN phase='applied' AND is_timed AND base_duration>0 THEN round((after_duration-base_duration)*100.0/base_duration,1) WHEN original>0 AND phase='applied' THEN round((applied-original)*100.0/original,1) ELSE 0 END,(d->>'rpe_cap_delta')::numeric,(d->>'rest_delta_s')::int,(d->>'warmup_add_min')::int,(d->>'gate_level')::int,d->'flags',d->'reasons',d->'inputs',p_workout_id,phase,original,applied,base_duration,after_duration)
 ON CONFLICT(decision_key) DO UPDATE SET status=excluded.status,volume_pct_applied=excluded.volume_pct_applied,base_sets=excluded.base_sets,applied_sets=excluded.applied_sets,duration_seconds_base=excluded.duration_seconds_base,duration_seconds_applied=excluded.duration_seconds_applied,updated_at=now() RETURNING * INTO rec;
 RETURN to_jsonb(rec);
END $$;

CREATE OR REPLACE FUNCTION public.fn_revert_readiness_workout(p_daily_workout_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.daily_workouts; item jsonb; before_rows jsonb; after_rows jsonb;
BEGIN
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id;
 IF auth.uid() IS NULL OR w.id IS NULL OR NOT(coalesce(w.athlete_id=public.fn_current_athlete_id(),false) OR private.fitpro_can_manage_athlete(w.athlete_id)) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(w.athlete_id::text||w.workout_date::text||CASE WHEN w.workout_type='quick' THEN 'quick' ELSE 'daily' END,0));
 SELECT * INTO w FROM public.daily_workouts WHERE id=p_daily_workout_id FOR UPDATE;
 IF w.override_locked OR EXISTS(SELECT 1 FROM public.workout_executions WHERE daily_workout_id=w.id AND status IN('started','in_progress','paused','completed')) THEN RAISE EXCEPTION 'workout_locked';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]') INTO before_rows FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 IF w.changes_json#>'{readiness,after_exercises}' IS NULL THEN RETURN jsonb_build_object('saved',true);END IF;
 IF before_rows IS DISTINCT FROM w.changes_json#>'{readiness,after_exercises}' THEN RAISE EXCEPTION 'prescription_changed_by_professional';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(w.changes_json#>'{readiness,base_exercises}') LOOP
  UPDATE public.workout_exercises SET sets=(item->>'sets')::int,reps_range=item->>'reps_range',rest_seconds=(item->>'rest_seconds')::int,rpe_target=(item->>'rpe_target')::int WHERE id=(item->>'id')::uuid AND daily_workout_id=w.id;
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY exercise_order,id),'[]') INTO after_rows FROM public.workout_exercises e WHERE daily_workout_id=w.id;
 INSERT INTO public.workout_adjustment_versions(daily_workout_id,athlete_id,changed_by,before_exercises,after_exercises) VALUES(w.id,w.athlete_id,auth.uid(),before_rows,after_rows);
 UPDATE public.daily_workouts SET estimated_duration_minutes=CASE WHEN w.changes_json#>'{readiness,base_estimated_duration_minutes}' IS NOT NULL THEN (w.changes_json#>>'{readiness,base_estimated_duration_minutes}')::int ELSE estimated_duration_minutes END,changes_json=(changes_json-'readiness')||jsonb_build_object('readiness_suppressed_date',w.workout_date),updated_at=now() WHERE id=w.id;
 UPDATE public.daily_readiness_decisions SET status='superseded',updated_at=now() WHERE applied_workout_id=w.id AND status<>'superseded';
 RETURN jsonb_build_object('saved',true);
END $$;

NOTIFY pgrst,'reload schema';
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
  v_restricted boolean := false;
  v_tempo integer := CASE WHEN p_tempo_min BETWEEN 10 AND 75 THEN (SELECT t FROM unnest(ARRAY[15,20,30,45,60]) t ORDER BY abs(t-p_tempo_min), t LIMIT 1) END;
BEGIN
 PERFORM private.fitpro_require_current_access();
  IF auth.uid() IS NULL OR (NOT EXISTS (SELECT 1 FROM public.athletes a WHERE a.id=p_athlete_id AND (a.user_id=auth.uid() OR a.coach_id=auth.uid())) AND NOT EXISTS (SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=p_athlete_id AND l.user_id=auth.uid())) THEN RAISE EXCEPTION 'athlete_access_denied' USING ERRCODE='42501'; END IF;
  IF v_goal IS NULL OR v_goal NOT IN ('strength','cardio','mobility','recovery') OR v_tempo IS NULL THEN RAISE EXCEPTION 'Objetivo ou duração inválidos'; END IF;
  SELECT * INTO STRICT v_profile FROM public.athletes WHERE id=p_athlete_id;
  IF v_new IS NOT TRUE AND v_goal NOT IN ('mobility','recovery') AND nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes') THEN
    v_goal := 'mobility';
    v_restricted := true;
  END IF;
  SELECT * INTO v_check FROM public.daily_checkins WHERE athlete_id=p_athlete_id AND checkin_date=v_date;
  IF v_new AND (v_check.id IS NULL OR v_check.sono IS NULL OR v_check.energia IS NULL OR v_check.humor IS NULL OR v_check.motivacao IS NULL OR v_check.dor IS NULL) THEN RAISE EXCEPTION 'Faça a calibração completa antes de montar o treino'; END IF;
  IF v_new AND (coalesce(v_check.dor,0)>=3 OR nullif(trim(v_check.dor_local),'') IS NOT NULL OR (nullif(trim(v_profile.injuries_limitations),'') IS NOT NULL AND lower(trim(v_profile.injuries_limitations)) NOT IN ('nenhuma','nenhum','não','nao','none','sem restrições','sem restricoes'))) THEN RAISE EXCEPTION 'Revise suas restrições em Ajuste de Treino antes de gerar uma nova sessão'; END IF;
  v_resources := CASE
    WHEN v_new THEN string_to_array(substr(p_equipamento,11),',')
    WHEN p_equipamento IS NULL THEN ARRAY['bodyweight','dumbbells','bands']
    WHEN p_equipamento IN ('home','outdoor') THEN ARRAY['bodyweight']
    WHEN p_equipamento='home_basic' THEN ARRAY['bodyweight','dumbbells','bands']
    WHEN p_equipamento='gym' THEN ARRAY['gym']
    ELSE NULL END;
  IF v_resources IS NULL OR cardinality(v_resources)=0 OR EXISTS (SELECT 1 FROM unnest(v_resources) r WHERE r NOT IN ('bodyweight','dumbbells','bands','gym')) THEN RAISE EXCEPTION 'Selecione os recursos disponíveis'; END IF;
  SELECT current_phase::text INTO v_phase FROM public.vw_athlete_periodizacao_ativa WHERE athlete_id=p_athlete_id LIMIT 1;
  v_sets := CASE WHEN lower(coalesce(v_phase,'')) ~ '(deload|recuper|descarga)' OR lower(coalesce(v_profile.experience_level,'beginner')) IN ('beginner','iniciante') OR coalesce(v_check.energia,5)<=2 OR v_goal='recovery' THEN 2 ELSE 3 END;
  v_reps := CASE WHEN v_goal IN ('mobility','recovery') THEN '20-30 s' WHEN v_goal='cardio' THEN '30 s' ELSE '8-12' END;
  v_rest := CASE WHEN v_goal IN ('mobility','recovery') THEN 30 WHEN coalesce(v_check.energia,5)<=2 THEN 90 ELSE 60 END;
  v_limit := greatest(1,least(10,floor((v_tempo-3)*60.0/(v_sets*40+(v_sets-1)*v_rest+30))::integer));

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
  INSERT INTO public.daily_workouts(athlete_id,day_number,day_name,focus_muscles,workout_type,workout_date,estimated_duration_minutes,changes_json)
  VALUES(p_athlete_id,1,'Treino Rápido · '||v_goal,ARRAY['full_body'],'quick',v_date,v_estimated,jsonb_build_object('readiness_time_budget_seconds',v_tempo*60)) RETURNING id INTO v_id;
  INSERT INTO public.workout_exercises(daily_workout_id,exercise_id,exercise_order,sets,reps_range,rest_seconds)
  SELECT v_id,(e->>'id')::uuid,ordinality,v_sets,v_reps,v_rest FROM json_array_elements(v_exercises) WITH ORDINALITY t(e,ordinality);
  RETURN json_build_object('daily_workout_id',v_id,'exercises',v_exercises,'estimated_duration_min',v_estimated,'preparation_minutes',3,'requested_duration_min',v_tempo,'restricao_aplicada',v_restricted,'objetivo_aplicado',v_goal,'sets_default',v_sets,'reps_default',v_reps,'rest_default_seconds',v_rest,'context',json_build_object('experience_level',v_profile.experience_level,'profile_goal',v_profile.primary_goal,'energy',v_check.energia,'sleep',v_check.sono,'recent_history_used',true,'periodization_phase',v_phase));
END;
$function$

