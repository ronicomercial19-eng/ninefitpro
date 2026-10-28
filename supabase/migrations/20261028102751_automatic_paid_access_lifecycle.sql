CREATE TABLE private.fitpro_access_grants (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 source text NOT NULL CHECK(source IN('legacy_consultoria','manual')),
 reason text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 valid_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.fitpro_access_states (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 allowed boolean NOT NULL,reason text NOT NULL,source text NOT NULL,expires_at timestamptz,
 checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.fitpro_access_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid REFERENCES auth.users(id),allowed boolean,reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private.fitpro_billing_jobs (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 job_token text NOT NULL DEFAULT gen_random_uuid()::text||gen_random_uuid()::text,
 last_lifecycle_at timestamptz,last_reconcile_at timestamptz,last_checked integer,last_errors integer
);
CREATE INDEX fitpro_access_events_user_created ON private.fitpro_access_events(user_id,created_at DESC);
INSERT INTO private.fitpro_billing_jobs(singleton)VALUES(true);
ALTER TABLE private.fitpro_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.fitpro_access_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.fitpro_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.fitpro_billing_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.fitpro_access_grants,private.fitpro_access_states,private.fitpro_access_events,private.fitpro_billing_jobs FROM PUBLIC,anon,authenticated;

-- A one-time explicit concession preserves existing professional clients.
-- Future self-signups/coach assignments do not create this concession.
INSERT INTO private.fitpro_access_grants(user_id,source,reason)
SELECT DISTINCT u.user_id,'legacy_consultoria','Carteira profissional anterior ao controle de cobrança'
FROM (
 SELECT a.user_id FROM public.athletes a WHERE a.coach_id IS NOT NULL AND a.user_id IS NOT NULL
 UNION SELECT l.user_id FROM public.athlete_auth_link l JOIN public.athletes a ON a.id=l.athlete_id WHERE a.coach_id IS NOT NULL
)u JOIN auth.users verified_account ON verified_account.id=u.user_id
WHERE verified_account.is_anonymous IS NOT TRUE AND NOT EXISTS(SELECT 1 FROM public.user_subscriptions s WHERE s.user_id=u.user_id)
ON CONFLICT(user_id)DO NOTHING;

CREATE OR REPLACE FUNCTION private.fitpro_access_for_user(p_user_id uuid,p_now timestamptz DEFAULT now())
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p record;s record;g record;
BEGIN
 IF p_user_id IS NULL THEN RETURN jsonb_build_object('allowed',false,'reason','account_required','source','none','server_now',p_now);END IF;
 SELECT role::text,is_active INTO p FROM public.profiles WHERE user_id=p_user_id;
 IF FOUND AND p.is_active IS FALSE THEN RETURN jsonb_build_object('allowed',false,'reason','account_disabled','source','account','server_now',p_now);END IF;
 IF p.role IN('admin','super_admin','professor','trainer') THEN RETURN jsonb_build_object('allowed',true,'reason','professional','source','professional','server_now',p_now);END IF;
 SELECT * INTO s FROM public.user_subscriptions WHERE user_id=p_user_id AND status IN('active','trialing') AND activated_at<=p_now AND(expires_at IS NULL OR expires_at>p_now) ORDER BY expires_at DESC NULLS FIRST,activated_at DESC LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('allowed',true,'reason','active','source','subscription','expires_at',s.expires_at,'subscription_id',s.id,'server_now',p_now);END IF;
 SELECT * INTO g FROM private.fitpro_access_grants WHERE user_id=p_user_id AND active AND(valid_until IS NULL OR valid_until>p_now);
 IF FOUND THEN RETURN jsonb_build_object('allowed',true,'reason',g.source,'source',g.source,'expires_at',g.valid_until,'server_now',p_now);END IF;
 SELECT * INTO s FROM public.user_subscriptions WHERE user_id=p_user_id ORDER BY activated_at DESC LIMIT 1;
 RETURN jsonb_build_object('allowed',false,'reason',CASE WHEN s.status='suspended' THEN 'payment_unconfirmed' WHEN s.expires_at<=p_now THEN 'expired' ELSE 'payment_required' END,'source','subscription','expires_at',s.expires_at,'server_now',p_now);
END $$;
REVOKE ALL ON FUNCTION private.fitpro_access_for_user(uuid,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.fitpro_current_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 AND coalesce((private.fitpro_access_for_user(auth.uid())->>'allowed')::boolean,false);
$$;
REVOKE ALL ON FUNCTION private.fitpro_current_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.fitpro_current_access() TO authenticated;

CREATE OR REPLACE FUNCTION private.fitpro_require_current_access()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(auth.jwt()->>'role','')='service_role' THEN RETURN;END IF;
 IF auth.uid() IS NULL AND session_user IN('postgres','supabase_admin') AND current_setting('role',true) IN('none','postgres','supabase_admin','service_role') THEN RETURN;END IF;
 IF NOT private.fitpro_current_access() THEN RAISE EXCEPTION 'subscription_required' USING ERRCODE='42501',HINT='Renove o acesso em /9fit/planos';END IF;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_require_current_access() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_fitpro_access_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'account_required' USING ERRCODE='42501';END IF;
 RETURN private.fitpro_access_for_user(auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.fn_fitpro_access_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_access_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_fitpro_backend_access(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT private.fitpro_access_for_user(p_user_id)$$;
REVOKE ALL ON FUNCTION public.fn_fitpro_backend_access(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_backend_access(uuid) TO service_role;
CREATE FUNCTION public.fn_fitpro_validate_paid_targets(p_user_id uuid,p_targets jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE t text;r text;
BEGIN
 IF p_targets IS NULL OR jsonb_typeof(p_targets)<>'array' THEN RETURN false;END IF;
 IF jsonb_array_length(p_targets)>20 OR NOT coalesce((private.fitpro_access_for_user(p_user_id)->>'allowed')::boolean,false) THEN RETURN false;END IF;
 SELECT role::text INTO r FROM public.profiles WHERE user_id=p_user_id AND is_active IS NOT FALSE;
 FOR t IN SELECT jsonb_array_elements_text(p_targets) LOOP
  IF t !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RETURN false;END IF;
  IF t::uuid=p_user_id THEN CONTINUE;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.athletes a WHERE(a.id=t::uuid OR a.user_id=t::uuid OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=t::uuid))
   AND(a.user_id=p_user_id OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=p_user_id) OR r IN('admin','super_admin') OR(r IN('professor','trainer') AND a.coach_id=p_user_id))) THEN RETURN false;END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.fn_fitpro_validate_paid_targets(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_validate_paid_targets(uuid,jsonb) TO service_role;
CREATE TABLE private.fitpro_api_rate_limits(user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,bucket text CHECK(bucket IN('ai','content')),window_start timestamptz NOT NULL,hits integer NOT NULL,PRIMARY KEY(user_id,bucket));
ALTER TABLE private.fitpro_api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.fitpro_api_rate_limits FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.fn_fitpro_claim_api_request(p_user_id uuid,p_bucket text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE max_hits integer;used integer;v_window timestamptz:=date_trunc('minute',now());r text;
BEGIN
 IF p_bucket IS NULL OR p_bucket NOT IN('ai','content') THEN RAISE EXCEPTION 'invalid_api_bucket';END IF;
 SELECT role::text INTO r FROM public.profiles WHERE user_id=p_user_id AND is_active IS NOT FALSE;
 max_hits:=CASE WHEN p_bucket='ai' THEN CASE WHEN r IN('admin','super_admin','professor','trainer') THEN 60 ELSE 10 END ELSE CASE WHEN r IN('admin','super_admin','professor','trainer') THEN 180 ELSE 60 END END;
 INSERT INTO private.fitpro_api_rate_limits(user_id,bucket,window_start,hits)VALUES(p_user_id,p_bucket,v_window,1)
 ON CONFLICT(user_id,bucket)DO UPDATE SET window_start=excluded.window_start,hits=CASE WHEN fitpro_api_rate_limits.window_start=v_window THEN fitpro_api_rate_limits.hits+1 ELSE 1 END
 WHERE fitpro_api_rate_limits.window_start<>v_window OR fitpro_api_rate_limits.hits<max_hits
 RETURNING hits INTO used;
 RETURN jsonb_build_object('allowed',FOUND,'retry_after',CASE WHEN FOUND THEN 0 ELSE greatest(1,ceil(extract(epoch FROM(v_window+interval '1 minute'-now())))) END);
END $$;
REVOKE ALL ON FUNCTION public.fn_fitpro_claim_api_request(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_claim_api_request(uuid,text) TO service_role;

-- Restrictive policies add the commercial gate to existing ownership policies.
DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['daily_workouts','workout_exercises','student_training_assignments'] LOOP
  EXECUTE format('CREATE POLICY fitpro_paid_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING((SELECT private.fitpro_current_access()))',t);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['workout_executions','workout_exercise_sets'] LOOP
  EXECUTE format('CREATE POLICY fitpro_paid_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK((SELECT private.fitpro_current_access()))',t);
  EXECUTE format('CREATE POLICY fitpro_paid_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING((SELECT private.fitpro_current_access())) WITH CHECK((SELECT private.fitpro_current_access()))',t);
  EXECUTE format('CREATE POLICY fitpro_paid_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING((SELECT private.fitpro_current_access()))',t);
 END LOOP;
END $$;

-- Triggers also apply inside existing SECURITY DEFINER writers.
CREATE OR REPLACE FUNCTION private.fitpro_guard_paid_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN PERFORM private.fitpro_require_current_access();RETURN NULL;END $$;
REVOKE ALL ON FUNCTION private.fitpro_guard_paid_write() FROM PUBLIC,anon,authenticated;
DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['daily_workouts','workout_exercises','workout_executions','workout_exercise_sets','student_training_assignments'] LOOP
  EXECUTE format('CREATE TRIGGER fitpro_paid_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION private.fitpro_guard_paid_write()',t);
 END LOOP;
END $$;
-- Guard public paid RPCs before they can read content or call other writers.
DO $$DECLARE r record;d text;BEGIN
 FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prorettype<>'trigger'::regtype AND p.proname IN(
 'fn_get_week_workouts','get_week_workouts','get_workout_of_day','fn_generate_periodized_week','fn_treino_rapido',
 'prescrever_treino','prescrever_treino_partner','prescrever_treino_html','deprecated_prescrever_treino_rapido',
 'fn_start_workout_execution','fn_start_daily_workout_execution','fn_save_workout_set','fn_complete_workout_execution',
 'fn_skip_daily_workout_execution','fn_complete_student_protocol','fn_library_progress') LOOP
  SELECT pg_get_functiondef(r.oid) INTO d;
  IF d !~* E'\n[[:space:]]*BEGIN\\M' THEN RAISE EXCEPTION 'paid_rpc_requires_manual_guard: %',r.oid::regprocedure;END IF;
  d:=regexp_replace(d,E'(\n[[:space:]]*BEGIN\\M)',E'\\1\n PERFORM private.fitpro_require_current_access();','i');EXECUTE d;
 END LOOP;
END $$;

ALTER TABLE public.infinitepay_orders ADD COLUMN verification_state text NOT NULL DEFAULT 'confirmed' CHECK(verification_state IN('confirmed','unconfirmed','error'));
ALTER TABLE public.infinitepay_orders ADD COLUMN last_verified_at timestamptz;
ALTER TABLE public.infinitepay_orders ADD COLUMN next_verification_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.infinitepay_orders ADD COLUMN verification_error text;
CREATE INDEX infinitepay_verification_due ON public.infinitepay_orders(next_verification_at) WHERE status='paid';
DO $migration$
DECLARE d text;needle text:='UPDATE public.infinitepay_orders SET status=''paid'',transaction_nsu=';
BEGIN
 SELECT pg_get_functiondef('public.fn_confirm_infinitepay_order(uuid,text,text,jsonb)'::regprocedure) INTO d;
 IF position(needle IN d)=0 THEN RAISE EXCEPTION 'payment_receipt_contract_changed';END IF;
 d:=replace(d,needle,'UPDATE public.infinitepay_orders SET verification_state=''confirmed'',last_verified_at=now(),next_verification_at=now()+interval ''6 hours'',status=''paid'',transaction_nsu=');
 EXECUTE d;
END $migration$;

CREATE OR REPLACE FUNCTION public.fn_fitpro_claim_payment_checks(p_limit integer DEFAULT 20)
RETURNS SETOF public.infinitepay_orders LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 WITH due AS(SELECT id FROM public.infinitepay_orders o WHERE status='paid' AND transaction_nsu IS NOT NULL AND next_verification_at<=now() AND EXISTS(SELECT 1 FROM public.user_subscriptions s WHERE s.id=o.subscription_id AND(s.expires_at IS NULL OR s.expires_at>now())) ORDER BY next_verification_at LIMIT least(greatest(p_limit,1),20) FOR UPDATE SKIP LOCKED)
 UPDATE public.infinitepay_orders o SET next_verification_at=now()+interval '10 minutes' FROM due WHERE o.id=due.id RETURNING o.*;
$$;
CREATE OR REPLACE FUNCTION public.fn_fitpro_apply_payment_check(p_order_id uuid,p_verification jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.infinitepay_orders;verified boolean;negative boolean;
BEGIN
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id FOR UPDATE;
 IF r.status<>'paid' OR r.subscription_id IS NULL THEN RAISE EXCEPTION 'paid_order_required';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.user_subscriptions s WHERE s.id=r.subscription_id AND s.user_id=r.user_id AND s.source='infinitepay_checkout') THEN RAISE EXCEPTION 'paid_receipt_subscription_mismatch';END IF;
 verified:=p_verification->'success'='true'::jsonb AND p_verification->'paid'='true'::jsonb AND p_verification->'amount'=to_jsonb(r.amount_cents) AND CASE WHEN jsonb_typeof(p_verification->'paid_amount')='number' THEN(p_verification->>'paid_amount')::numeric>=r.amount_cents ELSE false END;
 negative:=p_verification->'success'='true'::jsonb AND p_verification->'paid'='false'::jsonb;
 IF coalesce(verified,false) THEN
  UPDATE public.user_subscriptions SET status=CASE WHEN expires_at IS NULL OR expires_at>now() THEN 'active' ELSE 'expired' END,updated_at=now() WHERE id=r.subscription_id AND source='infinitepay_checkout';
  UPDATE public.infinitepay_orders SET verification_state='confirmed',last_verified_at=now(),verification_error=NULL,next_verification_at=now()+interval '6 hours' WHERE id=r.id;
 ELSIF coalesce(negative,false) THEN
  UPDATE public.user_subscriptions SET status='suspended',updated_at=now() WHERE id=r.subscription_id AND source='infinitepay_checkout';
  UPDATE public.infinitepay_orders SET verification_state='unconfirmed',last_verified_at=now(),verification_error='provider_reports_unpaid',next_verification_at=now()+interval '30 minutes' WHERE id=r.id;
 ELSE
  UPDATE public.infinitepay_orders SET verification_state='error',verification_error='provider_verification_unavailable',next_verification_at=now()+interval '30 minutes' WHERE id=r.id;
 END IF;
 RETURN jsonb_build_object('confirmed',coalesce(verified,false),'suspended',coalesce(negative,false));
END $$;
CREATE OR REPLACE FUNCTION public.fn_fitpro_check_job_token(p_token text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$SELECT coalesce(p_token=(SELECT job_token FROM private.fitpro_billing_jobs WHERE singleton),false)$$;
REVOKE ALL ON FUNCTION public.fn_fitpro_claim_payment_checks(integer),public.fn_fitpro_apply_payment_check(uuid,jsonb),public.fn_fitpro_check_job_token(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_claim_payment_checks(integer),public.fn_fitpro_apply_payment_check(uuid,jsonb),public.fn_fitpro_check_job_token(text) TO service_role;
CREATE FUNCTION public.fn_fitpro_record_reconcile(p_checked integer,p_errors integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE private.fitpro_billing_jobs SET last_reconcile_at=now(),last_checked=least(greatest(p_checked,0),20),last_errors=least(greatest(p_errors,0),20) WHERE singleton;
$$;
REVOKE ALL ON FUNCTION public.fn_fitpro_record_reconcile(integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_record_reconcile(integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION private.fitpro_refresh_access_states()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record;a jsonb;changed int:=0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtextextended('fitpro-access-lifecycle',0)) THEN RETURN 0;END IF;
 UPDATE public.user_subscriptions SET status='expired',updated_at=now() WHERE status IN('active','trialing') AND expires_at<=now();
 FOR r IN SELECT user_id FROM public.profiles LOOP
  a:=private.fitpro_access_for_user(r.user_id);
  INSERT INTO private.fitpro_access_states(user_id,allowed,reason,source,expires_at,checked_at)
  VALUES(r.user_id,(a->>'allowed')::boolean,a->>'reason',a->>'source',(a->>'expires_at')::timestamptz,now())
  ON CONFLICT(user_id)DO UPDATE SET allowed=EXCLUDED.allowed,reason=EXCLUDED.reason,source=EXCLUDED.source,expires_at=EXCLUDED.expires_at,checked_at=now()
  WHERE (fitpro_access_states.allowed,fitpro_access_states.reason,fitpro_access_states.source,fitpro_access_states.expires_at) IS DISTINCT FROM(EXCLUDED.allowed,EXCLUDED.reason,EXCLUDED.source,EXCLUDED.expires_at);
  IF FOUND THEN INSERT INTO private.fitpro_access_events(user_id,allowed,reason)VALUES(r.user_id,(a->>'allowed')::boolean,a->>'reason');changed:=changed+1;END IF;
 END LOOP;
 UPDATE private.fitpro_billing_jobs SET last_lifecycle_at=now() WHERE singleton;
 RETURN changed;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_refresh_access_states() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_fitpro_billing_overview(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce((auth.jwt()->>'is_anonymous')::boolean,false) OR coalesce(private.fitpro_actor_role()::text,'') NOT IN('admin','super_admin') OR auth.uid() IS NULL THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('server_now',now(),'accounts_total',(SELECT count(*) FROM public.profiles),'accounts',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT p.user_id,p.full_name,a.value->>'reason' reason,(a.value->>'allowed')::boolean allowed,a.value->>'source' source,a.value->>'expires_at' expires_at FROM public.profiles p CROSS JOIN LATERAL(SELECT private.fitpro_access_for_user(p.user_id) value)a ORDER BY p.full_name,p.user_id LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0))x),'[]'),
  'payment_checks',coalesce((SELECT jsonb_agg(to_jsonb(x))FROM(SELECT id,user_id,period,status,verification_state,last_verified_at,next_verification_at,verification_error FROM public.infinitepay_orders WHERE status='paid' ORDER BY next_verification_at LIMIT 100)x),'[]'),
  'manual_reviews',(SELECT count(*) FROM public.infinitepay_payment_reviews),
  'health',(SELECT jsonb_build_object('last_lifecycle_at',last_lifecycle_at,'last_reconcile_at',last_reconcile_at,'last_checked',last_checked,'last_errors',last_errors) FROM private.fitpro_billing_jobs WHERE singleton),
  'jobs',coalesce((SELECT jsonb_agg(jsonb_build_object('name',jobname,'active',active,'schedule',schedule))FROM cron.job WHERE jobname IN('fitpro-access-lifecycle','fitpro-payment-reconcile')),'[]'));
END $$;
REVOKE ALL ON FUNCTION public.fn_fitpro_billing_overview(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_billing_overview(integer,integer) TO authenticated;

SELECT cron.schedule('fitpro-access-lifecycle','* * * * *','SELECT private.fitpro_refresh_access_states()');
-- Twenty receipts/minute supports 1,200 checks/hour, above 3,000 accounts/6h.
SELECT cron.schedule('fitpro-payment-reconcile','* * * * *',$job$
 SELECT net.http_post(url:='https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/infinitepay-reconcile',headers:=jsonb_build_object('Content-Type','application/json','x-job-token',(SELECT job_token FROM private.fitpro_billing_jobs WHERE singleton)),body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
-- The exposed authenticated endpoints delegate to guarded private functions.
ALTER FUNCTION public.fn_fitpro_access_status() SET SCHEMA private;
CREATE FUNCTION public.fn_fitpro_access_status() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.fn_fitpro_access_status()$$;
REVOKE ALL ON FUNCTION public.fn_fitpro_access_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_access_status(),private.fn_fitpro_access_status() TO authenticated;
ALTER FUNCTION public.fn_fitpro_billing_overview(integer,integer) SET SCHEMA private;
CREATE FUNCTION public.fn_fitpro_billing_overview(p_offset integer DEFAULT 0,p_limit integer DEFAULT 50) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.fn_fitpro_billing_overview(p_offset,p_limit)$$;
REVOKE ALL ON FUNCTION public.fn_fitpro_billing_overview(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_billing_overview(integer,integer),private.fn_fitpro_billing_overview(integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
