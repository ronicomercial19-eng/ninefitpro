SET LOCAL lock_timeout='2s';
CREATE FUNCTION private.fitpro_complete_verified_candidates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE private.fitpro_payment_candidates SET state='complete',last_error=NULL
 WHERE order_id=NEW.id AND transaction_nsu=NEW.transaction_nsu AND invoice_slug=NEW.invoice_slug AND state<>'complete';
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.fitpro_complete_verified_candidates() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER fitpro_complete_verified_candidates
 AFTER UPDATE OF status,transaction_nsu,invoice_slug ON public.infinitepay_orders
 FOR EACH ROW WHEN(NEW.status='paid') EXECUTE FUNCTION private.fitpro_complete_verified_candidates();
-- Clear only exact references already backed by the canonical verified order.
UPDATE private.fitpro_payment_candidates q SET state='complete',last_error=NULL
FROM public.infinitepay_orders o
WHERE o.id=q.order_id AND o.status='paid' AND o.transaction_nsu=q.transaction_nsu AND o.invoice_slug=q.invoice_slug AND q.state<>'complete';
