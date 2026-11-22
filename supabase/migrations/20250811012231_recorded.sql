-- Ensure required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Athletes table
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL,
  name TEXT NOT NULL,
  birthdate DATE,
  training_level TEXT,
  goals TEXT[],
  injuries TEXT[],
  sessions_per_week INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_athletes_coach FOREIGN KEY (coach_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Enable RLS for athletes
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Policies for athletes (coach owns their athletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Athletes select own'
  ) THEN
    CREATE POLICY "Athletes select own" ON public.athletes
    FOR SELECT TO authenticated
    USING (coach_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Athletes insert own'
  ) THEN
    CREATE POLICY "Athletes insert own" ON public.athletes
    FOR INSERT TO authenticated
    WITH CHECK (coach_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Athletes update own'
  ) THEN
    CREATE POLICY "Athletes update own" ON public.athletes
    FOR UPDATE TO authenticated
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='athletes' AND policyname='Athletes delete own'
  ) THEN
    CREATE POLICY "Athletes delete own" ON public.athletes
    FOR DELETE TO authenticated
    USING (coach_id = auth.uid());
  END IF;
END $$;

-- Plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  periodization_id UUID NOT NULL,
  start_date DATE NOT NULL,
  filled_variables JSONB DEFAULT '{}'::jsonb,
  generated_html TEXT,
  status TEXT DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_plans_athlete FOREIGN KEY (athlete_id) REFERENCES public.athletes(id) ON DELETE CASCADE,
  CONSTRAINT fk_plans_periodization FOREIGN KEY (periodization_id) REFERENCES public.periodizations(id) ON DELETE RESTRICT
);

-- Enable RLS for plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Policies for plans (coach can manage plans for their athletes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='Plans select by coach'
  ) THEN
    CREATE POLICY "Plans select by coach" ON public.plans
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='Plans insert by coach'
  ) THEN
    CREATE POLICY "Plans insert by coach" ON public.plans
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='Plans update by coach'
  ) THEN
    CREATE POLICY "Plans update by coach" ON public.plans
    FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()
    ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='plans' AND policyname='Plans delete by coach'
  ) THEN
    CREATE POLICY "Plans delete by coach" ON public.plans
    FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.athletes a WHERE a.id = plans.athlete_id AND a.coach_id = auth.uid()
    ));
  END IF;
END $$;

-- System health table
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Restrict system_health to service role only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_health' AND policyname='system_health service read'
  ) THEN
    CREATE POLICY "system_health service read" ON public.system_health
    FOR SELECT TO authenticated
    USING (auth.role() = 'service_role');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='system_health' AND policyname='system_health service write'
  ) THEN
    CREATE POLICY "system_health service write" ON public.system_health
    FOR ALL TO authenticated
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- Add columns to periodizations
ALTER TABLE public.periodizations
  ADD COLUMN IF NOT EXISTS recommended_for JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS graph_data JSONB DEFAULT '[]'::jsonb;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_athletes_updated_at ON public.athletes;
CREATE TRIGGER set_athletes_updated_at
BEFORE UPDATE ON public.athletes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_plans_updated_at ON public.plans;
CREATE TRIGGER set_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_system_health_updated_at ON public.system_health;
CREATE TRIGGER set_system_health_updated_at
BEFORE UPDATE ON public.system_health
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for plan PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('plans-pdfs', 'plans-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for plans-pdfs bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Read own plan PDFs'
  ) THEN
    CREATE POLICY "Read own plan PDFs"
    ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'plans-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Upload own plan PDFs'
  ) THEN
    CREATE POLICY "Upload own plan PDFs"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'plans-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Update own plan PDFs'
  ) THEN
    CREATE POLICY "Update own plan PDFs"
    ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'plans-pdfs' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'plans-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Delete own plan PDFs'
  ) THEN
    CREATE POLICY "Delete own plan PDFs"
    ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'plans-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;;
