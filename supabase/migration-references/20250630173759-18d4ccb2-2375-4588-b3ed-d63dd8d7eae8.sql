
-- Tabela para avaliações físicas
CREATE TABLE public.physical_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  professor_id UUID REFERENCES auth.users NOT NULL,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Resistência muscular localizada - ANTES
  upper_pull_before INTEGER,
  upper_push_before INTEGER,
  lower_pull_before INTEGER,
  lower_push_before INTEGER,
  core_resistance_before INTEGER,
  
  -- Resistência muscular localizada - DEPOIS
  upper_pull_after INTEGER,
  upper_push_after INTEGER,
  lower_pull_after INTEGER,
  lower_push_after INTEGER,
  core_resistance_after INTEGER,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para agendamentos de treino
CREATE TABLE public.workout_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  professor_id UUID REFERENCES auth.users,
  workout_plan_id UUID,
  title TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- 'weekly', 'daily', etc.
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para periodizações
CREATE TABLE public.periodizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  professor_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT, -- 'pdf', 'image', 'form'
  periodization_data JSONB, -- dados estruturados da periodização
  current_phase TEXT,
  total_phases INTEGER,
  phase_duration_weeks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para perfis de usuário com tipo (professor/aluno)
CREATE TABLE public.user_profiles_extended (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  user_type TEXT NOT NULL DEFAULT 'student', -- 'student', 'professor', 'admin'
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  height NUMERIC,
  weight NUMERIC,
  gender TEXT,
  experience_level TEXT,
  primary_goal TEXT,
  training_environment TEXT,
  injuries_limitations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_extended ENABLE ROW LEVEL SECURITY;

-- Policies para physical_assessments
CREATE POLICY "Users can view their own assessments" 
  ON public.physical_assessments 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = professor_id);

CREATE POLICY "Professors can create assessments" 
  ON public.physical_assessments 
  FOR INSERT 
  WITH CHECK (auth.uid() = professor_id);

CREATE POLICY "Professors can update assessments" 
  ON public.physical_assessments 
  FOR UPDATE 
  USING (auth.uid() = professor_id);

-- Policies para workout_schedules
CREATE POLICY "Users can view their own schedules" 
  ON public.workout_schedules 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = professor_id);

CREATE POLICY "Users can create their own schedules" 
  ON public.workout_schedules 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR auth.uid() = professor_id);

CREATE POLICY "Users can update their own schedules" 
  ON public.workout_schedules 
  FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = professor_id);

-- Policies para periodizations
CREATE POLICY "Users can view their own periodizations" 
  ON public.periodizations 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = professor_id);

CREATE POLICY "Professors can create periodizations" 
  ON public.periodizations 
  FOR INSERT 
  WITH CHECK (auth.uid() = professor_id);

CREATE POLICY "Professors can update periodizations" 
  ON public.periodizations 
  FOR UPDATE 
  USING (auth.uid() = professor_id);

-- Policies para user_profiles_extended
CREATE POLICY "Users can view their own extended profile" 
  ON public.user_profiles_extended 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own extended profile" 
  ON public.user_profiles_extended 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own extended profile" 
  ON public.user_profiles_extended 
  FOR UPDATE 
  USING (auth.uid() = user_id);
