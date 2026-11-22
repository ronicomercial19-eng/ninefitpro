-- Daily Sync is effective immediately; eligibility remains scoped to today's check-in
-- in America/Sao_Paulo by the existing canonical functions and execution guards.
ALTER TABLE public.readiness_rule_sets ALTER COLUMN apply_after SET DEFAULT now();
UPDATE public.readiness_rule_sets SET apply_after=least(apply_after,now()) WHERE active;
;
