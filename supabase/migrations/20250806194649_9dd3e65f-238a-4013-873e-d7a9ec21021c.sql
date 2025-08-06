-- Create programs table
CREATE TABLE IF NOT EXISTS public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_name TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create program_workouts junction table (since programs can have multiple workouts)
CREATE TABLE IF NOT EXISTS public.program_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  workout_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create workout_exercises table (for structured workout-exercise relationships)
CREATE TABLE IF NOT EXISTS public.workout_program_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  video_url TEXT,
  description TEXT,
  default_series INTEGER NOT NULL DEFAULT 3,
  default_reps TEXT NOT NULL DEFAULT '8-10',
  rest_time_seconds INTEGER DEFAULT 60,
  exercise_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_program_progress table
CREATE TABLE IF NOT EXISTS public.user_program_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  program_start_date DATE DEFAULT CURRENT_DATE,
  support_level TEXT CHECK (support_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
  workouts_completed INTEGER DEFAULT 0,
  current_workout_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_workout_logs table
CREATE TABLE IF NOT EXISTS public.user_workout_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  program_id UUID REFERENCES public.programs(id),
  workout_id UUID REFERENCES public.workouts(id),
  exercise_name TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  sets_completed JSONB DEFAULT '[]'::jsonb,
  total_time_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS public.gym_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_name TEXT NOT NULL,
  location TEXT NOT NULL,
  class_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  available_slots INTEGER NOT NULL DEFAULT 20,
  instructor_name TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  class_id UUID REFERENCES public.gym_classes(id) ON DELETE CASCADE,
  booking_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Everyone can view programs" ON public.programs FOR SELECT USING (true);
CREATE POLICY "Everyone can manage programs" ON public.programs FOR ALL USING (true);

CREATE POLICY "Everyone can view program workouts" ON public.program_workouts FOR SELECT USING (true);
CREATE POLICY "Everyone can manage program workouts" ON public.program_workouts FOR ALL USING (true);

CREATE POLICY "Everyone can view workout exercises" ON public.workout_program_exercises FOR SELECT USING (true);
CREATE POLICY "Everyone can manage workout exercises" ON public.workout_program_exercises FOR ALL USING (true);

CREATE POLICY "Everyone can view user progress" ON public.user_program_progress FOR SELECT USING (true);
CREATE POLICY "Everyone can manage user progress" ON public.user_program_progress FOR ALL USING (true);

CREATE POLICY "Everyone can view workout logs" ON public.user_workout_logs FOR SELECT USING (true);
CREATE POLICY "Everyone can manage workout logs" ON public.user_workout_logs FOR ALL USING (true);

CREATE POLICY "Everyone can view classes" ON public.gym_classes FOR SELECT USING (true);
CREATE POLICY "Everyone can manage classes" ON public.gym_classes FOR ALL USING (true);

CREATE POLICY "Everyone can view bookings" ON public.class_bookings FOR SELECT USING (true);
CREATE POLICY "Everyone can manage bookings" ON public.class_bookings FOR ALL USING (true);

-- Insert sample data
INSERT INTO public.programs (program_name, description) VALUES 
('EMAGRECIMENTO', 'TREINO 4 - 18 TREINOS EM 6 SEMANAS'),
('GANHO DE MASSA', 'TREINO 3 - 16 TREINOS EM 8 SEMANAS'),
('CONDICIONAMENTO', 'TREINO 2 - 12 TREINOS EM 4 SEMANAS');

-- Insert sample gym classes
INSERT INTO public.gym_classes (class_name, location, class_datetime, available_slots, instructor_name, description) VALUES
('Yoga Matinal', 'Shopping Morumbi Town', '2024-12-01 07:00:00+00', 15, 'Ana Silva', 'Aula de yoga para começar bem o dia'),
('CrossFit Intenso', 'Shopping Morumbi Town', '2024-12-01 18:00:00+00', 12, 'Carlos Santos', 'Treino funcional de alta intensidade'),
('Pilates', 'Shopping Morumbi Town', '2024-12-02 09:00:00+00', 10, 'Maria Costa', 'Fortalecimento e flexibilidade');