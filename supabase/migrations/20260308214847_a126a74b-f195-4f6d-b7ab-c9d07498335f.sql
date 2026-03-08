
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;

-- Add missing columns to workout_progress
ALTER TABLE public.workout_progress 
ADD COLUMN IF NOT EXISTS training_name text,
ADD COLUMN IF NOT EXISTS completed_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS calories_burned integer DEFAULT 0;

-- RLS policies using correct column name (aluno_id)
DROP POLICY IF EXISTS "Athletes can view own progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Athletes can insert own progress" ON public.workout_progress;
DROP POLICY IF EXISTS "Coaches can view athlete progress" ON public.workout_progress;

CREATE POLICY "Athletes can view own progress" ON public.workout_progress
  FOR SELECT TO authenticated
  USING (aluno_id IN (SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()));

CREATE POLICY "Athletes can insert own progress" ON public.workout_progress
  FOR INSERT TO authenticated
  WITH CHECK (aluno_id IN (SELECT a.id FROM public.athletes a WHERE a.user_id = auth.uid()));

CREATE POLICY "Coaches can view athlete progress" ON public.workout_progress
  FOR SELECT TO authenticated
  USING (aluno_id IN (SELECT a.id FROM public.athletes a WHERE a.coach_id = auth.uid()));
