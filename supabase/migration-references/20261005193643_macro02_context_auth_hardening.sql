-- New context endpoints require a signed-in account, even when anonymous sign-ins are enabled project-wide.
drop policy context_settings_own on public.user_context_settings;
create policy context_settings_own on public.user_context_settings for all to authenticated
using (user_id=(select auth.uid()) and not coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false))
with check (user_id=(select auth.uid()) and not coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false));
drop policy day_reviews_own on public.athlete_day_reviews;
create policy day_reviews_own on public.athlete_day_reviews for all to authenticated
using (athlete_id=(select public.fn_current_athlete_id()) and not coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false))
with check (athlete_id=(select public.fn_current_athlete_id()) and review_date=(now() at time zone 'America/Sao_Paulo')::date and not coalesce((select (auth.jwt()->>'is_anonymous')::boolean),false));

create or replace function public.fn_save_pdi(p_patch jsonb, p_complete boolean default false, p_preferences jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_existing jsonb; v_row public.user_parameters; v_keys text[]; v_pref jsonb;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or public.fn_current_athlete_id() is null then raise exception 'athlete_profile_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pdi:'||v_uid::text,0));
  if octet_length(p_patch::text)>8192 or octet_length(p_preferences::text)>4096 then raise exception 'profile_payload_too_large'; end if;
  if jsonb_typeof(p_patch)<>'object' or jsonb_typeof(p_preferences)<>'object' then raise exception 'invalid_profile'; end if;
  if exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('goal','recovery_rate','volume_tolerance','peak_window','stress_sensitivity','discomfort_tolerance','time_horizon','injury_zones','dietary_restrictions','base_location_sp')) then raise exception 'unsupported_profile_field'; end if;
  if exists (select 1 from jsonb_object_keys(p_preferences) k where k not in ('session_minutes','training_environment','assistance','reduced_motion')) then raise exception 'unsupported_preference'; end if;
  if p_preferences ? 'session_minutes' and ((p_preferences->>'session_minutes')::integer not between 10 and 120) then raise exception 'invalid_session_minutes'; end if;
  if p_preferences ? 'training_environment' and p_preferences->>'training_environment' not in ('home','gym','outdoors') then raise exception 'invalid_environment'; end if;
  if p_preferences ? 'assistance' and p_preferences->>'assistance' not in ('guided','autonomous','technical') then raise exception 'invalid_assistance'; end if;
  if p_preferences ? 'reduced_motion' and jsonb_typeof(p_preferences->'reduced_motion')<>'boolean' then raise exception 'invalid_motion_preference'; end if;
  if exists (select 1 from jsonb_each(p_patch || p_preferences) e where e.value='null'::jsonb) then raise exception 'null_profile_field'; end if;
  select to_jsonb(u) into v_existing from public.user_parameters u where user_id=v_uid;
  v_existing:=coalesce(v_existing,'{}') || p_patch || jsonb_build_object('user_id',v_uid);
  select * into v_row from jsonb_populate_record(null::public.user_parameters,v_existing);
  if p_patch ? 'time_horizon' and v_row.time_horizon not between 1 and 52 then raise exception 'invalid_time_horizon'; end if;
  if p_complete and not (p_patch ?& array['goal','peak_window','time_horizon','injury_zones','dietary_restrictions']) then raise exception 'complete_declared_profile_required'; end if;
  if p_patch<>'{}'::jsonb then
    insert into public.user_parameters(user_id,goal,recovery_rate,volume_tolerance,peak_window,stress_sensitivity,discomfort_tolerance,time_horizon,injury_zones,dietary_restrictions,base_location_sp)
    values(v_uid,coalesce(v_row.goal,'performance'),coalesce(v_row.recovery_rate,'medium'),coalesce(v_row.volume_tolerance,5),coalesce(v_row.peak_window,'morning'),coalesce(v_row.stress_sensitivity,5),coalesce(v_row.discomfort_tolerance,'moderate'),coalesce(v_row.time_horizon,12),coalesce(v_row.injury_zones,'{}'),coalesce(v_row.dietary_restrictions,'{}'),v_row.base_location_sp)
    on conflict(user_id) do update set goal=excluded.goal,recovery_rate=excluded.recovery_rate,volume_tolerance=excluded.volume_tolerance,peak_window=excluded.peak_window,stress_sensitivity=excluded.stress_sensitivity,discomfort_tolerance=excluded.discomfort_tolerance,time_horizon=excluded.time_horizon,injury_zones=excluded.injury_zones,dietary_restrictions=excluded.dietary_restrictions,base_location_sp=excluded.base_location_sp;
  end if;
  select coalesce(declared_keys,'{}'),coalesce(preferences,'{}') into v_keys,v_pref from public.user_context_settings where user_id=v_uid for update;
  select array_agg(distinct k) into v_keys from (select unnest(coalesce(v_keys,'{}')) k union select jsonb_object_keys(p_patch)) t;
  insert into public.user_context_settings(user_id,pdi_completed_at,declared_keys,preferences)
  values(v_uid,case when p_complete then now() end,coalesce(v_keys,'{}'),coalesce(v_pref,'{}')||p_preferences)
  on conflict(user_id) do update set pdi_completed_at=coalesce(user_context_settings.pdi_completed_at,excluded.pdi_completed_at),declared_keys=excluded.declared_keys,preferences=excluded.preferences,updated_at=now();
  return jsonb_build_object('saved',true,'source','declared');
end $$;

create or replace function public.fn_get_daily_context() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_id uuid:=public.fn_current_athlete_id(); v_today date:=(now() at time zone 'America/Sao_Paulo')::date;
  v_c public.daily_checkins; v_settings public.user_context_settings; v_params jsonb; v_declared jsonb:='{}';
  v_meals integer; v_water integer; v_done boolean; v_started boolean; v_scheduled boolean; v_rest boolean;
  v_review integer; v_readiness numeric; v_activity numeric; v_score numeric; v_dims jsonb; v_days integer; v_streak integer;
  v_constraints boolean; v_hours jsonb; v_observed jsonb; v_hist integer;
begin
  if v_uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'authentication_required' using errcode='42501'; end if;
  if v_id is null then return jsonb_build_object('status','no_athlete_profile','date',v_today); end if;
  select * into v_c from public.daily_checkins where athlete_id=v_id and checkin_date=v_today;
  select * into v_settings from public.user_context_settings where user_id=v_uid;
  select to_jsonb(p) into v_params from public.user_parameters p where user_id=v_uid;
  select coalesce(jsonb_object_agg(key,value),'{}') into v_declared from jsonb_each(coalesce(v_params,'{}')) where key=any(coalesce(v_settings.declared_keys,'{}'));
  select count(*) into v_meals from public.nutrition_logs where athlete_id=v_id and date=v_today;
  select coalesce(sum(amount_ml),0) into v_water from public.hydration_logs where athlete_id=v_id and log_date=v_today;
  select exists(select 1 from public.workout_executions where athlete_id=v_id and workout_date=v_today and status='completed'),
    exists(select 1 from public.workout_executions where athlete_id=v_id and workout_date=v_today and status in ('in_progress','paused','started')) into v_done,v_started;
  select exists(select 1 from public.daily_workouts where athlete_id=v_id and workout_date=v_today and coalesce(workout_type,'') not in ('rest','recovery','descanso')),
    exists(select 1 from public.daily_workouts where athlete_id=v_id and workout_date=v_today and workout_type in ('rest','recovery','descanso')) into v_scheduled,v_rest;
  select rating into v_review from public.athlete_day_reviews where athlete_id=v_id and review_date=v_today;
  v_rest:=v_rest or exists(select 1 from public.athlete_day_reviews where athlete_id=v_id and review_date=v_today and training_choice='rest');
  select exists(select 1 from public.athletes a where a.id=v_id and (lower(coalesce(to_jsonb(a)->>'restricoes','')) not in ('','[]','{}','nenhuma','nenhum','não','nao','sem restrições') or lower(coalesce(a.injuries_limitations,'')) not in ('','nenhuma','nenhum','não','nao','sem lesões','sem restrições')))
    or coalesce(jsonb_array_length(coalesce(v_declared->'injury_zones','[]')),0)>0 into v_constraints;
  if v_c.sono is not null and v_c.energia is not null and v_c.humor is not null and v_c.motivacao is not null and v_c.dor is not null then
    v_readiness:=round(((v_c.sono+v_c.energia+v_c.humor+v_c.motivacao+(6-v_c.dor))-5)*100.0/20);
  end if;
  -- Coverage measures days with records, not dietary adequacy, clinical readiness, or quotas.
  with days as (select generate_series(v_today-6,v_today,interval '1 day')::date d)
  select jsonb_build_object(
    'treino',round(count(*) filter(where exists(select 1 from public.workout_executions w where w.athlete_id=v_id and w.workout_date=d and w.status='completed') or exists(select 1 from public.athlete_day_reviews r where r.athlete_id=v_id and r.review_date=d and r.training_choice='rest') or exists(select 1 from public.daily_workouts w where w.athlete_id=v_id and w.workout_date=d and w.workout_type in ('rest','recovery','descanso')))*100.0/7),
    'nutri',round(count(*) filter(where exists(select 1 from public.nutrition_logs n where n.athlete_id=v_id and n.date=d))*100.0/7),
    'sono',round(count(*) filter(where exists(select 1 from public.daily_checkins c where c.athlete_id=v_id and c.checkin_date=d and c.sono is not null) or exists(select 1 from public.bio_sleep_logs s where s.user_id=v_uid and s.sleep_date=d))*100.0/7),
    'hidr',round(count(*) filter(where exists(select 1 from public.hydration_logs h where h.athlete_id=v_id and h.log_date=d))*100.0/7),
    'mob',round(count(*) filter(where exists(select 1 from public.master_registry m where m.user_id=v_uid and m.event_type='mobility_log' and (m.created_at at time zone 'America/Sao_Paulo')::date=d))*100.0/7),
    'calibracao',round(count(*) filter(where exists(select 1 from public.daily_checkins c where c.athlete_id=v_id and c.checkin_date=d and c.sono is not null and c.energia is not null and c.humor is not null and c.motivacao is not null and c.dor is not null))*100.0/7),
    'balanco',round(count(*) filter(where exists(select 1 from public.athlete_day_reviews r where r.athlete_id=v_id and r.review_date=d and r.rating is not null))*100.0/7)
  ) into v_dims from days;
  select round(avg(value::numeric)) into v_activity from jsonb_each_text(v_dims);
  if v_readiness is not null then v_score:=round(v_readiness*0.6+v_activity*0.4); end if;
  with active as (
    select checkin_date d from public.daily_checkins where athlete_id=v_id and checkin_date between v_today-30 and v_today and sono is not null and energia is not null and humor is not null and motivacao is not null and dor is not null
    union select workout_date from public.workout_executions where athlete_id=v_id and status='completed' and workout_date between v_today-30 and v_today
  ), numbered as (select d,row_number() over(order by d desc)::integer n from active)
  select count(*) filter(where d>=v_today-29),count(*) filter(where d=coalesce((select max(d) from active where d>=v_today-1),v_today)-n+1) into v_days,v_streak from numbered;
  select count(*) into v_hist from public.workout_executions where athlete_id=v_id and status='completed' and workout_date between v_today-29 and v_today;
  select coalesce(jsonb_agg(t),'[]') into v_hours from (
    select case when extract(hour from started_at at time zone 'America/Sao_Paulo')<12 then 'morning' when extract(hour from started_at at time zone 'America/Sao_Paulo')<18 then 'afternoon' else 'night' end training_window,count(*) samples
    from public.workout_executions where athlete_id=v_id and status='completed' and started_at is not null and workout_date between v_today-29 and v_today group by 1 order by 2 desc limit 3
  ) t;
  v_observed:=jsonb_build_object('active_days_30d',v_days,'completed_workouts_30d',v_hist,'training_windows',v_hours,
    'nutrition_days_30d',(select count(distinct date) from public.nutrition_logs where athlete_id=v_id and date between v_today-29 and v_today),
    'hydration_days_30d',(select count(distinct log_date) from public.hydration_logs where athlete_id=v_id and log_date between v_today-29 and v_today),
    'review_days_30d',(select count(*) from public.athlete_day_reviews where athlete_id=v_id and review_date between v_today-29 and v_today and rating is not null),
    'source','durable_records','window_days',30);
  return jsonb_build_object('version',2,'status','available','date',v_today,'generated_at',now(),
    'profile',jsonb_build_object('complete',v_settings.pdi_completed_at is not null,'completed_at',v_settings.pdi_completed_at,'declared',v_declared,'preferences',coalesce(v_settings.preferences,'{}'),'observed',v_observed,'inferred',jsonb_build_object('training_window',case when coalesce((v_hours->0->>'samples')::integer,0)>=5 then v_hours->0->>'training_window' end,'source','workout_started_at','requires_confirmation',true)),
    'calibration',jsonb_build_object('complete',v_readiness is not null,'sleep',v_c.sono,'energy',v_c.energia,'mood',v_c.humor,'motivation',v_c.motivacao,'pain',v_c.dor,'pain_location',v_c.dor_local,'observed_at',v_c.created_at),
    'safety',jsonb_build_object('review_required',coalesce(v_c.dor>=3,false) or nullif(btrim(v_c.dor_local),'') is not null or v_constraints,'reason',case when v_c.dor>=3 or nullif(btrim(v_c.dor_local),'') is not null then 'pain_reported' when v_constraints then 'declared_restrictions' end,'is_medical_clearance',false),
    'today',jsonb_build_object('workout_completed',v_done,'workout_in_progress',v_started,'workout_scheduled',v_scheduled,'rest_day',v_rest,'meals',v_meals,'water_ml',v_water,'review',v_review),
    'sync',jsonb_build_object('value',v_score,'readiness',v_readiness,'record_coverage',v_activity,'coverage_dimensions',v_dims,'formula','60% percepção diária + 40% cobertura de registros em 7 dias','source','daily_checkins/durable_records','is_medical_clearance',false),
    'streak',v_streak);
end $$;

create or replace function public.fn_increment_streak(p_athlete_id uuid)
returns table(new_days_active integer,last_active timestamptz) language plpgsql stable security invoker set search_path='' as $$
declare v_context jsonb;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or p_athlete_id is distinct from public.fn_current_athlete_id() then raise exception 'athlete_access_denied' using errcode='42501'; end if;
  v_context:=public.fn_get_daily_context();
  return query select (v_context->>'streak')::integer,(select max(t) from (
    select created_at t from public.daily_checkins where athlete_id=p_athlete_id and sono is not null and energia is not null and humor is not null and motivacao is not null and dor is not null
    union all select completed_at from public.workout_executions where athlete_id=p_athlete_id and status='completed'
  ) x);
end $$;
