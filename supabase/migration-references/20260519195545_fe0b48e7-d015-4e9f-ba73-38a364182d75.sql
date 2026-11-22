
-- ============================================
-- WAVE 2: Library Protocol Delivery
-- ============================================
ALTER TABLE public.student_library_assignments
  ADD COLUMN IF NOT EXISTS progress_pct numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_sla_athlete_status
  ON public.student_library_assignments(athlete_id, status);

ALTER TABLE public.student_library_assignments ENABLE ROW LEVEL SECURITY;

-- Drop & recreate policies idempotently
DROP POLICY IF EXISTS "Athlete reads own assignments" ON public.student_library_assignments;
DROP POLICY IF EXISTS "Coach manages assignments" ON public.student_library_assignments;
DROP POLICY IF EXISTS "Athlete updates own assignments" ON public.student_library_assignments;

CREATE POLICY "Athlete reads own assignments"
ON public.student_library_assignments
FOR SELECT
TO authenticated
USING (
  athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
    UNION
    SELECT athlete_id FROM public.athlete_auth_link WHERE user_id = auth.uid()
  )
  OR assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
);

CREATE POLICY "Athlete updates own assignments"
ON public.student_library_assignments
FOR UPDATE
TO authenticated
USING (
  athlete_id IN (
    SELECT id FROM public.athletes WHERE user_id = auth.uid()
    UNION
    SELECT athlete_id FROM public.athlete_auth_link WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Coach manages assignments"
ON public.student_library_assignments
FOR ALL
TO authenticated
USING (
  assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
)
WITH CHECK (
  assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
);

-- Realtime
ALTER TABLE public.student_library_assignments REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'student_library_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_library_assignments;
  END IF;
END $$;
