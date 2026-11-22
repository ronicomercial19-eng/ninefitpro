-- Macro 04: nutrition adherence is an optional, athlete-declared property of
-- the existing meal log. NULL preserves legacy/unclassified records.
ALTER TABLE public.nutrition_logs
  ADD COLUMN IF NOT EXISTS adherence_status text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.nutrition_logs'::regclass
      AND conname = 'nutrition_logs_adherence_status_check'
  ) THEN
    ALTER TABLE public.nutrition_logs
      ADD CONSTRAINT nutrition_logs_adherence_status_check
      CHECK (adherence_status IS NULL OR adherence_status IN ('on_plan', 'off_plan'));
  END IF;
END;
$migration$;

COMMENT ON COLUMN public.nutrition_logs.adherence_status IS
  'Optional meal-plan context self-reported by the athlete; NULL means not classified.';
