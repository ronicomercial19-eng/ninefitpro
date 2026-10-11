BEGIN;
DO $test$
DECLARE v_uid uuid; v_ath uuid; v_before int; v_after int; v_receipt public.share_events%ROWTYPE; v_second public.share_events%ROWTYPE; v_count int; v_key text:=gen_random_uuid()::text;
BEGIN
 SELECT a.user_id INTO v_uid FROM public.athletes a WHERE a.user_id IS NOT NULL
 AND (SELECT count(*) FROM public.share_events s WHERE s.athlete_id=a.id AND s.rewarded AND s.shared_at>=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')<3 LIMIT 1;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'No eligible existing identity for rollback-only test'; END IF;
 PERFORM set_config('request.jwt.claim.sub',v_uid::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_uid,'role','authenticated')::text,true);
 SET LOCAL ROLE authenticated;
 v_ath:=public.fn_current_athlete_id();
 SELECT coalesce(total_xp,0) INTO v_before FROM public.athletes WHERE id=v_ath;
 INSERT INTO public.share_events(user_id,content_type,content_id,channel,reward_xp,rewarded,shared_at)
 VALUES(v_uid,'workout',v_key,'native',999999,true,now()+interval '1 year') RETURNING * INTO v_receipt;
 IF NOT v_receipt.rewarded OR v_receipt.reward_xp<>20 OR v_receipt.shared_at>now()+interval '1 second' THEN RAISE EXCEPTION 'server receipt invariant failed'; END IF;
 INSERT INTO public.share_events(user_id,content_type,content_id,channel,reward_xp,rewarded)
 VALUES(v_uid,'workout',v_key,'native',999999,true) RETURNING * INTO v_second;
 IF v_second.rewarded OR v_second.reward_xp<>0 THEN RAISE EXCEPTION 'duplicate receipt rewarded'; END IF;
 INSERT INTO public.share_events(user_id,content_type,content_id,channel,reward_xp)
 VALUES(v_uid,'workout',v_key||'-copy','copy',999999) RETURNING * INTO v_second;
 IF v_second.rewarded OR v_second.reward_xp<>0 THEN RAISE EXCEPTION 'copy rewarded'; END IF;
 PERFORM public.fn_reward_share(v_ath,'workout',v_key,999999);
 SELECT coalesce(total_xp,0) INTO v_after FROM public.athletes WHERE id=v_ath;
 IF v_after-v_before<>20 THEN RAISE EXCEPTION 'XP double count: %',v_after-v_before; END IF;
 BEGIN PERFORM public.fn_award_xp(v_ath,999999,'share_bonus','{}'); RAISE EXCEPTION 'direct share XP allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.share_events(user_id,athlete_id,content_type,channel) VALUES(v_uid,'00000000-0000-0000-0000-000000000002','workout','native'); RAISE EXCEPTION 'foreign athlete allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.fn_get_treino_dia('00000000-0000-0000-0000-000000000002',CURRENT_DATE); RAISE EXCEPTION 'foreign read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.prescrever_treino('00000000-0000-0000-0000-000000000002',CURRENT_DATE); RAISE EXCEPTION 'foreign prescription allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.athlete_pdi_history(athlete_id,pdi_data) VALUES('00000000-0000-0000-0000-000000000002','{}'); RAISE EXCEPTION 'foreign PDI insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.user_subscriptions SET status='active' WHERE user_id=v_uid; RAISE EXCEPTION 'client subscription write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
END $test$;
ROLLBACK;
SELECT 'passed: rollback-only owner, share dedupe, server amount, export, PDI and subscription checks' AS verification;
