-- Fix the student management flow - Part 1: Update athletes table structure

-- Update athletes table to have better structure
ALTER TABLE public.athletes 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS experience_level TEXT DEFAULT 'iniciante',
ADD COLUMN IF NOT EXISTS primary_goal TEXT,
ADD COLUMN IF NOT EXISTS training_environment TEXT DEFAULT 'academia',
ADD COLUMN IF NOT EXISTS weekly_frequency INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS session_duration TEXT DEFAULT '60min+',
ADD COLUMN IF NOT EXISTS injuries_limitations TEXT,
ADD COLUMN IF NOT EXISTS invitation_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS invitation_token TEXT,
ADD COLUMN IF NOT EXISTS activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policies for athletes to allow admin management
DROP POLICY IF EXISTS "Users can manage their assigned athletes" ON public.athletes;

CREATE POLICY "Admins can manage all athletes" 
ON public.athletes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR coach_id = auth.uid()
  OR user_id = auth.uid()
);

-- Create table for athlete-periodization assignments
CREATE TABLE IF NOT EXISTS public.athlete_periodizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    athlete_id UUID REFERENCES public.athletes(id) ON DELETE CASCADE,
    periodization_model_id TEXT NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    match_percentage INTEGER,
    match_factors JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.athlete_periodizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage athlete periodizations" 
ON public.athlete_periodizations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'admin'
  )
  OR assigned_by = auth.uid()
);;
