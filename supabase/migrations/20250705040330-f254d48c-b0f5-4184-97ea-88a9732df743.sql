
-- Create tables for the AI training system

-- Exercise library table with comprehensive attributes
CREATE TABLE public.exercise_library_enhanced (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  technical_description TEXT,
  youtube_embed_url TEXT,
  gif_url TEXT,
  primary_muscle_groups TEXT[] NOT NULL,
  secondary_muscle_groups TEXT[],
  category TEXT NOT NULL, -- 'strength', 'mobility', 'cardio', 'stabilization', etc.
  equipment_needed TEXT[] NOT NULL,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  contraindications TEXT[],
  execution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User fitness profiles with comprehensive data
CREATE TABLE public.user_fitness_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  age INTEGER,
  biological_sex TEXT CHECK (biological_sex IN ('male', 'female')),
  height_cm INTEGER,
  weight_kg NUMERIC,
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  experience_months INTEGER,
  weekly_availability INTEGER CHECK (weekly_availability BETWEEN 1 AND 7),
  session_duration TEXT,
  primary_goals TEXT[] NOT NULL,
  injuries_limitations TEXT,
  preferred_training_types TEXT[],
  available_equipment TEXT[],
  preferred_environments TEXT[],
  preferred_stimuli TEXT[],
  priority_muscle_groups TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Generated workouts with anti-repetition hash
CREATE TABLE public.generated_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_hash TEXT NOT NULL, -- Hash to prevent repetition
  workout_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed BOOLEAN DEFAULT false,
  user_feedback JSONB,
  performance_data JSONB,
  UNIQUE(user_id, workout_hash)
);

-- Workout blocks structure (W-P-A-C-F)
CREATE TABLE public.workout_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.generated_workouts(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('W', 'P', 'A', 'C', 'F')), -- Warmup, Principal, Accessories, Conditioning, Finalization
  block_order INTEGER NOT NULL,
  exercises JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Periodization uploads
CREATE TABLE public.periodization_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  interpreted_data JSONB,
  phases JSONB,
  current_phase INTEGER DEFAULT 1,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Progression tracking
CREATE TABLE public.progression_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id UUID REFERENCES public.generated_workouts(id),
  exercise_name TEXT NOT NULL,
  previous_load NUMERIC,
  current_load NUMERIC,
  progression_type TEXT, -- 'load', 'volume', 'intensity', 'technique'
  progression_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.exercise_library_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fitness_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodization_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Exercise library - public read access
CREATE POLICY "Anyone can view exercises" ON public.exercise_library_enhanced
  FOR SELECT USING (true);

-- User fitness profiles - users can only access their own
CREATE POLICY "Users can manage their own fitness profile" ON public.user_fitness_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Generated workouts - users can only access their own
CREATE POLICY "Users can manage their own workouts" ON public.generated_workouts
  FOR ALL USING (auth.uid() = user_id);

-- Workout blocks - users can only access their own workout blocks
CREATE POLICY "Users can view their own workout blocks" ON public.workout_blocks
  FOR SELECT USING (workout_id IN (
    SELECT id FROM public.generated_workouts WHERE user_id = auth.uid()
  ));

-- Periodization uploads - users can only access their own
CREATE POLICY "Users can manage their own periodization" ON public.periodization_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Progression tracking - users can only access their own
CREATE POLICY "Users can manage their own progression" ON public.progression_tracking
  FOR ALL USING (auth.uid() = user_id);

-- Insert some sample exercises
INSERT INTO public.exercise_library_enhanced (
  name, technical_description, youtube_embed_url, primary_muscle_groups, 
  secondary_muscle_groups, category, equipment_needed, difficulty_level, 
  contraindications, execution_notes
) VALUES 
(
  'Agachamento Livre',
  'Movimento fundamental de agachamento com barra nas costas, trabalhando toda a cadeia posterior e anterior das pernas.',
  'https://www.youtube.com/embed/example1',
  ARRAY['Quadríceps', 'Glúteos'],
  ARRAY['Isquiotibiais', 'Panturrilhas', 'Core'],
  'strength',
  ARRAY['Barra', 'Suporte para barra'],
  'intermediate',
  ARRAY['Lesão no joelho', 'Dor lombar aguda'],
  'Manter coluna neutra, descer até 90 graus no joelho, força nos calcanhares'
),
(
  'Supino Reto',
  'Exercício clássico para desenvolvimento do peitoral maior, deltoides anterior e tríceps.',
  'https://www.youtube.com/embed/example2',
  ARRAY['Peitoral maior'],
  ARRAY['Deltoides anterior', 'Tríceps'],
  'strength',
  ARRAY['Barra', 'Banco'],
  'beginner',
  ARRAY['Lesão no ombro'],
  'Controlar descida, manter ombros retraídos, empurrar com força'
),
(
  'Burpee',
  'Exercício funcional que combina agachamento, prancha e salto vertical.',
  'https://www.youtube.com/embed/example3',
  ARRAY['Corpo inteiro'],
  ARRAY[],
  'conditioning',
  ARRAY['Peso corporal'],
  'intermediate',
  ARRAY['Lesões no punho', 'Problemas cardíacos'],
  'Movimento explosivo, manter core contraído durante todo o exercício'
);
