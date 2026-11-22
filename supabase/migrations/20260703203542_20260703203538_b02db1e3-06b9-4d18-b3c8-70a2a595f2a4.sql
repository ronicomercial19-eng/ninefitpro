
CREATE TABLE IF NOT EXISTS public.fitpro_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  plano_id UUID,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'unknown',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','retrying')),
  attempt_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fitpro_delivery_log TO authenticated;
GRANT ALL ON public.fitpro_delivery_log TO service_role;

ALTER TABLE public.fitpro_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professor le logs de seus atletas"
ON public.fitpro_delivery_log FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.alunos a WHERE a.id = fitpro_delivery_log.athlete_id AND a.professor_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.athletes ath WHERE ath.id = fitpro_delivery_log.athlete_id AND ath.coach_id = auth.uid())
);

CREATE POLICY "Service role gerencia logs"
ON public.fitpro_delivery_log FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fitpro_delivery_log_athlete ON public.fitpro_delivery_log(athlete_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_fitpro_delivery_log_status ON public.fitpro_delivery_log(status, next_retry_at);

CREATE OR REPLACE FUNCTION public.update_fitpro_delivery_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fitpro_delivery_log_updated_at ON public.fitpro_delivery_log;
CREATE TRIGGER trg_fitpro_delivery_log_updated_at
BEFORE UPDATE ON public.fitpro_delivery_log
FOR EACH ROW EXECUTE FUNCTION public.update_fitpro_delivery_log_updated_at();
;
