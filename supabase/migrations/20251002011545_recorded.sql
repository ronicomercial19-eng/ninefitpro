-- Ensure athletes table exists with correct structure
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  birthdate DATE,
  gender TEXT,
  experience_level TEXT,
  primary_goal TEXT,
  training_environment TEXT,
  weekly_frequency INTEGER,
  session_duration TEXT,
  injuries_limitations TEXT,
  status TEXT DEFAULT 'active',
  invitation_token TEXT,
  invitation_sent_at TIMESTAMPTZ,
  anamnesis_completed BOOLEAN DEFAULT false,
  anamnesis_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Professors can manage their students" ON public.athletes;
DROP POLICY IF EXISTS "Admins can manage all athletes" ON public.athletes;
DROP POLICY IF EXISTS "Athletes can view their own data" ON public.athletes;
DROP POLICY IF EXISTS "Coaches can manage their students" ON public.athletes;
DROP POLICY IF EXISTS "Athletes can view own data" ON public.athletes;

-- Create new policies that work correctly
-- Professors/coaches can manage their own students
CREATE POLICY "Coaches can manage their students"
ON public.athletes
FOR ALL
USING (coach_id = auth.uid())
WITH CHECK (coach_id = auth.uid());

-- Admins can manage all athletes
CREATE POLICY "Admins can manage all athletes"
ON public.athletes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create trigger for updated_at if not exists
CREATE OR REPLACE FUNCTION public.update_athletes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_athletes_updated_at ON public.athletes;
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_athletes_updated_at();;
