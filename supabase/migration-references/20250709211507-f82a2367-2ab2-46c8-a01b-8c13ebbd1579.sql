
-- Criar tabela de exercícios com campos detalhados
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_muscles text[] NOT NULL DEFAULT '{}',
  phase text CHECK (phase IN ('base', 'intensification', 'peaking', 'recovery')),
  goal text CHECK (goal IN ('hypertrophy', 'strength', 'power', 'endurance')),
  equipment text,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  is_optional boolean DEFAULT false,
  video_url text,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de treinos estruturados
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodization_id uuid REFERENCES public.periodizations(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  phase text NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]',
  method text,
  notes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela para templates de treino
CREATE TABLE public.workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phase text NOT NULL,
  goal text NOT NULL,
  exercise_count integer DEFAULT 4 CHECK (exercise_count BETWEEN 4 AND 6),
  template_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para exercises (todos podem ver)
CREATE POLICY "Everyone can view exercises" ON public.exercises
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can manage exercises" ON public.exercises
  FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para workouts (professores e alunos relacionados)
CREATE POLICY "Students can view their own workouts" ON public.workouts
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Professors can manage workouts for their students" ON public.workouts
  FOR ALL USING (
    student_id IN (
      SELECT id FROM public.students 
      WHERE professor_id = auth.uid()
    )
  );

-- Políticas para workout_templates (todos podem ver)
CREATE POLICY "Everyone can view workout templates" ON public.workout_templates
  FOR SELECT USING (true);

-- Inserir alguns exercícios de exemplo
INSERT INTO public.exercises (name, description, target_muscles, phase, goal, equipment, difficulty_level) VALUES
('Agachamento Livre', 'Exercício fundamental para membros inferiores', ARRAY['quadríceps', 'glúteos', 'core'], 'base', 'hypertrophy', 'barra', 'intermediate'),
('Supino Reto', 'Exercício para peitoral e tríceps', ARRAY['peitoral', 'tríceps', 'deltoides'], 'base', 'hypertrophy', 'barra', 'intermediate'),
('Remada Curvada', 'Exercício para dorsais e bíceps', ARRAY['latíssimo', 'romboides', 'bíceps'], 'base', 'hypertrophy', 'barra', 'intermediate'),
('Levantamento Terra', 'Exercício completo para posterior', ARRAY['glúteos', 'isquiotibiais', 'erectores', 'trapézio'], 'intensification', 'strength', 'barra', 'advanced'),
('Desenvolvimento Militar', 'Exercício para ombros', ARRAY['deltoides', 'tríceps', 'core'], 'base', 'hypertrophy', 'barra', 'intermediate');

-- Inserir templates de treino
INSERT INTO public.workout_templates (name, phase, goal, exercise_count, template_data) VALUES
('Treino Base Hipertrofia', 'base', 'hypertrophy', 4, '{"sets_range": "3-4", "reps_range": "8-12", "rest_time": "60-90s"}'),
('Treino Intensificação Força', 'intensification', 'strength', 5, '{"sets_range": "4-5", "reps_range": "3-6", "rest_time": "120-180s"}'),
('Treino Pico Potência', 'peaking', 'power', 4, '{"sets_range": "3-4", "reps_range": "1-3", "rest_time": "180-300s"}');
