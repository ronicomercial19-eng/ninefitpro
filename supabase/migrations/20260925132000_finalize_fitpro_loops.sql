-- Finaliza contratos principais dos loops Fitpro.
-- 1) Semana aceita data alvo, retorna status de execução e valida dono do atleta.

create or replace function public.fn_get_week_workouts(
  p_athlete_id uuid,
  p_week_start date default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_periodization record;
  v_week json;
  v_week_start date := coalesce(p_week_start, date_trunc('week', current_date)::date);
  v_week_end date := coalesce(p_week_start, date_trunc('week', current_date)::date) + 6;
begin
  if not exists (
    select 1
    from public.athletes a
    left join public.athlete_auth_link aal on aal.athlete_id = a.id
    where a.id = p_athlete_id
      and (a.user_id = auth.uid() or aal.user_id = auth.uid())
  ) then
    raise exception 'not authorized for athlete %', p_athlete_id
      using errcode = '42501';
  end if;

  select ap.status, ap.periodization_model_id, ap.match_percentage
  into v_periodization
  from public.athlete_periodizations ap
  where ap.athlete_id = p_athlete_id
    and ap.status in ('active', 'in_progress')
  order by ap.assigned_at desc
  limit 1;

  select json_agg(row_to_json(d) order by d.workout_date) into v_week
  from (
    select
      dw.id,
      dw.day_number,
      dw.day_name,
      dw.workout_date,
      dw.workout_type,
      coalesce(we_status.status, 'planned') as status,
      we_status.execution_id,
      (
        select json_agg(json_build_object(
          'id', ex.id,
          'name', ex.name,
          'video_url', ex.video_url,
          'gif_url', ex.gif_url,
          'sets', we.sets,
          'reps_range', we.reps_range,
          'rest_seconds', we.rest_seconds
        ) order by we.exercise_order)
        from public.workout_exercises we
        join public.exercises ex on ex.id = we.exercise_id
        where we.daily_workout_id = dw.id
      ) as exercises
    from public.daily_workouts dw
    left join lateral (
      select wx.id as execution_id, wx.status
      from public.workout_executions wx
      where wx.athlete_id = p_athlete_id
        and wx.workout_date = dw.workout_date
      order by wx.created_at desc
      limit 1
    ) we_status on true
    where dw.athlete_id = p_athlete_id
      and dw.workout_date between v_week_start and v_week_end
  ) d;

  return json_build_object(
    'phase_status', coalesce(v_periodization.status, 'sem_periodizacao'),
    'periodization_model_id', v_periodization.periodization_model_id,
    'match_percentage', v_periodization.match_percentage,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'week', coalesce(v_week, '[]'::json)
  );
end;
$function$;

revoke execute on function public.fn_get_week_workouts(uuid, date) from public, anon;
grant execute on function public.fn_get_week_workouts(uuid, date) to authenticated;
