BEGIN;
DO $test$
DECLARE v_uid uuid; v_id uuid; v_second uuid; v_coach uuid; v_before integer; v_after integer;
BEGIN
 SELECT p.user_id INTO v_uid FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
 WHERE p.role::text='student' AND p.is_active AND u.email_confirmed_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM public.athletes a WHERE a.user_id=p.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.user_id=p.user_id)
 AND NOT EXISTS(SELECT 1 FROM public.athletes a WHERE lower(a.email)=lower(u.email))
 ORDER BY p.user_id LIMIT 1;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'no_test_candidate'; END IF;
 SELECT coach_id INTO v_coach FROM private.ninefit_customer_entry_config WHERE singleton;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated','is_anonymous',false)::text,true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT count(*) INTO v_before FROM public.user_subscriptions WHERE user_id=v_uid;
 v_id:=public.fn_ensure_ninefit_customer();
 v_second:=public.fn_ensure_ninefit_customer();
 IF v_id IS NULL OR v_id<>v_second THEN RAISE EXCEPTION 'not_idempotent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.athletes WHERE id=v_id AND user_id=v_uid AND coach_id=v_coach AND password_changed) THEN RAISE EXCEPTION 'wrong_owner'; END IF;
 SELECT count(*) INTO v_after FROM public.user_subscriptions WHERE user_id=v_uid;
 IF v_before<>v_after THEN RAISE EXCEPTION 'subscription_changed'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated','is_anonymous',true)::text,true);
 BEGIN PERFORM public.fn_ensure_ninefit_customer(); RAISE EXCEPTION 'anonymous_allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 EXECUTE 'RESET ROLE';
 IF has_function_privilege('anon','public.fn_ensure_ninefit_customer()','EXECUTE') THEN RAISE EXCEPTION 'anon_grant'; END IF;
END $test$;
ROLLBACK;
