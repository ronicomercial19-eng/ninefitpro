-- Persist player position for HealthFlix content so athletes can resume on any device.
ALTER TABLE public.healthflix_progress
  ADD COLUMN IF NOT EXISTS last_position_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS watched_seconds integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'healthflix_progress_position_nonnegative') THEN
    ALTER TABLE public.healthflix_progress ADD CONSTRAINT healthflix_progress_position_nonnegative
      CHECK (last_position_seconds >= 0 AND duration_seconds >= 0 AND watched_seconds >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_healthflix_progress_athlete_recent
  ON public.healthflix_progress (athlete_id, last_event_at DESC);
