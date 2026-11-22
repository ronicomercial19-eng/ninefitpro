ALTER TABLE public.infinitepay_orders DROP CONSTRAINT infinitepay_orders_amount_cents_check, DROP CONSTRAINT infinitepay_orders_check, DROP CONSTRAINT infinitepay_orders_period_check;
ALTER TABLE public.infinitepay_orders ADD CONSTRAINT infinitepay_orders_product_price_check CHECK ((period='basic' AND amount_cents=9700) OR (period='annual' AND amount_cents=99700) OR (period='core_monthly' AND amount_cents=11900) OR (period='core_quarterly' AND amount_cents=29709));
INSERT INTO public.subscription_plans(id,name,tagline,price_monthly,features,is_recommended,display_order) VALUES('ninecore','NINE CORE','Acesso profissional',119,'[]'::jsonb,false,5) ON CONFLICT(id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.fn_prepare_infinitepay_order(p_user_id uuid,p_period text,p_request_id uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.infinitepay_orders; claimed boolean:=false; product text;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR p_period IS NULL OR p_period NOT IN('basic','annual','core_monthly','core_quarterly') THEN RAISE EXCEPTION 'invalid_checkout';END IF;
 product:=CASE WHEN p_period LIKE 'core_%' THEN 'ninecore' ELSE 'ninefitpro' END;
 IF product='ninecore' AND NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user_id AND role::text IN('professor','trainer','admin','super_admin')) THEN RAISE EXCEPTION 'professional_account_required';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 SELECT * INTO r FROM public.infinitepay_orders WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF FOUND AND r.period<>p_period THEN RAISE EXCEPTION 'request_conflict';END IF;
 IF NOT FOUND THEN
  IF EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user_id AND plan_id=product AND status='active' AND expires_at IS NULL) THEN RAISE EXCEPTION 'access_already_confirmed';END IF;
  IF (SELECT count(*) FROM public.infinitepay_orders WHERE user_id=p_user_id AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'checkout_rate_limit';END IF;
  INSERT INTO public.infinitepay_orders(user_id,request_id,period,amount_cents) VALUES(p_user_id,p_request_id,p_period,CASE p_period WHEN 'basic' THEN 9700 WHEN 'annual' THEN 99700 WHEN 'core_monthly' THEN 11900 ELSE 29709 END) RETURNING * INTO r;
 END IF;
 IF r.status='pending' AND(r.create_lease_until IS NULL OR r.create_lease_until<now()) THEN UPDATE public.infinitepay_orders SET create_lease_until=now()+interval '30 seconds' WHERE id=r.id RETURNING * INTO r;claimed:=true;END IF;
 RETURN to_jsonb(r)||jsonb_build_object('claimed',claimed);
END $$;
REVOKE ALL ON FUNCTION public.fn_prepare_infinitepay_order(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_prepare_infinitepay_order(uuid,text,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.fn_confirm_infinitepay_order(p_order_id uuid,p_transaction_nsu text,p_invoice_slug text,p_verification jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r public.infinitepay_orders; starts timestamptz; ends timestamptz; sid uuid; product text; months integer;
BEGIN
 IF p_transaction_nsu IS NULL OR p_transaction_nsu!~'^[A-Za-z0-9_-]{1,160}$' OR p_invoice_slug IS NULL OR p_invoice_slug!~'^[A-Za-z0-9_-]{1,160}$' OR p_verification->'success' IS DISTINCT FROM 'true'::jsonb OR p_verification->'paid' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(p_verification->'amount') IS DISTINCT FROM 'number' OR jsonb_typeof(p_verification->'paid_amount') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'payment_not_verified';END IF;
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.user_id::text,0));
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id FOR UPDATE;
 IF(p_verification->>'amount')::numeric<>r.amount_cents OR(p_verification->>'paid_amount')::numeric<r.amount_cents THEN RAISE EXCEPTION 'payment_amount_mismatch';END IF;
 IF r.status='paid' THEN
  IF r.transaction_nsu IS DISTINCT FROM p_transaction_nsu OR r.invoice_slug IS DISTINCT FROM p_invoice_slug THEN RAISE EXCEPTION 'order_already_paid';END IF;
  RETURN jsonb_build_object('saved',true,'already_saved',true,'subscription_id',r.subscription_id,'order_id',r.id);
 END IF;
 product:=CASE WHEN r.period LIKE 'core_%' THEN 'ninecore' ELSE 'ninefitpro' END;
 months:=CASE r.period WHEN 'annual' THEN 12 WHEN 'core_quarterly' THEN 3 ELSE 1 END;
 SELECT greatest(now(),coalesce(max(expires_at),now())) INTO starts FROM public.user_subscriptions WHERE user_id=r.user_id AND plan_id=product AND status='active' AND expires_at IS NOT NULL;
 ends:=((starts AT TIME ZONE 'America/Sao_Paulo')+make_interval(months=>months)) AT TIME ZONE 'America/Sao_Paulo';
 INSERT INTO public.user_subscriptions(user_id,plan_id,status,activated_at,expires_at,amount,source,metadata) VALUES(r.user_id,product,'active',now(),ends,r.amount_cents/100.0,'infinitepay_checkout',jsonb_build_object('order_id',r.id,'product',product,'period',r.period,'transaction_nsu',p_transaction_nsu,'invoice_slug',p_invoice_slug,'renewal','manual','period_starts_at',starts)) RETURNING id INTO sid;
 UPDATE public.infinitepay_orders SET verification_state='confirmed',last_verified_at=now(),next_verification_at=now()+interval '6 hours',status='paid',transaction_nsu=p_transaction_nsu,invoice_slug=p_invoice_slug,subscription_id=sid,paid_at=now() WHERE id=r.id;
 RETURN jsonb_build_object('saved',true,'already_saved',false,'subscription_id',sid,'order_id',r.id,'expires_at',ends,'product',product);
END $$;
REVOKE ALL ON FUNCTION public.fn_confirm_infinitepay_order(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_confirm_infinitepay_order(uuid,text,text,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.fn_billing_subscription_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,true) OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role::text IN('admin','super_admin')) THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM(SELECT s.id,p.full_name,s.plan_id,s.status,s.amount,s.activated_at,s.expires_at,s.source FROM public.user_subscriptions s LEFT JOIN public.profiles p ON p.user_id=s.user_id ORDER BY s.created_at DESC LIMIT 500)x),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.fn_billing_subscription_list() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.fn_billing_subscription_list() TO authenticated;
