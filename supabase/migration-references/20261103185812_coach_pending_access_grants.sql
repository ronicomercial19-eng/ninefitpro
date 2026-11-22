-- Account access is a courtesy entitlement, never a payment receipt.
CREATE TABLE private.coach_access_grants (
 request_id uuid PRIMARY KEY, actor_id uuid NOT NULL, user_id uuid NOT NULL,
 athlete_id uuid NOT NULL, subscription_id uuid NOT NULL, days integer,
 expires_at timestamptz, reason text NOT NULL, fingerprint text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.coach_access_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.coach_access_grants FROM PUBLIC,anon,authenticated;

-- Reuse the installed access guard (including existing legacy grants). Fresh
-- checkouts without that optional backend release still honor subscriptions.
CREATE FUNCTION private.coach_access_is_active(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF to_regprocedure('private.fitpro_access_for_user(uuid,timestamp with time zone)') IS NOT NULL
 OR to_regprocedure('private.fitpro_access_for_user(uuid)') IS NOT NULL THEN
   RETURN coalesce((private.fitpro_access_for_user(p_user_id)->>'allowed')::boolean,false);
 END IF;
 RETURN EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user_id
   AND status IN ('active','trialing') AND activated_at<=now() AND (expires_at IS NULL OR expires_at>now()));
END $$;
REVOKE ALL ON FUNCTION private.coach_access_is_active(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.fitpro_can_grant_account(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(auth.uid() IS NOT NULL
 AND NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 AND private.fitpro_actor_role() IN ('admin','super_admin','professor','trainer')
 AND EXISTS(SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
   WHERE p.user_id=p_user_id AND p.role::text='student' AND p.is_active=true AND u.email_confirmed_at IS NOT NULL)
 AND (
   EXISTS(SELECT 1 FROM public.athletes a WHERE (a.user_id=p_user_id OR EXISTS(
     SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=p_user_id))
     AND private.fitpro_can_manage_athlete(a.id))
   OR (NOT EXISTS(SELECT 1 FROM public.athletes a WHERE a.user_id=p_user_id OR EXISTS(
     SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=p_user_id))
     AND (private.fitpro_actor_role() IN ('admin','super_admin') OR EXISTS(
       SELECT 1 FROM private.ninefit_customer_entry_config c WHERE c.singleton AND c.enabled AND c.coach_id=auth.uid())))
 ),false)
$$;
REVOKE ALL ON FUNCTION private.fitpro_can_grant_account(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.fn_coach_pending_access(p_search text DEFAULT '',p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 OR coalesce(private.fitpro_actor_role(),'') NOT IN ('admin','super_admin','professor','trainer') THEN
   RAISE EXCEPTION 'professional_required' USING ERRCODE='42501'; END IF;
 IF p_search IS NULL OR length(p_search)>120 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'invalid_search'; END IF;
 WITH eligible AS (
   SELECT p.user_id,p.full_name,u.email,p.created_at,
     EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=p.user_id AND i.provider='google') AS google_login,
     (SELECT a.id FROM public.athletes a WHERE a.user_id=p.user_id OR EXISTS(
       SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=p.user_id) ORDER BY a.id LIMIT 1) AS athlete_id
   FROM public.profiles p JOIN auth.users u ON u.id=p.user_id
   WHERE p.role::text='student' AND p.is_active=true AND u.email_confirmed_at IS NOT NULL
     AND private.fitpro_can_grant_account(p.user_id)
     AND (btrim(p_search)='' OR strpos(lower(coalesce(p.full_name,'')||' '||u.email),lower(btrim(p_search)))>0)
     AND NOT private.coach_access_is_active(p.user_id)
 ), page AS (SELECT * FROM eligible ORDER BY created_at DESC,user_id LIMIT 20 OFFSET p_offset)
 SELECT jsonb_build_object('total',(SELECT count(*) FROM eligible),'offset',p_offset,
 'accounts',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,user_id) FROM page),'[]'::jsonb)) INTO v_result;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_pending_access(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_pending_access(text,integer) TO authenticated;

CREATE FUNCTION public.fn_coach_grant_access(p_user_id uuid,p_days integer,p_reason text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=auth.uid(); v_athlete uuid; v_subscription uuid; v_email text; v_name text;
 v_expiry timestamptz; v_count integer; v_receipt private.coach_access_grants; v_fingerprint text;
BEGIN
 IF NOT private.fitpro_can_grant_account(p_user_id) THEN RAISE EXCEPTION 'account_access_denied' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 5 AND 500
 OR (p_days IS NOT NULL AND p_days NOT BETWEEN 1 AND 3650) THEN RAISE EXCEPTION 'invalid_grant'; END IF;
 v_fingerprint:=md5(jsonb_build_array(v_uid,p_user_id,p_days,btrim(p_reason))::text);
 PERFORM pg_advisory_xact_lock(hashtextextended('coach_access_request:'||p_request_id::text,0));
 SELECT * INTO v_receipt FROM private.coach_access_grants WHERE request_id=p_request_id;
 IF FOUND THEN
   IF v_receipt.fingerprint<>v_fingerprint THEN RAISE EXCEPTION 'request_conflict'; END IF;
   RETURN jsonb_build_object('saved',true,'athlete_id',v_receipt.athlete_id,'expires_at',v_receipt.expires_at,'already_saved',true);
 END IF;
 -- Same lock as self-provisioning; two professors cannot create competing links.
 PERFORM pg_advisory_xact_lock(hashtextextended('ninefit_customer:'||p_user_id::text,0));
 PERFORM 1 FROM public.profiles WHERE user_id=p_user_id FOR UPDATE;
 IF NOT private.fitpro_can_grant_account(p_user_id) THEN RAISE EXCEPTION 'account_access_denied' USING ERRCODE='42501'; END IF;
 IF private.coach_access_is_active(p_user_id) THEN RAISE EXCEPTION 'access_already_active'; END IF;
 SELECT count(*),min(a.id::text)::uuid INTO v_count,v_athlete FROM public.athletes a WHERE a.user_id=p_user_id
 OR EXISTS(SELECT 1 FROM public.athlete_auth_link l WHERE l.athlete_id=a.id AND l.user_id=p_user_id);
 IF v_count>1 THEN RAISE EXCEPTION 'ambiguous_athlete_requires_review'; END IF;
 SELECT email INTO v_email FROM auth.users WHERE id=p_user_id;
 SELECT coalesce(nullif(full_name,''),'Atleta 9FIT') INTO v_name FROM public.profiles WHERE user_id=p_user_id;
 IF v_athlete IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.athletes WHERE lower(email)=lower(v_email)) THEN
     RAISE EXCEPTION 'existing_profile_requires_team_review'; END IF;
   INSERT INTO public.athletes(coach_id,user_id,name,email,activated,password_changed)
   VALUES(v_uid,p_user_id,left(v_name,120),v_email,true,true) RETURNING id INTO v_athlete;
 END IF;
 v_expiry:=CASE WHEN p_days IS NULL THEN NULL ELSE now()+make_interval(days=>p_days) END;
 INSERT INTO public.user_subscriptions(user_id,status,source,amount,expires_at,metadata)
 VALUES(p_user_id,'active','professor_courtesy',0,v_expiry,
 jsonb_build_object('grant_request_id',p_request_id,'granted_by',v_uid,'athlete_id',v_athlete,
 'reason',btrim(p_reason),'courtesy',true,'payment_received',false)) RETURNING id INTO v_subscription;
 INSERT INTO private.coach_access_grants(request_id,actor_id,user_id,athlete_id,subscription_id,days,expires_at,reason,fingerprint)
 VALUES(p_request_id,v_uid,p_user_id,v_athlete,v_subscription,p_days,v_expiry,btrim(p_reason),v_fingerprint);
 RETURN jsonb_build_object('saved',true,'athlete_id',v_athlete,'expires_at',v_expiry,'already_saved',false);
END $$;
REVOKE ALL ON FUNCTION public.fn_coach_grant_access(uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_coach_grant_access(uuid,integer,text,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
