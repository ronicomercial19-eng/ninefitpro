-- Live /links responses also use a signed encrypted lenc query, not only saved slugs.
CREATE OR REPLACE FUNCTION public.fn_attach_infinitepay_link(p_order_id uuid,p_url text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.infinitepay_orders;
BEGIN
 IF p_url IS NULL OR length(p_url)>8192 OR p_url !~ '^https://checkout\.infinitepay\.io/ronynapoleao(/[A-Za-z0-9_-]+/?|/?\?lenc=[A-Za-z0-9_.-]+)$' THEN RAISE EXCEPTION 'invalid_checkout_url'; END IF;
 SELECT * INTO STRICT r FROM public.infinitepay_orders WHERE id=p_order_id FOR UPDATE;
 IF r.checkout_url IS NULL AND r.status='pending' THEN
  UPDATE public.infinitepay_orders SET checkout_url=p_url,status='ready',create_lease_until=NULL WHERE id=r.id RETURNING * INTO r;
 END IF;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.fn_attach_infinitepay_link(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_attach_infinitepay_link(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
