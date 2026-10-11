-- All existing identity changes are reverted. No new real user, workout, reservation or payment.
begin;
do $test$
declare v_uid uuid; v_id uuid; v_context jsonb; v_before integer; v_after integer; v_day date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 select user_id into v_uid from public.athletes where user_id is not null limit 1;
 if v_uid is null then raise exception 'existing_identity_required'; end if;
 perform set_config('request.jwt.claim.sub',v_uid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated')::text,true);
 set local role authenticated;
 v_id:=public.fn_current_athlete_id();
 v_context:=public.fn_get_daily_context();
 if v_context->>'date'<>v_day::text or v_context->>'version'<>'2' then raise exception 'context_date_contract'; end if;
 select count(*) into v_before from public.athlete_pdi_history where athlete_id=v_id;
 perform public.fn_save_pdi('{"goal":"longevity","peak_window":"night","time_horizon":10,"injury_zones":[],"dietary_restrictions":[]}',true,'{"session_minutes":30,"training_environment":"home"}');
 select count(*) into v_after from public.athlete_pdi_history where athlete_id=v_id;
 if v_after-v_before not between 0 and 1 then raise exception 'duplicate_pdi_history'; end if;
 perform public.fn_save_pdi('{"goal":"longevity","peak_window":"night","time_horizon":10,"injury_zones":[],"dietary_restrictions":[]}',true,'{"session_minutes":30}');
 if (select count(*) from public.athlete_pdi_history where athlete_id=v_id)<>v_after then raise exception 'timestamp_only_duplicate'; end if;
 v_context:=public.fn_get_daily_context();
 if not (v_context->'profile'->>'complete')::boolean or v_context->'profile'->'declared'->>'goal'<>'longevity' or v_context->'profile'->'preferences'->>'session_minutes'<>'30' then raise exception 'declared_profile_contract'; end if;
 begin perform public.fn_save_pdi('{"consistency_30d":100}'); raise exception 'observed_field_accepted'; exception when raise_exception then if sqlerrm<>'unsupported_profile_field' then raise; end if; end;
 begin perform public.fn_save_pdi('{}',false,'{"session_minutes":-1}'); raise exception 'negative_time_accepted'; exception when raise_exception then if sqlerrm<>'invalid_session_minutes' then raise; end if; end;
 insert into public.daily_checkins(athlete_id,checkin_date,sono,energia,humor,motivacao,dor)
 values(v_id,v_day,5,5,5,5,1) on conflict(athlete_id,checkin_date) do update set sono=5,energia=5,humor=5,motivacao=5,dor=1;
 v_context:=public.fn_get_daily_context();
 if not (v_context->'calibration'->>'complete')::boolean or (v_context->'sync'->>'readiness')::numeric<>100 or (v_context->'sync'->>'value')::numeric not between 0 and 100 then raise exception 'calibration_sync_contract'; end if;
 if (public.fn_get_hub_snapshot()->'sync'->>'value') is distinct from (v_context->'sync'->>'value') then raise exception 'hub_sync_divergence'; end if;
 update public.daily_checkins set humor=null where athlete_id=v_id and checkin_date=v_day;
 v_context:=public.fn_get_daily_context();
 if (v_context->'calibration'->>'complete')::boolean or v_context->'sync'->>'value' is not null then raise exception 'partial_calibration_certified'; end if;
 update public.daily_checkins set humor=5 where athlete_id=v_id and checkin_date=v_day;
 insert into public.athlete_day_reviews(athlete_id,review_date,rating,training_choice) values(v_id,v_day,4,'rest')
 on conflict(athlete_id,review_date) do update set rating=4,training_choice='rest';
 v_context:=public.fn_get_daily_context();
 if not (v_context->'today'->>'rest_day')::boolean or v_context->'today'->>'review'<>'4' then raise exception 'day_review_contract'; end if;
 begin perform public.fn_increment_streak('00000000-0000-0000-0000-000000000002'); raise exception 'foreign_streak_accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.user_context_settings(user_id) values('00000000-0000-0000-0000-000000000002'); raise exception 'foreign_profile_accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.athlete_day_reviews(athlete_id,rating) values('00000000-0000-0000-0000-000000000002',3); raise exception 'foreign_review_accepted'; exception when insufficient_privilege then null; end;
 begin insert into public.athlete_day_reviews(athlete_id,review_date,rating) values(v_id,v_day+1,3); raise exception 'future_review_accepted'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated','is_anonymous',true)::text,true);
 begin perform public.fn_get_daily_context(); raise exception 'anonymous_context_accepted'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.user_context_settings) or exists(select 1 from public.athlete_day_reviews) then raise exception 'anonymous_context_rows_exposed'; end if;
 reset role;
end $test$;
rollback;
select 'passed: PDI provenance/history, calibration, Hub agreement, rest/review, permissions and dates' verification;
