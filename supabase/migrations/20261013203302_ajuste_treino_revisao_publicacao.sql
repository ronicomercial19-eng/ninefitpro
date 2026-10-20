-- A published adjustment is atomic and keeps the prescription it replaced.
create table if not exists public.workout_adjustment_versions (
  id uuid primary key default gen_random_uuid(),
  daily_workout_id uuid not null references public.daily_workouts(id),
  athlete_id uuid not null references public.athletes(id),
  changed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  before_exercises jsonb not null,
  after_exercises jsonb not null
);

create index if not exists workout_adjustment_versions_workout_idx
  on public.workout_adjustment_versions (daily_workout_id, created_at desc);
alter table public.workout_adjustment_versions enable row level security;
revoke all on public.workout_adjustment_versions from anon, authenticated;
grant select on public.workout_adjustment_versions to authenticated;
create policy workout_adjustment_versions_read on public.workout_adjustment_versions
  for select to authenticated using (
    exists (select 1 from public.athletes a where a.id = workout_adjustment_versions.athlete_id
      and (a.user_id = (select auth.uid()) or a.coach_id = (select auth.uid())))
    or exists (select 1 from public.athlete_auth_link l
      where l.athlete_id = workout_adjustment_versions.athlete_id and l.user_id = (select auth.uid()))
  );

create or replace function public.fn_publicar_ajuste_treino_dia(
  p_athlete_id uuid, p_data date, p_daily_workout_id uuid,
  p_expected_updated_at timestamptz, p_changes jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_workout public.daily_workouts%rowtype;
  v_change jsonb;
  v_row public.workout_exercises%rowtype;
  v_replacement uuid;
  v_before jsonb;
  v_after jsonb;
  v_exercises jsonb;
  v_dose text;
begin
  if auth.uid() is null or not (
    exists (select 1 from public.athletes a where a.id = p_athlete_id
      and (a.user_id = auth.uid() or a.coach_id = auth.uid()))
    or exists (select 1 from public.athlete_auth_link l
      where l.athlete_id = p_athlete_id and l.user_id = auth.uid())
  ) then raise exception 'Acesso ao aluno não autorizado' using errcode = '42501'; end if;
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
    changes_json = jsonb_build_object('exercises', v_exercises),
    override_locked = true, updated_at = now()
    where id = v_workout.id;
  insert into public.workout_adjustment_versions
    (daily_workout_id, athlete_id, changed_by, before_exercises, after_exercises)
    values (v_workout.id, p_athlete_id, auth.uid(), v_before, v_after);
  return jsonb_build_object('success', true, 'daily_workout_id', v_workout.id,
    'exercises', v_exercises);
end;
$$;

revoke all on function public.fn_publicar_ajuste_treino_dia(uuid,date,uuid,timestamptz,jsonb) from public, anon;
grant execute on function public.fn_publicar_ajuste_treino_dia(uuid,date,uuid,timestamptz,jsonb) to authenticated;

-- Keep the legacy endpoint available while ronOperationalCore still invokes it.
-- AjusteTreino uses only the guarded publication function above.
