-- 1. content_type em student_training_assignments
ALTER TABLE public.student_training_assignments 
  ADD COLUMN IF NOT EXISTS content_type TEXT;

-- 2. Periodização
ALTER TABLE public.student_training_assignments
  ADD COLUMN IF NOT EXISTS periodization_html TEXT,
  ADD COLUMN IF NOT EXISTS periodization_file_url TEXT;

-- 3. workout_exercises extras
ALTER TABLE public.workout_exercises
  ADD COLUMN IF NOT EXISTS training_day SMALLINT,
  ADD COLUMN IF NOT EXISTS observations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS override_locked BOOLEAN DEFAULT FALSE;

-- 4. user_assessments
CREATE TABLE IF NOT EXISTS public.user_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see own assessments" ON public.user_assessments;
CREATE POLICY "users see own assessments" ON public.user_assessments
  FOR SELECT USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "users insert own assessments" ON public.user_assessments;
CREATE POLICY "users insert own assessments" ON public.user_assessments
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- 5. user_interactions
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users insert own interactions" ON public.user_interactions;
CREATE POLICY "users insert own interactions" ON public.user_interactions
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "users see own interactions" ON public.user_interactions;
CREATE POLICY "users see own interactions" ON public.user_interactions
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user 
  ON public.user_interactions(user_id, created_at DESC);

-- 6. templates
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  content JSONB,
  usage_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "professors view templates" ON public.templates;
CREATE POLICY "professors view templates" ON public.templates
  FOR SELECT USING (public.is_professor((select auth.uid())));
DROP POLICY IF EXISTS "professors insert templates" ON public.templates;
CREATE POLICY "professors insert templates" ON public.templates
  FOR INSERT WITH CHECK (public.is_professor((select auth.uid())) AND created_by = (select auth.uid()));
DROP POLICY IF EXISTS "owners update templates" ON public.templates;
CREATE POLICY "owners update templates" ON public.templates
  FOR UPDATE USING (created_by = (select auth.uid()));