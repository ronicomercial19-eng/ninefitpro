-- Phase 2: restrict anonymous execution of canonical workout RPCs.
revoke execute on function public.fn_start_daily_workout_execution(uuid) from anon;
revoke execute on function public.fn_start_workout_execution(uuid) from anon;
revoke execute on function public.fn_save_workout_set(uuid, text, integer, integer, boolean, integer, numeric, text, integer, text) from anon;
revoke execute on function public.fn_complete_workout_execution(uuid, integer) from anon;
revoke execute on function public.fn_get_week_workouts(uuid) from anon;
revoke execute on function public.fn_get_ron_progresso_screen(uuid) from anon;
revoke execute on function public.fn_award_xp(uuid, integer, text, jsonb) from anon;

create or replace function public.fn_award_xp(
  p_athlete_id uuid,
  p_amount integer,
  p_source text default 'unknown',
  p_metadata jsonb default '{}'::jsonb
)
returns table(new_total_xp integer, new_level integer, leveled_up boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_prev_xp int;
  v_prev_level int;
  v_new_xp int;
  v_new_level int;
begin
  if p_athlete_id is null or p_amount is null or p_amount = 0 then
    return;
  end if;

  if not exists (
    select 1
    from public.athletes a
    where a.id = p_athlete_id
      and (
        a.user_id = (select auth.uid())
        or a.coach_id = (select auth.uid())
        or public.is_admin((select auth.uid()))
        or public.is_trainer((select auth.uid()))
      )
  ) then
    raise exception 'athlete_access_denied' using errcode = '42501';
  end if;

  select coalesce(total_xp,0), coalesce(level,1)
    into v_prev_xp, v_prev_level
  from public.athletes where id = p_athlete_id for update;

  if not found then
    raise exception 'athlete % not found', p_athlete_id;
  end if;

  v_new_xp := greatest(0, v_prev_xp + p_amount);
  v_new_level := greatest(1, floor(v_new_xp::numeric / 1000)::int + 1);

  update public.athletes
     set total_xp = v_new_xp, level = v_new_level, updated_at = now()
   where id = p_athlete_id;

  perform public.log_event(
    'created'::event_type, 'athlete_xp', p_athlete_id, null,
    jsonb_build_object('amount', p_amount, 'source', p_source, 'meta', p_metadata,
                       'new_total_xp', v_new_xp, 'new_level', v_new_level, 'event_key', 'xp_awarded')
  );

  return query select v_new_xp, v_new_level, (v_new_level > v_prev_level);
end;
$function$;