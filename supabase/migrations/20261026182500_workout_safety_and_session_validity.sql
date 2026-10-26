-- Preserve historical prescriptions and unknown taxonomy; never guess an exercise ID.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION public.fitpro_normalize_term(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT btrim(regexp_replace(translate(lower(coalesce(p_text,'')),
 'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'),'[^a-z0-9]+',' ','g'))
$$;
CREATE OR REPLACE FUNCTION public.fitpro_muscle_key(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE public.fitpro_normalize_term(p_text)
 WHEN 'abdomen' THEN 'core' WHEN 'abdominais' THEN 'core'
 WHEN 'ombro' THEN 'deltoides' WHEN 'ombros' THEN 'deltoides'
 WHEN 'latissimo' THEN 'dorsais' WHEN 'costas' THEN 'dorsais'
 WHEN 'posterior de coxa' THEN 'isquiotibiais' WHEN 'corpo todo' THEN 'full_body'
 WHEN 'full body' THEN 'full_body' WHEN 'lower body' THEN 'membros inferiores'
 ELSE public.fitpro_normalize_term(p_text) END
$$;
CREATE OR REPLACE FUNCTION public.fitpro_matches_focus(p_muscles text[], p_focus text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM unnest(p_muscles) m, unnest(p_focus) f
 WHERE public.fitpro_muscle_key(m)=public.fitpro_muscle_key(f)
 OR public.fitpro_muscle_key(f)='full_body'
 OR (public.fitpro_muscle_key(f)='membros inferiores' AND public.fitpro_muscle_key(m) IN
 ('gluteos','isquiotibiais','quadriceps','panturrilhas','adutores','abdutores')))
$$;

CREATE TABLE private.workout_safety_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 daily_workout_id uuid NOT NULL, athlete_id uuid NOT NULL, workout_date date,
 reason text NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.workout_safety_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.workout_safety_audit FROM PUBLIC, anon, authenticated;

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS taxonomy_review_required boolean NOT NULL DEFAULT false;
UPDATE public.exercises SET muscle_groups=(SELECT coalesce(jsonb_agg(DISTINCT public.fitpro_muscle_key(m)), '[]'::jsonb) FROM unnest(target_muscles) m),
 taxonomy_review_required=NOT EXISTS(SELECT 1 FROM unnest(target_muscles) m WHERE public.fitpro_muscle_key(m) IN
 ('core','biceps','triceps','deltoides','dorsais','romboides','trapezio','erectores','peitoral','gluteos','isquiotibiais','membros inferiores','quadriceps','panturrilhas','cardio'));

-- These movements do not have a video yet. Do not attach a different movement's video.
INSERT INTO public.exercises(name,description,target_muscles,muscle_groups,phase,goal,difficulty_level,instructions,taxonomy_review_required)
SELECT v.name,v.description,v.muscles,to_jsonb(v.muscles),'base','endurance','beginner',v.description,false
FROM (VALUES
 ('Bracing abdominal','Ativação abdominal isométrica. A dose deve vir da prescrição do profissional.',ARRAY['core']),
 ('Ponte isométrica de quadril','Ponte de quadril com sustentação. A dose deve vir da prescrição do profissional.',ARRAY['gluteos','isquiotibiais']),
 ('Liberação miofascial com rolo — membros inferiores','Liberação com rolo conforme orientação do profissional.',ARRAY['membros inferiores']),
 ('Drill de mobilidade de quadril','Mobilidade de quadril conforme orientação do profissional.',ARRAY['membros inferiores'])
) v(name,description,muscles)
WHERE NOT EXISTS(SELECT 1 FROM public.exercises e WHERE public.fitpro_normalize_term(e.name)=public.fitpro_normalize_term(v.name));

ALTER TABLE public.workout_exercises ADD COLUMN IF NOT EXISTS exercise_name text;
-- Capture the current catalogue name; the source names of old rows cannot be recovered.
UPDATE public.workout_exercises w SET exercise_name=e.name FROM public.exercises e
WHERE e.id=w.exercise_id AND w.exercise_name IS NULL AND NOT EXISTS(
 SELECT 1 FROM public.daily_workouts d JOIN public.workout_executions x ON x.athlete_id=d.athlete_id AND x.workout_date=d.workout_date WHERE d.id=w.daily_workout_id);

-- New manual prescriptions have no focus input in the existing RPC. Derive it
-- from the professional's explicitly selected IDs; existing focuses stay locked.
DO $patch$
DECLARE r record;v_def text;
BEGIN
 FOR r IN SELECT oid,proname FROM pg_proc WHERE pronamespace='public'::regnamespace
 AND proname IN ('fn_professor_publish_workout','fn_publicar_treino_smartreino') LOOP
  v_def:=pg_get_functiondef(r.oid);
  IF r.proname='fn_professor_publish_workout' THEN
   v_def:=replace(v_def,'ARRAY[]::text[],''hypertrophy''',
    'ARRAY(SELECT DISTINCT unnest(e.target_muscles) FROM public.exercises e WHERE e.id IN (SELECT (item->>''exercise_id'')::uuid FROM jsonb_array_elements(p_exercises) item)),''hypertrophy''');
  ELSE
   v_def:=replace(v_def,'COALESCE((v_ex->>''exercise_order'')::int, 0)','COALESCE((v_ex->>''exercise_order'')::int, v_count+1)');
  END IF;
  EXECUTE v_def;
 END LOOP;
END $patch$;

CREATE OR REPLACE FUNCTION private.fitpro_workout_row_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_name text; v_muscles text[]; v_focus text[];
BEGIN
 SELECT e.name,ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)) INTO v_name,v_muscles FROM public.exercises e WHERE id=NEW.exercise_id;
 IF v_name IS NULL THEN RAISE EXCEPTION 'exercise_not_found' USING ERRCODE='23514'; END IF;
 IF NEW.exercise_name IS NOT NULL AND public.fitpro_normalize_term(NEW.exercise_name)<>public.fitpro_normalize_term(v_name) THEN
  RAISE EXCEPTION 'exercise_name_id_mismatch: %',NEW.exercise_name USING ERRCODE='23514';
 END IF;
 SELECT focus_muscles INTO v_focus FROM public.daily_workouts WHERE id=NEW.daily_workout_id FOR UPDATE;
 IF coalesce(cardinality(v_focus),0)=0 OR NOT public.fitpro_matches_focus(v_muscles,v_focus) THEN
  RAISE EXCEPTION 'exercise_outside_daily_focus: %',v_name USING ERRCODE='23514';
 END IF;
 IF NEW.exercise_order IS NULL OR NEW.exercise_order<1 OR EXISTS(SELECT 1 FROM public.workout_exercises w WHERE w.daily_workout_id=NEW.daily_workout_id AND w.exercise_order=NEW.exercise_order AND w.id<>NEW.id) THEN
  RAISE EXCEPTION 'invalid_or_duplicate_exercise_order' USING ERRCODE='23514';
 END IF;
 NEW.exercise_name:=v_name; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_workout_row_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER fitpro_workout_row_guard BEFORE INSERT OR UPDATE OF exercise_id,exercise_name,exercise_order,daily_workout_id
 ON public.workout_exercises FOR EACH ROW EXECUTE FUNCTION private.fitpro_workout_row_guard();

-- Report every affected workout without changing completed or active prescriptions.
INSERT INTO private.workout_safety_audit(daily_workout_id,athlete_id,workout_date,reason,snapshot)
SELECT d.id,d.athlete_id,d.workout_date,'outside_focus_or_duplicate_order',
 jsonb_build_object('day',to_jsonb(d),'exercises',(SELECT jsonb_agg(to_jsonb(w) ORDER BY exercise_order) FROM public.workout_exercises w WHERE w.daily_workout_id=d.id))
FROM public.daily_workouts d WHERE EXISTS(
 SELECT 1 FROM public.workout_exercises w JOIN public.exercises e ON e.id=w.exercise_id WHERE w.daily_workout_id=d.id
 AND (NOT public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)),d.focus_muscles)
 OR EXISTS(SELECT 1 FROM public.workout_exercises x WHERE x.daily_workout_id=d.id AND x.exercise_order=w.exercise_order AND x.id<>w.id)));
UPDATE public.daily_workouts d SET prescription_issue=coalesce(d.prescription_issue,'exercise_focus_or_order_review')
WHERE EXISTS(SELECT 1 FROM private.workout_safety_audit a WHERE a.daily_workout_id=d.id);

-- status is text with a CHECK, not an enum. Keep the old values and add abandoned.
ALTER TABLE public.workout_executions DROP CONSTRAINT workout_executions_status_check;
ALTER TABLE public.workout_executions ADD CONSTRAINT workout_executions_status_check
 CHECK(status IN ('in_progress','completed','skipped','abandoned'));
CREATE OR REPLACE FUNCTION private.fitpro_abandon_stale_sessions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_count integer;
BEGIN
 UPDATE public.workout_executions SET status='abandoned',
 notes=concat_ws(E'\n',nullif(notes,''),'[auto_abandoned_12h] Sessão encerrada após 12 horas sem finalização; séries preservadas.')
 WHERE status='in_progress' AND coalesce(started_at,created_at)<now()-interval '12 hours';
 GET DIAGNOSTICS v_count=ROW_COUNT; RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_abandon_stale_sessions() FROM PUBLIC,anon,authenticated;
SELECT private.fitpro_abandon_stale_sessions();
SELECT cron.schedule('fitpro-abandon-stale-sessions','*/15 * * * *','SELECT private.fitpro_abandon_stale_sessions()');

ALTER TABLE public.workout_executions ADD COLUMN IF NOT EXISTS completion_valid boolean NOT NULL DEFAULT false;
ALTER TABLE public.workout_executions ADD COLUMN IF NOT EXISTS completion_validation_reason text;
CREATE OR REPLACE FUNCTION private.fitpro_completion_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_seconds numeric; v_sets boolean;
BEGIN
 IF NEW.status='completed' THEN
  v_seconds:=extract(epoch FROM (NEW.completed_at-NEW.started_at));
  SELECT EXISTS(SELECT 1 FROM public.workout_exercise_sets s WHERE s.execution_id=NEW.id AND s.completed IS TRUE) INTO v_sets;
  NEW.completion_valid:=coalesce(v_seconds>=300,false) AND v_sets;
  NEW.completion_validation_reason:=CASE WHEN NOT v_sets THEN 'no_completed_set' WHEN coalesce(v_seconds,0)<300 THEN 'duration_under_5_minutes' ELSE NULL END;
 ELSE NEW.completion_valid:=false; NEW.completion_validation_reason:=NULL; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_completion_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_completion_guard BEFORE INSERT OR UPDATE ON public.workout_executions
FOR EACH ROW EXECUTE FUNCTION private.fitpro_completion_guard();
-- Prevent invalid completions from awarding XP, missions, bonus credits or
-- emitting a completed notification. Backfill never repeats those effects.
DO $patch$
DECLARE r record;v_def text;
BEGIN
 FOR r IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('trg_activation_day7','trg_workout_xp_and_score','fn_award_xp_on_workout_completion',
 'fn_core_os_workout_completed','trg_loop_emit_workout','fn_notify_workout_completed','fn_on_workout_completed') LOOP
  v_def:=pg_get_functiondef(r.oid);
  v_def:=regexp_replace(v_def,'(BEGIN)([[:space:]])',E'\\1\n IF NEW.status = ''completed'' AND NOT NEW.completion_valid THEN RETURN NEW; END IF;\n IF TG_OP = ''UPDATE'' THEN IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF; END IF;\n\\2','i');
  EXECUTE v_def;
 END LOOP;
END $patch$;
UPDATE public.workout_executions SET completion_valid=completion_valid;

CREATE OR REPLACE FUNCTION public.fn_montar_bloco_exercicios(p_descricao text,p_qtd_alvo integer,p_seed text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE v_result jsonb; v_count integer; v_expected integer:=greatest(1,least(coalesce(p_qtd_alvo,1),6));
BEGIN
 -- Only actual catalogue names within the prescription are accepted. Ambiguous
 -- and generic instructions are returned to the professional, never randomized.
 SELECT count(*),jsonb_agg(jsonb_build_object('id',e.id,'nome',e.name,
 'grupo_muscular',e.target_muscles[1],'series',1,'reps','1','rpe',4,'descanso','30s',
 'cadencia',NULL,'nota_tecnica',p_descricao) ORDER BY e.id)
 INTO v_count,v_result FROM public.exercises e
 WHERE public.fitpro_normalize_term(p_descricao)=public.fitpro_normalize_term(e.name)
 OR (length(public.fitpro_normalize_term(e.name))>=8 AND
 (' '||public.fitpro_normalize_term(p_descricao)||' ') LIKE '% '||public.fitpro_normalize_term(e.name)||' %');
 IF v_count<>v_expected THEN RETURN '[]'::jsonb; END IF;
 RETURN coalesce(v_result,'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.fn_montar_bloco_exercicios(p_descricao text,p_qtd_alvo integer DEFAULT 1)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT public.fn_montar_bloco_exercicios(p_descricao,p_qtd_alvo,'')
$$;

CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(p_descricao text,p_qtd_alvo integer,p_grupos_musculares text[],p_rpe text,p_rest text,p_cadence text,p_reps text,p_seed text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE v_result jsonb;v_count integer:=greatest(1,least(coalesce(p_qtd_alvo,1),6));
BEGIN
 SELECT jsonb_agg(jsonb_build_object('ordem',r.n,'id',r.id,'nome',r.name,
 'grupo_muscular',r.target_muscles[1],'series',v_count,'reps',coalesce(p_reps,'8-12'),
 'rpe',coalesce(nullif(regexp_replace(coalesce(p_rpe,''),'[^0-9]','','g'),'')::numeric,6),
 'descanso',coalesce(p_rest,'60')||'s','cadencia',p_cadence,'nota_tecnica',p_descricao) ORDER BY r.n)
 INTO v_result FROM (
 SELECT e.*,row_number() OVER(ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0),e.id) n
 FROM public.exercises e
 WHERE NOT e.taxonomy_review_required AND public.fitpro_matches_focus(ARRAY(SELECT jsonb_array_elements_text(e.muscle_groups)),p_grupos_musculares)
 AND (CASE WHEN p_descricao ~* '(sprint|corrida|rodagem|fartlek|pace)' THEN e.target_muscles && ARRAY['cardio'] ELSE NOT e.target_muscles && ARRAY['cardio'] END)
 ORDER BY hashtextextended(e.id::text||coalesce(p_seed,''),0),e.id LIMIT v_count
 )r;
 IF jsonb_array_length(coalesce(v_result,'[]'::jsonb))<>v_count THEN RETURN '[]'::jsonb; END IF;
 RETURN v_result;
END $$;
CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(p_descricao text,p_qtd_alvo integer,p_grupos_musculares text[],p_rpe text DEFAULT NULL,p_rest text DEFAULT NULL,p_cadence text DEFAULT NULL,p_reps text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT public.fn_montar_bloco9_exercicios(p_descricao,p_qtd_alvo,p_grupos_musculares,p_rpe,p_rest,p_cadence,p_reps,'')
$$;
CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(p_descricao text,p_qtd_alvo integer,p_grupos_musculares text[])
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT public.fn_montar_bloco9_exercicios(p_descricao,p_qtd_alvo,p_grupos_musculares,NULL,NULL,NULL,NULL,'')
$$;

-- Patch both existing prescription entry points in place, preserving their auth,
-- periodization, advisory locks and history guards. Fail if the expected anchor changed.
DO $patch$
DECLARE r record;v_def text;v_anchor text:=E'  SELECT id INTO v_daily_workout_id\n  FROM daily_workouts';
v_guard text:=$guard$
  IF EXISTS(SELECT 1 FROM jsonb_each(v_dia_treino) b WHERE jsonb_array_length(b.value)=0) THEN
    UPDATE public.daily_workouts SET prescription_issue='unmatched_prescription_requires_review'
    WHERE athlete_id=p_aluno_id AND workout_date=p_data;
    RETURN json_build_object('sucesso',false,'motivo','unmatched_prescription_requires_review',
      'sugestao_cta','Solicite revisão ao profissional: há instrução sem exercício correspondente.');
  END IF;

$guard$;
BEGIN
 FOR r IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('prescrever_treino','prescrever_treino_p_force_unused') LOOP
  v_def:=pg_get_functiondef(r.oid);
  IF strpos(v_def,v_anchor)=0 THEN RAISE EXCEPTION 'prescription_patch_anchor_missing'; END IF;
  EXECUTE replace(v_def,v_anchor,v_guard||v_anchor);
 END LOOP;
END $patch$;

CREATE OR REPLACE FUNCTION public.fn_complete_workout_execution(p_execution_id uuid,p_duration_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_completed integer;v_valid boolean;v_reason text;
BEGIN
 PERFORM 1 FROM public.workout_executions WHERE id=p_execution_id
 AND athlete_id=public.fn_current_athlete_id() AND status='in_progress' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'execution_access_denied' USING ERRCODE='42501'; END IF;
 SELECT count(*) INTO v_completed FROM public.workout_exercise_sets WHERE execution_id=p_execution_id AND completed IS TRUE;
 UPDATE public.workout_executions SET status='completed',completed_at=now(),
 duration_minutes=greatest(0,floor(extract(epoch FROM(now()-coalesce(started_at,now())))/60))
 WHERE id=p_execution_id RETURNING completion_valid,completion_validation_reason INTO v_valid,v_reason;
 RETURN jsonb_build_object('ok',true,'completed_sets',v_completed,'completion_valid',v_valid,'validation_reason',v_reason);
END $$;

-- Recalculate read models from the same validity predicate; keep old sessions.
DO $patch$
DECLARE r record;v_def text;
BEGIN
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prokind='f' AND p.proname IN
 ('fn_get_hub_snapshot','fn_get_daily_context','calcular_sync_score_real','recalc_athlete_stats','trg_activation_day7') LOOP
  v_def:=pg_get_functiondef(r.oid);
  -- These three inspected functions use unaliased workout_executions in their aggregates.
  v_def:=regexp_replace(v_def,'FROM workout_executions([[:space:]]+)WHERE','FROM workout_executions\1WHERE completion_valid AND','gi');
  v_def:=regexp_replace(v_def,'from public.workout_executions([[:space:]]+)where','from public.workout_executions\1where completion_valid and','gi');
  EXECUTE v_def;
 END LOOP;
END $patch$;
SELECT public.recalc_athlete_stats(id) FROM public.athletes;

DO $patch$
DECLARE r record;v_def text;
BEGIN
 FOR r IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('fn_award_xp','fn_submit_workout_feedback') LOOP
  v_def:=pg_get_functiondef(r.oid);
  v_def:=replace(v_def,'AND status=''completed''','AND status=''completed'' AND completion_valid');
  EXECUTE v_def;
 END LOOP;
END $patch$;
