DO $patch$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_get_daily_context()'::regprocedure) INTO d;
  d := replace(
    d,
    $old$'version',3,'status','available','date',v_today,'generated_at',now(),$old$,
    $new$'version',3,'status','available','date',v_today,'generated_at',now(),
    'profile',jsonb_build_object(
      'complete',exists(select 1 from public.user_context_settings s where s.user_id=v_uid and s.pdi_completed_at is not null),
      'completed_at',(select s.pdi_completed_at from public.user_context_settings s where s.user_id=v_uid),
      'declared','{}'::jsonb,
      'preferences',coalesce((select s.preferences from public.user_context_settings s where s.user_id=v_uid),'{}'::jsonb),
      'observed',jsonb_build_object('source','durable_records','window_days',30),
      'inferred',jsonb_build_object('training_window',null,'source','workout_started_at','requires_confirmation',true)
    ),$new$
  );
  IF d NOT LIKE '%''profile'',jsonb_build_object%' THEN RAISE EXCEPTION 'sync_v3_profile_contract_patch_failed'; END IF;
  EXECUTE d;
END $patch$;;
