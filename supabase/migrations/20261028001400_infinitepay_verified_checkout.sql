-- A purchase grants a finite access period; it never schedules recurring charges.
INSERT INTO public.subscription_plans(id,name,tagline,price_monthly,price_yearly,features,display_order,is_recommended)
VALUES('ninefitpro','9FIT PRO','Seu treino organizado. Sua evolução registrada.',97,997,
 '["Planejamento e execução dos treinos","Registro de sessões e evolução","Avaliação guiada e histórico","Suporte de uso do aplicativo"]'::jsonb,4,false)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE public.infinitepay_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 request_id uuid NOT NULL,
 period text NOT NULL CHECK(period IN('basic','annual')),
 amount_cents integer NOT NULL CHECK(amount_cents IN(9700,99700)),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','ready','paid')),
 checkout_url text,
 create_lease_until timestamptz,
 transaction_nsu text UNIQUE,
 invoice_slug text,
 subscription_id uuid REFERENCES public.user_subscriptions(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 UNIQUE(user_id,request_id),
 CHECK((period='basic' AND amount_cents=9700) OR(period='annual' AND amount_cents=99700))
);
ALTER TABLE public.infinitepay_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.infinitepay_orders FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.infinitepay_orders TO authenticated;
GRANT ALL ON public.infinitepay_orders TO service_role;
CREATE POLICY infinitepay_own_orders ON public.infinitepay_orders FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) AND NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,true));

-- Verified purchases from a shared external link cannot be assigned by guessing an email.
CREATE TABLE public.infinitepay_payment_reviews (
 transaction_nsu text PRIMARY KEY,
 order_nsu text NOT NULL,
 invoice_slug text NOT NULL,
 amount_cents integer NOT NULL,
 reason text NOT NULL DEFAULT 'unmatched_order',
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.infinitepay_payment_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.infinitepay_payment_reviews FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.infinitepay_payment_reviews TO service_role;

CREATE OR REPLACE FUNCTION public.fn_prepare_infinitepay_order(p_user_id uuid,p_period text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.infinitepay_orders; claimed boolean:=false;
BEGIN
 IF p_user_id IS NULL OR p_request_id IS NULL OR p_period NOT IN('basic','annual') THEN RAISE EXCEPTION 'invalid_checkout'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 SELECT * INTO r FROM public.infinitepay_orders WHERE user_id=p_user_id AND request_id=p_request_id FOR UPDATE;
 IF FOUND AND r.period<>p_period THEN RAISE EXCEPTION 'request_conflict'; END IF;
 IF NOT FOUND THEN
  IF EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=p_user_id AND status='active' AND expires_at IS NULL) THEN RAISE EXCEPTION 'access_already_confirmed'; END IF;
  IF (SELECT count(*) FROM public.infinitepay_orders WHERE user_id=p_user_id AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'checkout_rate_limit'; END IF;
  INSERT INTO public.infinitepay_orders(user_id,request_id,period,amount_cents)
   VALUES(p_user_id,p_request_id,p_period,CASE p_period WHEN 'basic' THEN 9700 ELSE 99700 END) RETURNING * INTO r;
 END IF;
 IF r.status='pending' AND (r.create_lease_until IS NULL OR r.create_lease_until<now()) THEN
  UPDATE public.infinitepay_orders SET create_lease_until=now()+interval '30 seconds' WHERE id=r.id RETURNING * INTO r;
  claimed:=true;
 END IF;
 RETURN to_jsonb(r)||jsonb_build_object('claimed',claimed);
END $$;

CREATE OR REPLACE FUNCTION public.fn_attach_infinitepay_link(p_order_id uuid,p_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.infinitepay_orders;
BEGIN
 IF p_url IS NULL OR p_url !~ '^https://checkout\.infinitepay\.io/ronynapoleao/[A-Za-z0-9_-]+/?$' THEN RAISE EXCEPTION 'invalid_checkout_url'; END IF;
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id FOR UPDATE;
 IF r.checkout_url IS NULL AND r.status='pending' THEN
  UPDATE public.infinitepay_orders SET checkout_url=p_url,status='ready',create_lease_until=NULL WHERE id=r.id RETURNING * INTO r;
 END IF;
 RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.fn_confirm_infinitepay_order(p_order_id uuid,p_transaction_nsu text,p_invoice_slug text,p_verification jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.infinitepay_orders; starts timestamptz; ends timestamptz; sid uuid;
BEGIN
 IF p_transaction_nsu IS NULL OR length(p_transaction_nsu) NOT BETWEEN 1 AND 160 OR p_invoice_slug IS NULL OR length(p_invoice_slug) NOT BETWEEN 1 AND 160
  OR p_verification->>'success' IS DISTINCT FROM 'true' OR p_verification->>'paid' IS DISTINCT FROM 'true'
  OR jsonb_typeof(p_verification->'amount') IS DISTINCT FROM 'number' OR jsonb_typeof(p_verification->'paid_amount') IS DISTINCT FROM 'number'
 THEN RAISE EXCEPTION 'payment_not_verified'; END IF;
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(r.user_id::text,0));
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id FOR UPDATE;
 IF (p_verification->>'amount')::numeric<>r.amount_cents OR (p_verification->>'paid_amount')::numeric<r.amount_cents THEN RAISE EXCEPTION 'payment_amount_mismatch'; END IF;
 IF r.status='paid' THEN
  IF r.transaction_nsu IS DISTINCT FROM p_transaction_nsu OR r.invoice_slug IS DISTINCT FROM p_invoice_slug THEN RAISE EXCEPTION 'order_already_paid'; END IF;
  RETURN jsonb_build_object('saved',true,'already_saved',true,'subscription_id',r.subscription_id,'order_id',r.id);
 END IF;
 SELECT greatest(now(),coalesce(max(expires_at),now())) INTO starts FROM public.user_subscriptions WHERE user_id=r.user_id AND status='active' AND expires_at IS NOT NULL;
 ends:=((starts AT TIME ZONE 'America/Sao_Paulo')+CASE r.period WHEN 'basic' THEN interval '1 month' ELSE interval '1 year' END) AT TIME ZONE 'America/Sao_Paulo';
 INSERT INTO public.user_subscriptions(user_id,plan_id,status,activated_at,expires_at,amount,source,metadata)
 VALUES(r.user_id,'ninefitpro','active',now(),ends,r.amount_cents/100.0,'infinitepay_checkout',
  jsonb_build_object('order_id',r.id,'period',r.period,'transaction_nsu',p_transaction_nsu,'invoice_slug',p_invoice_slug,'renewal','manual','period_starts_at',starts)) RETURNING id INTO sid;
 UPDATE public.infinitepay_orders SET status='paid',transaction_nsu=p_transaction_nsu,invoice_slug=p_invoice_slug,subscription_id=sid,paid_at=now() WHERE id=r.id;
 RETURN jsonb_build_object('saved',true,'already_saved',false,'subscription_id',sid,'order_id',r.id,'expires_at',ends);
END $$;
REVOKE ALL ON FUNCTION public.fn_prepare_infinitepay_order(uuid,text,uuid),public.fn_attach_infinitepay_link(uuid,text),public.fn_confirm_infinitepay_order(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_prepare_infinitepay_order(uuid,text,uuid),public.fn_attach_infinitepay_link(uuid,text),public.fn_confirm_infinitepay_order(uuid,text,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
