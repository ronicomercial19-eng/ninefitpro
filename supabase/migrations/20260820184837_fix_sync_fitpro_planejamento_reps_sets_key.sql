
CREATE OR REPLACE FUNCTION public.sync_fitpro_planejamento(p_athlete_id uuid, p_origin text DEFAULT 'trigger'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment RECORD;
  v_plan RECORD;
  v_snap_id uuid;
  v_level text;
  v_phase text;
  v_cycle text;
  v_ondas jsonb;
  v_payload jsonb;
  v_mesos jsonb;
  v_master_rules jsonb;
  v_macros jsonb;
  v_goal text;
BEGIN
  IF p_athlete_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_assignment
    FROM public.athlete_periodizations
   WHERE athlete_id = p_athlete_id
     AND status IN ('in_progress','active')
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_assignment.annual_plan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_plan
    FROM public.periodization_annual_plans
   WHERE id = v_assignment.annual_plan_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_goal := COALESCE(lower(v_plan.annual_goal), 'hipertrofia');
  v_mesos := COALESCE(v_plan.mesocycles, '[]'::jsonb);
  v_macros := COALESCE(v_plan.macrocycles, '[]'::jsonb);
  v_master_rules := COALESCE(v_plan.master_rules, '{}'::jsonb);

  -- Auto-fill mesocycles when missing based on annual_goal
  IF jsonb_array_length(v_mesos) = 0 THEN
    v_mesos := CASE
      WHEN v_goal IN ('forca','força','strength') THEN jsonb_build_array(
        jsonb_build_object('name','Base','phase','base','weeks',4,'rpe_cap',7,'reps_range','6-8','sets_range','3-4'),
        jsonb_build_object('name','Força Máxima','phase','strength','weeks',4,'rpe_cap',9,'reps_range','3-5','sets_range','4-5'),
        jsonb_build_object('name','Peaking','phase','peaking','weeks',3,'rpe_cap',10,'reps_range','1-3','sets_range','3-5'),
        jsonb_build_object('name','Deload','phase','recovery','weeks',1,'rpe_cap',6,'reps_range','5-8','sets_range','2-3')
      )
      WHEN v_goal IN ('resistencia','resistência','endurance') THEN jsonb_build_array(
        jsonb_build_object('name','Base Aeróbica','phase','base','weeks',4,'rpe_cap',6,'reps_range','15-20','sets_range','3'),
        jsonb_build_object('name','Tempo','phase','tempo','weeks',4,'rpe_cap',7,'reps_range','12-15','sets_range','3-4'),
        jsonb_build_object('name','Limiar','phase','threshold','weeks',4,'rpe_cap',8,'reps_range','10-12','sets_range','4'),
        jsonb_build_object('name','Recuperação','phase','recovery','weeks',1,'rpe_cap',5,'reps_range','15','sets_range','2')
      )
      ELSE jsonb_build_array(
        jsonb_build_object('name','Acumulação','phase','hypertrophy','weeks',4,'rpe_cap',7,'reps_range','10-12','sets_range','3-4'),
        jsonb_build_object('name','Intensificação','phase','hypertrophy','weeks',4,'rpe_cap',9,'reps_range','8-10','sets_range','4'),
        jsonb_build_object('name','Realização','phase','strength','weeks',3,'rpe_cap',10,'reps_range','6-8','sets_range','4-5'),
        jsonb_build_object('name','Deload','phase','recovery','weeks',1,'rpe_cap',6,'reps_range','10','sets_range','2-3')
      )
    END;
  END IF;

  -- Auto-fill master rules when missing
  IF v_master_rules = '{}'::jsonb THEN
    v_master_rules := jsonb_build_object(
      'volume','moderate',
      'intensity','moderate',
      'recovery','auto',
      'deload_every',4
    );
  END IF;

  v_level := COALESCE(
    CASE jsonb_typeof(v_plan.dominant_profile)
      WHEN 'string' THEN v_plan.dominant_profile #>> '{}'
      WHEN 'object' THEN v_plan.dominant_profile ->> 'name'
      ELSE NULL
    END,
    'intermediario'
  );

  v_phase := COALESCE((v_mesos -> 0 ->> 'name'), (v_mesos -> 0 ->> 'phase'), 'adaptacao');
  v_cycle := COALESCE((v_macros -> 0 ->> 'name'), 'macro-1');

  -- Build ondas with start/end week + status
  WITH mesos AS (
    SELECT m, ord, COALESCE((m->>'weeks')::int, 4) AS w
      FROM jsonb_array_elements(v_mesos) WITH ORDINALITY AS t(m, ord)
  ), cumulative AS (
    SELECT m, ord, w,
           COALESCE(SUM(w) OVER (ORDER BY ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) + 1 AS start_week,
           SUM(w) OVER (ORDER BY ord) AS end_week
      FROM mesos
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'nome', COALESCE(m ->> 'name', m ->> 'phase', 'Onda ' || (ord::text)),
      'phase', m ->> 'phase',
      'weeks', w,
      'start_week', start_week,
      'end_week', end_week,
      'status', CASE WHEN ord = 1 THEN 'in_progress' ELSE 'pending' END,
      'rpe_cap', COALESCE(m -> 'rpe_cap', m -> 'rpe'),
      'reps', COALESCE(m -> 'reps_range', m -> 'reps'),
      'sets', COALESCE(m -> 'sets_range', m -> 'sets')
    ) ORDER BY ord
  ), '[]'::jsonb)
  INTO v_ondas
  FROM cumulative;

  v_payload := jsonb_build_object(
    'annual_goal',        v_plan.annual_goal,
    'dominant_profile',   v_plan.dominant_profile,
    'scores',             COALESCE(v_plan.scores, '{}'::jsonb),
    'flags',              COALESCE(v_plan.flags, '[]'::jsonb),
    'selected_chief_id',  v_plan.selected_chief_id,
    'selected_model_id',  v_plan.selected_model_id,
    'master_rules',       v_master_rules,
    'macrocycles',        v_macros,
    'mesocycles',         v_mesos,
    'micro_rules',        COALESCE(v_plan.micro_rules, '{}'::jsonb),
    'output_json',        COALESCE(v_plan.output_json, '{}'::jsonb),
    'ondas',              v_ondas,
    'synced_at',          now(),
    'sync_origin',        p_origin
  );

  INSERT INTO public.fitpro_smartperiodizer_periodizations (
    fitpro_student_id, fitpro_professor_id, smartperiodizer_periodization_id,
    goal, training_level, current_phase, current_cycle, cycle_week,
    status, payload, updated_at
  ) VALUES (
    p_athlete_id, v_plan.coach_id, v_plan.id::text,
    COALESCE(v_plan.annual_goal, 'geral'), v_level, v_phase, v_cycle, 1,
    'active', v_payload, now()
  )
  ON CONFLICT (smartperiodizer_periodization_id) DO UPDATE
    SET fitpro_student_id = EXCLUDED.fitpro_student_id,
        fitpro_professor_id = EXCLUDED.fitpro_professor_id,
        goal = EXCLUDED.goal,
        training_level = EXCLUDED.training_level,
        current_phase = EXCLUDED.current_phase,
        current_cycle = EXCLUDED.current_cycle,
        status = 'active',
        payload = EXCLUDED.payload,
        updated_at = now()
  RETURNING id INTO v_snap_id;

  UPDATE public.fitpro_smartperiodizer_periodizations
     SET status = 'archived', updated_at = now()
   WHERE fitpro_student_id = p_athlete_id
     AND id <> v_snap_id
     AND status = 'active';

  RETURN v_snap_id;
EXCEPTION WHEN OTHERS THEN
  BEGIN
    INSERT INTO public.periodization_generation_failures
      (athlete_id, plan_id, assignment_id, origin, error_reason, error_detail, payload)
    VALUES (
      p_athlete_id,
      COALESCE(v_assignment.annual_plan_id, NULL),
      COALESCE(v_assignment.id, NULL),
      COALESCE(p_origin, 'trigger'),
      SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE, 'fn', 'sync_fitpro_planejamento'),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END;
$function$;
;
