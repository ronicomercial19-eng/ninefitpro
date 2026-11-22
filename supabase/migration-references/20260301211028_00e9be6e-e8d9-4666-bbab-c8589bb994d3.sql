
-- FASE 1: Allow athletes to UPDATE their own record (fixes first-access loop)
CREATE POLICY "Athletes can update own record"
  ON public.athletes
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- FASE 3: Update appointments table to support appointment types
-- The appointments table already exists, let's add appointment_type if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_type text DEFAULT 'aula';
  END IF;
END $$;

-- FASE 4: Create super_sets table
CREATE TABLE IF NOT EXISTS public.super_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  difficulty text DEFAULT 'Básico',
  exercises jsonb DEFAULT '[]'::jsonb,
  exercise_count int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.super_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage super_sets"
  ON public.super_sets FOR ALL
  TO authenticated
  USING (public.is_trainer(auth.uid()))
  WITH CHECK (public.is_trainer(auth.uid()));

-- FASE 4: Create reference_series table
CREATE TABLE IF NOT EXISTS public.reference_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  difficulty text DEFAULT 'Básico',
  exercises jsonb DEFAULT '[]'::jsonb,
  exercise_count int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reference_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage reference_series"
  ON public.reference_series FOR ALL
  TO authenticated
  USING (public.is_trainer(auth.uid()))
  WITH CHECK (public.is_trainer(auth.uid()));
