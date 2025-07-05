
-- Create the strength_records table that the code is expecting
CREATE TABLE public.strength_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  weight_kg NUMERIC NOT NULL,
  reps INTEGER NOT NULL DEFAULT 1,
  sets INTEGER NOT NULL DEFAULT 1,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strength_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own strength records"
  ON public.strength_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strength records"
  ON public.strength_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strength records"
  ON public.strength_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add missing columns to user_metrics table
ALTER TABLE public.user_metrics ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.user_metrics ADD COLUMN IF NOT EXISTS test_date DATE;
