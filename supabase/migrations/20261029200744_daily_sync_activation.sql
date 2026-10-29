-- Daily Sync is effective immediately; canonical functions require today's check-in
-- in America/Sao_Paulo and preserve consent, coach locks and started sessions.
ALTER TABLE public.readiness_rule_sets ALTER COLUMN apply_after SET DEFAULT now();
UPDATE public.readiness_rule_sets SET apply_after=least(apply_after,now()) WHERE active;
