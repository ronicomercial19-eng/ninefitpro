
-- ============================================================
-- 1. Fix auto-link trigger (function exists, but trigger missing)
-- ============================================================
DROP TRIGGER IF EXISTS trg_auto_link_annual_plan ON public.periodization_annual_plans;

CREATE OR REPLACE FUNCTION public.auto_link_annual_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model_id text;
BEGIN
  v_model_id := COALESCE(NEW.selected_chief_id, NEW.selected_model_id, 'auto-generated');

  INSERT INTO public.athlete_periodizations (
    athlete_id, periodization_model_id, assigned_by, annual_plan_id,
    match_percentage, status, notes, assigned_at
  ) VALUES (
    NEW.athlete_id, v_model_id, NEW.coach_id, NEW.id,
    COALESCE((NEW.scores->>'global')::int, 80),
    'in_progress',
    'Auto-link via annual plan ' || NEW.id::text,
    now()
  )
  ON CONFLICT (annual_plan_id) WHERE annual_plan_id IS NOT NULL
  DO UPDATE SET
    periodization_model_id = EXCLUDED.periodization_model_id,
    match_percentage = EXCLUDED.match_percentage,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'auto_link_annual_plan error: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_link_annual_plan
AFTER INSERT OR UPDATE OF athlete_id, coach_id, selected_chief_id, scores, status
ON public.periodization_annual_plans
FOR EACH ROW EXECUTE FUNCTION public.auto_link_annual_plan();

-- Ensure unique index for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS uniq_athlete_periodizations_annual_plan
  ON public.athlete_periodizations(annual_plan_id) WHERE annual_plan_id IS NOT NULL;

-- ============================================================
-- 2. FitPro Integration tables
-- ============================================================

-- 2.1 Connections (API keys stored as hash)
CREATE TABLE IF NOT EXISTS public.fitpro_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key_hash text NOT NULL UNIQUE,
  api_key_prefix text NOT NULL,
  professor_id uuid,
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitpro_connections TO authenticated;
GRANT ALL ON public.fitpro_connections TO service_role;
ALTER TABLE public.fitpro_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fitpro connections"
  ON public.fitpro_connections FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 2.2 Student mapping (FitPro student ↔ local athlete)
CREATE TABLE IF NOT EXISTS public.fitpro_student_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.fitpro_connections(id) ON DELETE CASCADE,
  fitpro_student_id text NOT NULL,
  fitpro_professor_id text,
  athlete_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE,
  context jsonb DEFAULT '{}'::jsonb,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, fitpro_student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitpro_student_map TO authenticated;
GRANT ALL ON public.fitpro_student_map TO service_role;
ALTER TABLE public.fitpro_student_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fitpro student map"
  ON public.fitpro_student_map FOR ALL
  TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 2.3 Events log
CREATE TABLE IF NOT EXISTS public.fitpro_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.fitpro_connections(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  module text NOT NULL DEFAULT 'SmartPeriodizer',
  fitpro_student_id text,
  fitpro_professor_id text,
  entity_type text,
  entity_id text,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.fitpro_events TO authenticated;
GRANT ALL ON public.fitpro_events TO service_role;
ALTER TABLE public.fitpro_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view fitpro events"
  ON public.fitpro_events FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated can insert fitpro events"
  ON public.fitpro_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fitpro_events_created ON public.fitpro_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitpro_events_type ON public.fitpro_events(event_type);
;
