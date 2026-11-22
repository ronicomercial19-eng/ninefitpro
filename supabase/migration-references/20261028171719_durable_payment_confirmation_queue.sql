SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
-- These references are candidates, never proof of payment or permission to enter.
CREATE TABLE private.fitpro_payment_candidates (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES public.infinitepay_orders(id) ON DELETE CASCADE,
 transaction_nsu text NOT NULL CHECK(transaction_nsu ~ '^[A-Za-z0-9_-]{1,160}$'),
 invoice_slug text NOT NULL CHECK(invoice_slug ~ '^[A-Za-z0-9_-]{1,160}$'),
 state text NOT NULL DEFAULT 'waiting' CHECK(state IN('waiting','retry','complete','attention')),
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_attempt_at timestamptz,last_error text,
 UNIQUE(order_id,transaction_nsu,invoice_slug)
);
CREATE INDEX fitpro_payment_candidates_due ON private.fitpro_payment_candidates(next_attempt_at,id) WHERE state IN('waiting','retry');
ALTER TABLE private.fitpro_payment_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.fitpro_payment_candidates FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.fn_fitpro_stage_payment_candidate(p_order_id uuid,p_transaction_nsu text,p_invoice_slug text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_transaction_nsu IS NULL OR p_transaction_nsu !~ '^[A-Za-z0-9_-]{1,160}$' OR p_invoice_slug IS NULL OR p_invoice_slug !~ '^[A-Za-z0-9_-]{1,160}$' THEN RAISE EXCEPTION 'invalid_payment_reference';END IF;
 -- Serialize the per-order bound, including concurrent webhook deliveries.
 PERFORM pg_advisory_xact_lock(hashtextextended('fitpro-payment-candidate:'||p_order_id::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.infinitepay_orders WHERE id=p_order_id) THEN RETURN false;END IF;
 IF EXISTS(SELECT 1 FROM private.fitpro_payment_candidates WHERE order_id=p_order_id AND transaction_nsu=p_transaction_nsu AND invoice_slug=p_invoice_slug) THEN RETURN true;END IF;
 IF (SELECT count(*) FROM private.fitpro_payment_candidates WHERE order_id=p_order_id)>=16 THEN RETURN false;END IF;
 INSERT INTO private.fitpro_payment_candidates(order_id,transaction_nsu,invoice_slug)VALUES(p_order_id,p_transaction_nsu,p_invoice_slug);
 RETURN true;
END $$;

CREATE FUNCTION public.fn_fitpro_claim_payment_candidates(p_limit integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE rows jsonb;
BEGIN
 UPDATE private.fitpro_payment_candidates SET state='attention',last_error='confirmation_retry_exhausted' WHERE state IN('waiting','retry') AND(attempts>=60 OR created_at<now()-interval '30 days') AND next_attempt_at<=now();
 WITH due AS(SELECT id FROM private.fitpro_payment_candidates WHERE state IN('waiting','retry') AND next_attempt_at<=now() ORDER BY next_attempt_at,id LIMIT least(greatest(p_limit,1),10) FOR UPDATE SKIP LOCKED),
 claimed AS(UPDATE private.fitpro_payment_candidates q SET next_attempt_at=now()+interval '10 minutes',last_attempt_at=now(),attempts=q.attempts+1 FROM due WHERE q.id=due.id RETURNING q.*)
 SELECT coalesce(jsonb_agg(jsonb_build_object('candidate_id',id,'id',order_id,'transaction_nsu',transaction_nsu,'invoice_slug',invoice_slug)),'[]') INTO rows FROM claimed;
 RETURN rows;
END $$;

CREATE FUNCTION public.fn_fitpro_finish_payment_candidate(p_candidate_id bigint,p_complete boolean,p_failed boolean DEFAULT false)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE private.fitpro_payment_candidates SET
 state=CASE WHEN p_complete THEN 'complete' WHEN attempts>=60 OR created_at<now()-interval '30 days' THEN 'attention' ELSE 'retry' END,
 next_attempt_at=CASE WHEN p_complete THEN next_attempt_at ELSE now()+make_interval(secs=>least(21600,60*power(2,least(attempts,9)))::integer) END,
 last_error=CASE WHEN p_complete THEN NULL WHEN p_failed THEN 'verification_unavailable' ELSE 'payment_not_confirmed' END
 WHERE id=p_candidate_id AND state IN('waiting','retry');
$$;
REVOKE ALL ON FUNCTION public.fn_fitpro_stage_payment_candidate(uuid,text,text),public.fn_fitpro_claim_payment_candidates(integer),public.fn_fitpro_finish_payment_candidate(bigint,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fitpro_stage_payment_candidate(uuid,text,text),public.fn_fitpro_claim_payment_candidates(integer),public.fn_fitpro_finish_payment_candidate(bigint,boolean,boolean) TO service_role;

-- Preserve the existing admin guard, role checks and paged account list.
DO $migration$
DECLARE body text;
BEGIN
 body:=pg_get_functiondef('private.fn_fitpro_billing_overview(integer,integer)'::regprocedure);
 IF position('''pending_payments''' IN body)=0 THEN
  body:=replace(body,'''manual_reviews'',', $new$'pending_payments',(SELECT jsonb_build_object('waiting',count(*) FILTER(WHERE state IN('waiting','retry')),'attention',count(*) FILTER(WHERE state='attention'),'oldest',min(created_at) FILTER(WHERE state IN('waiting','retry')),'items',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM(SELECT q.order_id,p.full_name,q.state,q.attempts,q.last_attempt_at,q.next_attempt_at FROM private.fitpro_payment_candidates q JOIN public.infinitepay_orders o ON o.id=q.order_id LEFT JOIN public.profiles p ON p.user_id=o.user_id WHERE q.state<>'complete' ORDER BY(q.state='attention') DESC,q.created_at LIMIT 25)x)) FROM private.fitpro_payment_candidates),'manual_reviews',$new$);
  EXECUTE body;
 END IF;
END $migration$;
NOTIFY pgrst,'reload schema';
