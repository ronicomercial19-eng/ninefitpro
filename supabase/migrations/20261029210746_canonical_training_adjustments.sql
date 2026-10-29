CREATE OR REPLACE FUNCTION public.fn_get_saved_prescription(p_aluno_id uuid,p_data date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE a uuid:=coalesce(p_aluno_id,public.fn_current_athlete_id()); w public.daily_workouts%rowtype;
 blocks jsonb; snapshot jsonb; row_count int; athlete_name text;
BEGIN
 PERFORM private.fitpro_require_current_access();
 PERFORM fitpro_internal.assert_athlete_access(a);
 IF a IS NULL OR p_data IS NULL THEN RAISE EXCEPTION 'athlete_and_date_required';END IF;
 SELECT count(*) INTO row_count FROM public.daily_workouts d WHERE d.athlete_id=a AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick';
 IF row_count=0 THEN RETURN jsonb_build_object('sucesso',false,'motivo','saved_prescription_not_found');END IF;
 IF row_count>1 THEN RETURN jsonb_build_object('sucesso',false,'motivo','multiple_prescriptions_requires_review');END IF;
 SELECT * INTO w FROM public.daily_workouts d WHERE d.athlete_id=a AND d.workout_date=p_data AND d.workout_type IS DISTINCT FROM 'quick';
 IF w.prescription_issue IS NOT NULL THEN
  RETURN jsonb_build_object('sucesso',false,'motivo',w.prescription_issue,'daily_workout_id',w.id);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.workout_exercises e WHERE e.daily_workout_id=w.id) THEN
  RETURN jsonb_build_object('sucesso',false,'motivo','empty_prescription_requires_review','daily_workout_id',w.id);
 END IF;
 SELECT jsonb_object_agg(b.key,coalesce((
  SELECT jsonb_agg(jsonb_build_object(
   'id',e.exercise_id,'workout_exercise_id',e.id,'nome',coalesce(c.name,e.exercise_name),
   'series',e.sets,'reps',e.reps_range,'rpe',e.rpe_target,
   'descanso',e.rest_seconds::text||'s','cadencia',e.tempo,
   'nota_tecnica',coalesce(e.observations->>'notes',e.notes),
   'video_url',c.video_url,'grupo_muscular',c.target_muscles[1])
   ORDER BY e.exercise_order,e.id)
  FROM public.workout_exercises e LEFT JOIN public.exercises c ON c.id=e.exercise_id
  WHERE e.daily_workout_id=w.id AND
   CASE WHEN e.observations->>'bloco' IN('neural','integracao','bloco9','reset')
    THEN e.observations->>'bloco' ELSE 'bloco9' END=b.key
 ),'[]'::jsonb)) INTO blocks FROM (VALUES('neural'),('integracao'),('bloco9'),('reset'))b(key);
 SELECT name INTO athlete_name FROM public.athletes WHERE id=a;
 snapshot:=coalesce(w.prescription_snapshot,'{}'::jsonb);
 RETURN snapshot||jsonb_build_object('sucesso',true,'preserved',true,'data',p_data,'daily_workout_id',w.id,'updated_at',w.updated_at,
  'contexto',coalesce(snapshot->'contexto',jsonb_build_object('aluno_id',a,'aluno_nome',athlete_name,
   'semana_atual',NULL,'fase','contexto histórico não registrado','protocolo',w.day_name)),
  'treino',blocks);
END $$;

CREATE OR REPLACE FUNCTION public.fn_publicar_ajuste_treino_dia(p_athlete_id uuid, p_data date, p_daily_workout_id uuid, p_expected_updated_at timestamp with time zone, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workout public.daily_workouts%rowtype;
  v_change jsonb;
  v_row public.workout_exercises%rowtype;
  v_replacement uuid;
  v_before jsonb;
  v_after jsonb;
  v_exercises jsonb;
  v_dose text;
  v_saved_at timestamptz;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not (
    exists (select 1 from public.athletes a where a.id = p_athlete_id
      and (a.user_id = auth.uid() or a.coach_id = auth.uid()))
    or exists (select 1 from public.athlete_auth_link l
      where l.athlete_id = p_athlete_id and l.user_id = auth.uid())
  ) then raise exception 'Acesso ao aluno não autorizado' using errcode = '42501'; end if;
  if p_data is null or p_data < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Ajuste apenas a sessão de hoje ou uma sessão futura';
  end if;
  if not exists(select 1 from public.athletes a where a.id=p_athlete_id and a.coach_id=auth.uid())
     and exists(select 1 from public.daily_checkins c where c.athlete_id=p_athlete_id
       and c.checkin_date=(now() at time zone 'America/Sao_Paulo')::date
       and (c.dor>=3 or nullif(btrim(c.dor_local),'') is not null)) then
    raise exception 'Revisão profissional necessária antes de publicar ajustes' using errcode='42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array'
     or jsonb_array_length(p_changes) not between 1 and 100 then
    raise exception 'Lista de alterações inválida';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_data::text, 0));
  select * into v_workout from public.daily_workouts
    where id = p_daily_workout_id and athlete_id = p_athlete_id and workout_date = p_data
    for update;
  if not found then raise exception 'Treino não encontrado para este aluno e data'; end if;
  if v_workout.updated_at is distinct from p_expected_updated_at then
    raise exception 'A prescrição mudou desde a abertura da tela. Recarregue antes de publicar.';
  end if;
  if exists (select 1 from public.workout_executions e
    where e.athlete_id = p_athlete_id and e.workout_date = p_data
      and e.status in ('started','in_progress','paused','completed','skipped')) then
    raise exception 'Este treino já foi iniciado. Preserve a execução e ajuste uma sessão futura.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(we) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_before from public.workout_exercises we where we.daily_workout_id = v_workout.id;

  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) <> 'object' or nullif(v_change->>'workout_exercise_id','') is null then
      raise exception 'Identificador de exercício ausente';
    end if;
    select * into v_row from public.workout_exercises
      where id = (v_change->>'workout_exercise_id')::uuid and daily_workout_id = v_workout.id for update;
    if not found then raise exception 'Exercício não pertence ao treino'; end if;
    if v_change ? 'sets' and ((v_change->>'sets')::int not between 1 and 10) then
      raise exception 'Séries inválidas'; end if;
    if v_change ? 'rest_seconds' and ((v_change->>'rest_seconds')::int not between 0 and 600) then
      raise exception 'Descanso inválido'; end if;
    if v_change ? 'intensidade' and ((v_change->>'intensidade')::int not between 1 and 10) then
      raise exception 'Intensidade inválida'; end if;
    v_dose := trim(coalesce(v_change->>'reps_range', v_row.reps_range));
    if length(v_dose) not between 1 and 40 or
       (v_dose ~ '^[0-9]+$' and v_dose::numeric >= 100) then
      raise exception 'Dose ambígua. Informe a unidade, por exemplo 400 m ou 40 s.';
    end if;
    v_replacement := null;
    if nullif(trim(v_change->>'new_exercise_name'),'') is not null then
      select e.id into v_replacement from public.exercises e
        where lower(e.name) = lower(trim(v_change->>'new_exercise_name')) order by e.id limit 1;
      if v_replacement is null then raise exception 'Exercício substituto não encontrado na biblioteca'; end if;
    end if;
    update public.workout_exercises set
      exercise_id = coalesce(v_replacement, exercise_id),
      sets = coalesce((v_change->>'sets')::int, sets),
      reps_range = v_dose,
      rest_seconds = coalesce((v_change->>'rest_seconds')::int, rest_seconds),
      rpe_target = coalesce((v_change->>'intensidade')::int, rpe_target),
      override_locked = true
    where id = v_row.id;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(we) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_after from public.workout_exercises we where we.daily_workout_id = v_workout.id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', we.id, 'exercise_id', we.exercise_id, 'exercise_name', e.name,
      'sets', we.sets, 'reps_range', we.reps_range,
      'rest_seconds', we.rest_seconds, 'intensidade', we.rpe_target,
      'video_url', e.video_url, 'exercise_order', we.exercise_order
    ) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_exercises from public.workout_exercises we
    left join public.exercises e on e.id = we.exercise_id
    where we.daily_workout_id = v_workout.id;

  update public.daily_workouts set
    changes_json = coalesce(changes_json,'{}'::jsonb) || jsonb_build_object('exercises', v_exercises),
    override_locked = true, updated_at = clock_timestamp()
    where id = v_workout.id returning updated_at into v_saved_at;
  insert into public.workout_adjustment_versions
    (daily_workout_id, athlete_id, changed_by, before_exercises, after_exercises)
    values (v_workout.id, p_athlete_id, auth.uid(), v_before, v_after);
  return jsonb_build_object('success', true, 'daily_workout_id', v_workout.id,
    'exercises', v_exercises, 'updated_at', v_saved_at);
end;
$function$;


CREATE OR REPLACE FUNCTION public.aplicar_ajuste_treino_dia(p_athlete_id uuid,p_data date,p_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w public.daily_workouts%rowtype; e public.workout_exercises%rowtype; d jsonb; one jsonb;
 changes jsonb:='[]'::jsonb; result jsonb; replacement_name text; rest_value int; expected timestamptz;
BEGIN
 PERFORM private.fitpro_require_current_access();
 PERFORM fitpro_internal.assert_athlete_access(p_athlete_id);
 IF jsonb_typeof(p_changes) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'invalid_adjustment';END IF;
 IF (SELECT count(*) FROM public.daily_workouts x WHERE x.athlete_id=p_athlete_id AND x.workout_date=p_data AND x.workout_type IS DISTINCT FROM 'quick')<>1 THEN
  RAISE EXCEPTION 'Selecione uma única prescrição periodizada para ajustar.';
 END IF;
 SELECT * INTO w FROM public.daily_workouts x WHERE x.athlete_id=p_athlete_id AND x.workout_date=p_data AND x.workout_type IS DISTINCT FROM 'quick' FOR UPDATE;
 expected:=coalesce(nullif(p_changes->>'_expected_updated_at','')::timestamptz,w.updated_at);
 IF nullif(p_changes->>'intensidade_override','') IS NOT NULL AND p_changes->>'intensidade_override' NOT IN('leve','moderada','alta') THEN RAISE EXCEPTION 'invalid_intensity_guidance';END IF;
 FOR e IN SELECT * FROM public.workout_exercises WHERE daily_workout_id=w.id ORDER BY exercise_order,id LOOP
  d:=coalesce(p_changes#>ARRAY['exercicios',e.id::text],p_changes#>ARRAY['exercicios',e.exercise_id::text]);
  IF d IS NULL THEN CONTINUE;END IF;
  one:=jsonb_build_object('workout_exercise_id',e.id);
  IF d ? 'series' THEN one:=one||jsonb_build_object('sets',d->'series');END IF;
  IF d ? 'reps' THEN one:=one||jsonb_build_object('reps_range',d->>'reps');END IF;
  IF d ? 'rpe' THEN one:=one||jsonb_build_object('intensidade',d->'rpe');END IF;
  IF d ? 'descanso' THEN
   rest_value:=CASE WHEN d->>'descanso' ~ '^\d{1,3}$' THEN (d->>'descanso')::int ELSE private.readiness_duration_seconds(d->>'descanso') END;
   IF rest_value IS NULL THEN RAISE EXCEPTION 'Informe descanso em segundos ou minutos.';END IF;
   one:=one||jsonb_build_object('rest_seconds',rest_value);
  END IF;
  IF nullif(d->>'id','') IS NOT NULL AND d->>'id'<>e.exercise_id::text THEN
   SELECT name INTO replacement_name FROM public.exercises WHERE id=(d->>'id')::uuid;
   IF replacement_name IS NULL THEN RAISE EXCEPTION 'Exercício substituto não encontrado.';END IF;
   one:=one||jsonb_build_object('new_exercise_name',replacement_name);
  END IF;
  changes:=changes||jsonb_build_array(one);
 END LOOP;
 IF jsonb_array_length(changes)=0 AND nullif(p_changes->>'intensidade_override','') IS NOT NULL THEN
  SELECT * INTO e FROM public.workout_exercises WHERE daily_workout_id=w.id ORDER BY exercise_order,id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'A sessão não possui exercícios.';END IF;
  changes:=jsonb_build_array(jsonb_build_object('workout_exercise_id',e.id,'sets',e.sets));
 END IF;
 IF jsonb_array_length(changes)=0 THEN RAISE EXCEPTION 'Nenhuma alteração válida foi informada.';END IF;
 result:=public.fn_publicar_ajuste_treino_dia(p_athlete_id,p_data,w.id,expected,changes);
 -- The intensity label is guidance only: it never invents an RPE or dose multiplier.
 IF nullif(p_changes->>'intensidade_override','') IS NOT NULL THEN
  UPDATE public.daily_workouts SET changes_json=coalesce(changes_json,'{}')||jsonb_build_object('intensidade_override',p_changes->>'intensidade_override') WHERE id=w.id;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.aplicar_ajuste_treino_dia(uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.aplicar_ajuste_treino_dia(uuid,date,jsonb) TO authenticated;
DO $patch$
DECLARE d text;
BEGIN
 SELECT pg_get_functiondef('public.prescrever_treino(uuid,date)'::regprocedure) INTO d;
 d:=replace(d,'AND w.status = ''current''','AND w.status = ''current'' AND fsp.status = ''active''');
 d:=replace(d,'''Treino Rápido — ''','''Treino — ''');
 EXECUTE d;
END $patch$;

