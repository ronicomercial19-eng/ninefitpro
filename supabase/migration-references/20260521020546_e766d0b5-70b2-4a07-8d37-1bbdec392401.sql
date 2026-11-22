
ALTER TABLE public.student_library_assignments
  ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE INDEX IF NOT EXISTS idx_student_lib_assignments_athlete_completed
  ON public.student_library_assignments (athlete_id, completed_at);
