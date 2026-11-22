
-- Create comprehensive user profiles table
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  gender TEXT CHECK (gender IN ('masculino', 'feminino', 'outro')),
  experience_level TEXT CHECK (experience_level IN ('iniciante', 'intermediario', 'avancado', 'elite')),
  experience_months INTEGER,
  technique_knowledge INTEGER CHECK (technique_knowledge >= 1 AND technique_knowledge <= 5),
  primary_goal TEXT CHECK (primary_goal IN ('hipertrofia', 'emagrecimento', 'forca_maxima', 'performance_atletica', 'saude_qualidade_vida')),
  training_environment TEXT CHECK (training_environment IN ('academia_completa', 'casa_equipamentos', 'peso_corporal')),
  weekly_frequency INTEGER CHECK (weekly_frequency >= 2 AND weekly_frequency <= 6),
  session_duration TEXT CHECK (session_duration IN ('45min', '60min', '90min_plus')),
  injuries_limitations TEXT,
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create periodization plans table
CREATE TABLE public.periodization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  periodization_type TEXT CHECK (periodization_type IN ('linear', 'ondulatoria', 'blocos', 'conjugada')),
  macrocycle_duration_weeks INTEGER,
  total_phases INTEGER,
  current_phase INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create detailed training phases table (mesocycles)
CREATE TABLE public.training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_plan_id UUID REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  phase_type TEXT CHECK (phase_type IN ('adaptacao_anatomica', 'hipertrofia', 'forca_maxima', 'transicao', 'acumulacao', 'intensificacao', 'realizacao')),
  duration_weeks INTEGER NOT NULL,
  objective TEXT NOT NULL,
  volume_level TEXT CHECK (volume_level IN ('muito_baixo', 'baixo', 'moderado', 'alto', 'muito_alto')),
  intensity_level TEXT CHECK (intensity_level IN ('muito_baixa', 'baixa', 'moderada', 'alta', 'muito_alta')),
  sets_range TEXT NOT NULL,
  reps_range TEXT NOT NULL,
  rest_periods_seconds TEXT NOT NULL,
  load_percentage TEXT NOT NULL,
  scientific_rationale TEXT,
  key_adaptations TEXT[],
  monitoring_markers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create weekly structure templates (microcycles)
CREATE TABLE public.weekly_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_phase_id UUID REFERENCES public.training_phases(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  structure_name TEXT NOT NULL,
  training_days_per_week INTEGER,
  split_type TEXT CHECK (split_type IN ('full_body', 'upper_lower', 'push_pull_legs', 'bro_split', 'abc')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily workouts table
CREATE TABLE public.daily_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_structure_id UUID REFERENCES public.weekly_structures(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  day_name TEXT NOT NULL,
  focus_muscles TEXT[] NOT NULL,
  workout_type TEXT CHECK (workout_type IN ('strength', 'hypertrophy', 'endurance', 'power', 'recovery')),
  estimated_duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create exercise library table
CREATE TABLE public.exercise_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('peito', 'costas', 'ombros', 'biceps', 'triceps', 'pernas', 'core', 'cardio')),
  muscle_groups TEXT[] NOT NULL,
  equipment_type TEXT CHECK (equipment_type IN ('peso_livre', 'maquina', 'cabo', 'peso_corporal', 'elastico', 'kettlebell')),
  difficulty_level TEXT CHECK (difficulty_level IN ('iniciante', 'intermediario', 'avancado')),
  exercise_type TEXT CHECK (exercise_type IN ('base', 'isolamento', 'acessorio')),
  description TEXT,
  instructions TEXT[],
  common_mistakes TEXT[],
  benefits TEXT[],
  variations TEXT[],
  contraindications TEXT[],
  video_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workout exercises table
CREATE TABLE public.workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_workout_id UUID REFERENCES public.daily_workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  exercise_order INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps_range TEXT NOT NULL,
  rest_seconds INTEGER NOT NULL,
  load_percentage TEXT,
  tempo TEXT,
  rpe_target INTEGER CHECK (rpe_target >= 1 AND rpe_target <= 10),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for periodization_plans
CREATE POLICY "Users can view own plans" ON public.periodization_plans
  FOR SELECT USING (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own plans" ON public.periodization_plans
  FOR INSERT WITH CHECK (
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
    )
  );

-- Create RLS policies for training_phases
CREATE POLICY "Users can view own phases" ON public.training_phases
  FOR SELECT USING (
    periodization_plan_id IN (
      SELECT pp.id FROM public.periodization_plans pp
      JOIN public.user_profiles up ON pp.user_profile_id = up.id
      WHERE up.user_id = auth.uid()
    )
  );

-- Create RLS policies for weekly_structures
CREATE POLICY "Users can view own structures" ON public.weekly_structures
  FOR SELECT USING (
    training_phase_id IN (
      SELECT tp.id FROM public.training_phases tp
      JOIN public.periodization_plans pp ON tp.periodization_plan_id = pp.id
      JOIN public.user_profiles up ON pp.user_profile_id = up.id
      WHERE up.user_id = auth.uid()
    )
  );

-- Create RLS policies for daily_workouts
CREATE POLICY "Users can view own workouts" ON public.daily_workouts
  FOR SELECT USING (
    weekly_structure_id IN (
      SELECT ws.id FROM public.weekly_structures ws
      JOIN public.training_phases tp ON ws.training_phase_id = tp.id
      JOIN public.periodization_plans pp ON tp.periodization_plan_id = pp.id
      JOIN public.user_profiles up ON pp.user_profile_id = up.id
      WHERE up.user_id = auth.uid()
    )
  );

-- Exercise library is public for reading
CREATE POLICY "Anyone can view exercises" ON public.exercise_library
  FOR SELECT TO authenticated USING (true);

-- Create RLS policies for workout_exercises
CREATE POLICY "Users can view own workout exercises" ON public.workout_exercises
  FOR SELECT USING (
    daily_workout_id IN (
      SELECT dw.id FROM public.daily_workouts dw
      JOIN public.weekly_structures ws ON dw.weekly_structure_id = ws.id
      JOIN public.training_phases tp ON ws.training_phase_id = tp.id
      JOIN public.periodization_plans pp ON tp.periodization_plan_id = pp.id
      JOIN public.user_profiles up ON pp.user_profile_id = up.id
      WHERE up.user_id = auth.uid()
    )
  );

-- Insert sample exercises into the library
INSERT INTO public.exercise_library (name, category, muscle_groups, equipment_type, difficulty_level, exercise_type, description, instructions, common_mistakes, benefits, variations) VALUES
-- Chest exercises
('Supino Reto com Barra', 'peito', ARRAY['Peitoral Maior', 'Tríceps', 'Deltóide Anterior'], 'peso_livre', 'intermediario', 'base', 'Exercício fundamental para desenvolvimento do peitoral maior', ARRAY['Deite no banco com os pés apoiados no chão', 'Pegue a barra com pegada média (1,5x largura dos ombros)', 'Desça controladamente até tocar o peito', 'Empurre explosivamente para cima'], ARRAY['Arco excessivo nas costas', 'Pegada muito aberta', 'Não tocar completamente no peito', 'Subir a barra de forma irregular'], ARRAY['Força do peitoral', 'Massa muscular', 'Força funcional'], ARRAY['Supino Inclinado', 'Supino Declinado', 'Supino com Halteres']),

('Supino Inclinado com Halteres', 'peito', ARRAY['Peitoral Superior', 'Deltóide Anterior', 'Tríceps'], 'peso_livre', 'intermediario', 'base', 'Foca na porção superior do peitoral', ARRAY['Ajuste o banco em 30-45 graus', 'Segure os halteres com pegada neutra', 'Desça controladamente até sentir alongamento', 'Empurre para cima juntando no topo'], ARRAY['Inclinação muito acentuada', 'Não controlar a descida', 'Movimento muito amplo'], ARRAY['Desenvolvimento da porção superior', 'Simetria muscular', 'Força funcional'], ARRAY['Supino Inclinado com Barra', 'Crucifixo Inclinado']),

-- Back exercises
('Remada Curvada com Barra', 'costas', ARRAY['Latíssimo', 'Romboides', 'Trapézio Médio', 'Bíceps'], 'peso_livre', 'intermediario', 'base', 'Exercício base para desenvolvimento das costas', ARRAY['Posicione-se em pé com os pés na largura dos ombros', 'Incline o tronco mantendo as costas retas', 'Puxe a barra em direção ao abdômen', 'Controle a descida'], ARRAY['Usar o momentum', 'Inclinar demais o tronco', 'Não retrair as escápulas'], ARRAY['Largura das costas', 'Postura', 'Força de puxada'], ARRAY['Remada com Halteres', 'Remada na Máquina']),

-- Leg exercises
('Agachamento Livre', 'pernas', ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core'], 'peso_livre', 'intermediario', 'base', 'O rei dos exercícios para membros inferiores', ARRAY['Posicione a barra no trapézio', 'Pés na largura dos ombros', 'Desça como se fosse sentar numa cadeira', 'Suba empurrando pelos calcanhares'], ARRAY['Joelhos para dentro', 'Não descer suficiente', 'Inclinar muito para frente'], ARRAY['Força das pernas', 'Poder atlético', 'Queima calórica'], ARRAY['Agachamento Frontal', 'Agachamento Búlgaro']),

-- Shoulder exercises
('Desenvolvimento com Halteres', 'ombros', ARRAY['Deltóide', 'Tríceps'], 'peso_livre', 'intermediario', 'base', 'Exercício base para ombros', ARRAY['Sente-se com as costas apoiadas', 'Halteres na altura dos ombros', 'Empurre para cima em linha reta', 'Desça controladamente'], ARRAY['Arquear demais as costas', 'Subir os halteres para frente', 'Não usar toda amplitude'], ARRAY['Força dos ombros', 'Estabilidade', 'Massa muscular'], ARRAY['Desenvolvimento Militar', 'Desenvolvimento na Máquina']);
;
