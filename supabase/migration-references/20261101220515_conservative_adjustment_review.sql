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
  v_conservative boolean;
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
       and c.dor>=3) then
    raise exception 'Revisão profissional necessária antes de publicar ajustes' using errcode='42501';
  end if;
  -- A location alone is not a blanket block. With mild/no pain, only a
  -- reduction preserving movement, dose and rest is accepted for the athlete.
  v_conservative := not exists(select 1 from public.athletes a where a.id=p_athlete_id and a.coach_id=auth.uid())
    and exists(select 1 from public.daily_checkins c where c.athlete_id=p_athlete_id
      and c.checkin_date=(now() at time zone 'America/Sao_Paulo')::date
      and nullif(btrim(c.dor_local),'') is not null);
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
      and (e.daily_workout_id=p_daily_workout_id OR (e.daily_workout_id IS NULL AND e.phase_name IS DISTINCT FROM 'quick' AND v_workout.workout_type IS DISTINCT FROM 'quick'))
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
    if v_conservative and (
      nullif(trim(v_change->>'new_exercise_name'),'') is not null
      or coalesce((v_change->>'sets')::int,v_row.sets) > v_row.sets
      or coalesce(v_change->>'reps_range',v_row.reps_range) is distinct from v_row.reps_range
      or coalesce((v_change->>'rest_seconds')::int,v_row.rest_seconds) is distinct from v_row.rest_seconds
      or ((v_change->>'intensidade') is not null and (v_row.rpe_target is null or (v_change->>'intensidade')::int > v_row.rpe_target))
    ) then raise exception 'Restrição ativa: apenas redução de séries ou esforço, preservando exercício, dose e descanso'; end if;
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

REVOKE ALL ON FUNCTION public.fn_publicar_ajuste_treino_dia(uuid,date,uuid,timestamptz,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_publicar_ajuste_treino_dia(uuid,date,uuid,timestamptz,jsonb) TO authenticated;
