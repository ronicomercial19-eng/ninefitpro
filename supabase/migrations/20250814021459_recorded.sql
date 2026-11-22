-- Create athletes table for the student management
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  birthdate DATE,
  sessions_per_week INTEGER,
  coach_id UUID REFERENCES auth.users(id),
  goals TEXT[],
  training_level TEXT,
  injuries TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Create policies for athletes
CREATE POLICY "Users can view their athletes" 
ON public.athletes 
FOR SELECT 
USING (auth.uid() = coach_id);

CREATE POLICY "Users can create athletes" 
ON public.athletes 
FOR INSERT 
WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Users can update their athletes" 
ON public.athletes 
FOR UPDATE 
USING (auth.uid() = coach_id);

CREATE POLICY "Users can delete their athletes" 
ON public.athletes 
FOR DELETE 
USING (auth.uid() = coach_id);;
