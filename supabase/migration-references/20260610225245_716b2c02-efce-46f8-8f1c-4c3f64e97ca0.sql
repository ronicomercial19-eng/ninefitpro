
-- BLOCO 1: Engine XP/Progresso unificada

-- 1) Consolidate xp_total -> total_xp on athletes
UPDATE public.athletes
SET total_xp = COALESCE(total_xp, 0) + COALESCE(xp_total, 0)
WHERE xp_total IS NOT NULL AND xp_total > 0;

COMMENT ON COLUMN public.athletes.xp_total IS 'DEPRECATED: use total_xp. Mantido apenas para compat de leitura.';

-- 2) Backfill workout_progress.athlete_id (already exists)
UPDATE public.workout_progress wp
SET athlete_id = a.id
FROM public.athletes a
WHERE wp.athlete_id IS NULL
  AND wp.aluno_id IS NOT NULL
  AND (a.user_id = wp.aluno_id OR a.id = wp.aluno_id);

-- Log unmatched
CREATE TABLE IF NOT EXISTS public.migration_unmatched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  reason text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.migration_unmatched TO authenticated;
GRANT ALL ON public.migration_unmatched TO service_role;
ALTER TABLE public.migration_unmatched ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_migration_unmatched" ON public.migration_unmatched;
CREATE POLICY "service_role_all_migration_unmatched" ON public.migration_unmatched
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.migration_unmatched (source_table, source_id, reason, payload)
SELECT 'workout_progress', wp.id, 'no athlete match for aluno_id',
       jsonb_build_object('aluno_id', wp.aluno_id, 'date', wp.date)
FROM public.workout_progress wp
WHERE wp.athlete_id IS NULL AND wp.aluno_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3) Add athlete_id to user_credits / user_plans / user_achievements + backfill
ALTER TABLE public.user_credits     ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE;
ALTER TABLE public.user_plans       ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE;

UPDATE public.user_credits uc SET athlete_id = a.id
FROM public.athletes a
WHERE uc.athlete_id IS NULL AND uc.user_email IS NOT NULL AND lower(a.email) = lower(uc.user_email);

UPDATE public.user_plans up SET athlete_id = a.id
FROM public.athletes a
WHERE up.athlete_id IS NULL AND up.user_email IS NOT NULL AND lower(a.email) = lower(up.user_email);

UPDATE public.user_achievements ua SET athlete_id = a.id
FROM public.athletes a
WHERE ua.athlete_id IS NULL AND ua.user_email IS NOT NULL AND lower(a.email) = lower(ua.user_email);

CREATE INDEX IF NOT EXISTS idx_user_credits_athlete_id ON public.user_credits(athlete_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_athlete_id ON public.user_plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_athlete_id ON public.user_achievements(athlete_id);

-- 4) fn_award_xp: única porta de entrada de XP
CREATE OR REPLACE FUNCTION public.fn_award_xp(
  p_athlete_id uuid,
  p_amount integer,
  p_source text DEFAULT 'unknown',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_total_xp integer, new_level integer, leveled_up boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_xp int;
  v_prev_level int;
  v_new_xp int;
  v_new_level int;
BEGIN
  IF p_athlete_id IS NULL OR p_amount IS NULL OR p_amount = 0 THEN
    RETURN;
  END IF;

  SELECT COALESCE(total_xp,0), COALESCE(level,1)
    INTO v_prev_xp, v_prev_level
  FROM public.athletes WHERE id = p_athlete_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'athlete % not found', p_athlete_id;
  END IF;

  v_new_xp := GREATEST(0, v_prev_xp + p_amount);
  v_new_level := GREATEST(1, floor(v_new_xp::numeric / 1000)::int + 1);

  UPDATE public.athletes
     SET total_xp = v_new_xp,
         level    = v_new_level,
         updated_at = now()
   WHERE id = p_athlete_id;

  BEGIN
    INSERT INTO public.system_events(event_type, entity_type, entity_id, actor_id, metadata)
    VALUES ('xp_awarded'::text::any_event_type_placeholder, 'athlete', p_athlete_id, p_athlete_id,
            jsonb_build_object('amount', p_amount, 'source', p_source, 'meta', p_metadata,
                               'new_total_xp', v_new_xp, 'new_level', v_new_level));
  EXCEPTION WHEN others THEN
    -- system_events.event_type pode ser enum restrito; ignora se não couber
    NULL;
  END;

  RETURN QUERY SELECT v_new_xp, v_new_level, (v_new_level > v_prev_level);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_award_xp(uuid,integer,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_award_xp(uuid,integer,text,jsonb) TO authenticated, service_role;

-- 5) View status unificada
DROP VIEW IF EXISTS public.vw_athlete_status;
CREATE VIEW public.vw_athlete_status
WITH (security_invoker = true)
AS
SELECT
  a.id AS athlete_id,
  a.user_id,
  a.email,
  a.name,
  COALESCE(a.total_xp, 0) AS total_xp,
  COALESCE(a.level, 1) AS level,
  COALESCE(a.sync_score, 0) AS sync_score,
  (SELECT bool_or(up.is_active)
     FROM public.user_plans up
    WHERE up.athlete_id = a.id OR lower(up.user_email) = lower(a.email)) AS plan_active,
  (SELECT up.plan_name FROM public.user_plans up
    WHERE (up.athlete_id = a.id OR lower(up.user_email) = lower(a.email)) AND up.is_active = true
    ORDER BY up.started_at DESC NULLS LAST LIMIT 1) AS plan_name,
  (SELECT COALESCE(SUM(uc.credits_remaining),0) FROM public.user_credits uc
    WHERE uc.athlete_id = a.id OR lower(uc.user_email) = lower(a.email)) AS credits_remaining
FROM public.athletes a;

GRANT SELECT ON public.vw_athlete_status TO authenticated, service_role;
