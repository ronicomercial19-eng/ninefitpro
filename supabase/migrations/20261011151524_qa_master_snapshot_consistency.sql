-- One authenticated read-model. No simulated telemetry or cached athlete score.
-- Weekly summaries use Monday through today in the same business timezone as Train.
create or replace function public.fn_get_hub_snapshot()
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_athlete jsonb;
  v_day jsonb;
  v_date date := (now() at time zone 'America/Sao_Paulo')::date;
  v_monday date := date_trunc('week', now() at time zone 'America/Sao_Paulo')::date;
  v_dimensions jsonb := '{}';
  v_key text;
  v_value numeric;
  v_workouts integer; v_meals integer; v_minutes numeric;
  v_water numeric; v_water_at timestamptz;
  v_calories numeric; v_calories_at timestamptz;
  v_hrv numeric; v_hrv_at timestamptz; v_hrv_source text;
  v_bpm numeric; v_bpm_at timestamptz; v_bpm_source text;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  v_id := public.fn_current_athlete_id();
  if v_id is null then
    return jsonb_build_object('version', 3, 'status', 'no_athlete_profile', 'generated_at', now(),
      'sync', jsonb_build_object('value', null, 'status', 'not_collected'), 'dimensions', '{}', 'weekly', '{}', 'vitals', '{}');
  end if;
  select jsonb_build_object('id', id, 'name', name, 'level', level, 'total_xp', total_xp) into v_athlete
    from public.athletes where id = v_id;
  if v_athlete is null then raise exception 'athlete_profile_unavailable' using errcode = '42501'; end if;
  v_day := public.fn_get_daily_context();
  foreach v_key in array array['treino', 'nutri', 'sono', 'mob', 'hidr'] loop
    v_value := (v_day->'sync'->'coverage_dimensions'->>v_key)::numeric;
    v_dimensions := v_dimensions || jsonb_build_object(v_key, jsonb_build_object(
      'value', case when v_value > 0 then v_value else null end,
      'status', case when v_value > 0 then 'available' else 'not_collected' end,
      'source', 'daily_context/record_coverage_7d', 'observed_at', v_day->'generated_at'));
  end loop;
  select count(*), coalesce(sum(duration_minutes), 0) into v_workouts, v_minutes
    from public.workout_executions where athlete_id = v_id and status = 'completed' and workout_date between v_monday and v_date;
  select count(*) into v_meals from public.nutrition_logs where athlete_id = v_id and date between v_monday and v_date;
  select sum(amount_ml), max(created_at) into v_water, v_water_at
    from public.hydration_logs where athlete_id = v_id and log_date = v_date;
  select sum(calories), max(created_at) filter (where calories is not null) into v_calories, v_calories_at
    from public.nutrition_logs where athlete_id = v_id and date = v_date;
  select hrv_ms, recorded_at, source into v_hrv, v_hrv_at, v_hrv_source
    from public.bio_hrv_logs where user_id = v_uid and recorded_at <= now() order by recorded_at desc limit 1;
  select bpm, recorded_at, source into v_bpm, v_bpm_at, v_bpm_source
    from public.bio_heart_rate_logs where user_id = v_uid and recorded_at <= now() order by recorded_at desc limit 1;
  return jsonb_build_object(
    'version', 3, 'status', case when v_day->'sync'->>'value' is null then 'calibrating' else 'available' end,
    'generated_at', now(), 'athlete', v_athlete, 'context', v_day,
    'sync', jsonb_build_object('value', v_day->'sync'->'value',
      'status', case when v_day->'sync'->>'value' is null then 'not_collected' else 'available' end,
      'source', 'daily_context_v2', 'observed_at', v_day->'calibration'->'observed_at'),
    'dimensions', v_dimensions,
    'weekly', jsonb_build_object('treinos', v_workouts, 'nutri', v_meals, 'minutos', v_minutes,
      'period_start', v_monday, 'period_end', v_date, 'source', 'confirmed_native_records'),
    'vitals', jsonb_build_object(
      'water', jsonb_build_object('value', v_water, 'status', case when v_water is null then 'not_collected' else 'available' end, 'source', 'hydration_logs', 'observed_at', v_water_at),
      'calories', jsonb_build_object('value', v_calories, 'status', case when v_calories is null then 'not_collected' else 'available' end, 'source', 'nutrition_logs/consumed_calories', 'observed_at', v_calories_at),
      'hrv', jsonb_build_object('value', v_hrv, 'status', case when v_hrv_at is null then 'not_collected' when v_hrv_at < now() - interval '36 hours' then 'stale' else 'available' end, 'source', coalesce(v_hrv_source, 'bio_hrv_logs'), 'observed_at', v_hrv_at),
      'heart_rate', jsonb_build_object('value', v_bpm, 'status', case when v_bpm_at is null then 'not_collected' when v_bpm_at < now() - interval '36 hours' then 'stale' else 'available' end, 'source', coalesce(v_bpm_source, 'bio_heart_rate_logs'), 'observed_at', v_bpm_at)
    )
  );
end $$;
revoke all on function public.fn_get_hub_snapshot() from public, anon;
grant execute on function public.fn_get_hub_snapshot() to authenticated;
comment on function public.fn_get_hub_snapshot() is 'Canonical athlete, daily SYNC, consumed calories, current vitals and Monday-to-today activity. Invoker privileges preserve RLS.';
