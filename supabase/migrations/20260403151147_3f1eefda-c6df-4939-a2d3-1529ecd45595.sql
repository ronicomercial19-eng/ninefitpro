
-- Table: nutrition_logs
CREATE TABLE public.nutrition_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_name TEXT NOT NULL,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_nutrition_logs_athlete_date ON public.nutrition_logs(athlete_id, date);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Athletes see own logs
CREATE POLICY "Athletes view own nutrition logs"
  ON public.nutrition_logs FOR SELECT
  TO authenticated
  USING (
    athlete_id IN (
      SELECT a.id FROM public.athletes a
      WHERE a.user_id = (SELECT auth.uid())
    )
    OR
    athlete_id IN (
      SELECT al.athlete_id FROM public.athlete_auth_link al
      WHERE al.user_id = (SELECT auth.uid())
    )
    OR
    public.is_trainer((SELECT auth.uid()))
  );

CREATE POLICY "Athletes insert own nutrition logs"
  ON public.nutrition_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    athlete_id IN (
      SELECT a.id FROM public.athletes a
      WHERE a.user_id = (SELECT auth.uid())
    )
    OR
    athlete_id IN (
      SELECT al.athlete_id FROM public.athlete_auth_link al
      WHERE al.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Athletes delete own nutrition logs"
  ON public.nutrition_logs FOR DELETE
  TO authenticated
  USING (
    athlete_id IN (
      SELECT a.id FROM public.athletes a
      WHERE a.user_id = (SELECT auth.uid())
    )
    OR
    athlete_id IN (
      SELECT al.athlete_id FROM public.athlete_auth_link al
      WHERE al.user_id = (SELECT auth.uid())
    )
  );

-- Table: user_memory
CREATE TABLE public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(athlete_id, key)
);

CREATE INDEX idx_user_memory_athlete ON public.user_memory(athlete_id);

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes manage own memory"
  ON public.user_memory FOR ALL
  TO authenticated
  USING (
    athlete_id IN (
      SELECT a.id FROM public.athletes a
      WHERE a.user_id = (SELECT auth.uid())
    )
    OR
    athlete_id IN (
      SELECT al.athlete_id FROM public.athlete_auth_link al
      WHERE al.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    athlete_id IN (
      SELECT a.id FROM public.athletes a
      WHERE a.user_id = (SELECT auth.uid())
    )
    OR
    athlete_id IN (
      SELECT al.athlete_id FROM public.athlete_auth_link al
      WHERE al.user_id = (SELECT auth.uid())
    )
  );

-- Trigger for user_memory updated_at
CREATE TRIGGER update_user_memory_updated_at
  BEFORE UPDATE ON public.user_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
