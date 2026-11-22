create function public.fn_core_os_first_workout_done()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from 'completed' or new.completion_valid is not true then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'completed' and old.completion_valid is true then
      return new;
    end if;
  end if;

  if not exists (
    select 1 from public.workout_executions w
    where w.athlete_id = new.athlete_id and w.id <> new.id
      and w.status = 'completed' and w.completion_valid is true
  ) then
    perform public.fn_core_enqueue(
      'fitpro.first_workout_done', new.athlete_id,
      jsonb_build_object('workout_id', new.id),
      'first-workout:' || new.athlete_id
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.fn_core_os_first_workout_done() from public, anon, authenticated;

create trigger trg_core_os_first_workout_done
after insert or update of status, completion_valid on public.workout_executions
for each row execute function public.fn_core_os_first_workout_done();

create or replace function public.fn_core_os_check_inactive_athletes()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  athlete record;
begin
  for athlete in
    select a.id, greatest(a.created_at, u.last_sign_in_at, sessions.last_access, workouts.last_workout) as last_activity
    from public.athletes a
    join auth.users u on u.id = a.user_id
    left join lateral (
      select max(greatest(s.created_at, s.refreshed_at at time zone 'UTC')) as last_access
      from auth.sessions s where s.user_id = a.user_id
    ) sessions on true
    left join lateral (
      select max(greatest(w.created_at, w.completed_at)) as last_workout
      from public.workout_executions w
      where w.athlete_id = a.id and w.status = 'completed' and w.completion_valid is true
    ) workouts on true
    where a.activated
  loop
    if athlete.last_activity <= now() - interval '7 days' then
      perform public.fn_core_enqueue(
        'student.inactive', athlete.id,
        jsonb_build_object('inactive_days', 7, 'last_activity_at', athlete.last_activity),
        'inactive:' || athlete.id || ':' || extract(epoch from athlete.last_activity)
      );
    end if;
  end loop;
end;
$$;

revoke execute on function public.fn_core_os_check_inactive_athletes() from public, anon, authenticated;

;
