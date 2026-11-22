
-- Fix FK: appointments.student_id should reference athletes(id) not auth.users(id)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_student_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.athletes(id) ON DELETE CASCADE;

-- Create class_schedules table for defining the gym grid
CREATE TABLE IF NOT EXISTS public.class_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_slots integer DEFAULT 10,
  class_name text DEFAULT 'Aula',
  instructor text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

-- Everyone can read schedules
CREATE POLICY "Anyone can read class_schedules" ON public.class_schedules
  FOR SELECT USING (true);

-- Only admins can modify schedules
CREATE POLICY "Admins can manage class_schedules" ON public.class_schedules
  FOR ALL USING (public.is_trainer(auth.uid()));

-- Ensure student_credits table exists with proper structure
CREATE TABLE IF NOT EXISTS public.student_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.athletes(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_credits integer DEFAULT 0,
  used_credits integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.student_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage student_credits" ON public.student_credits
  FOR ALL USING (public.is_trainer(auth.uid()));

CREATE POLICY "Students can read own credits" ON public.student_credits
  FOR SELECT USING (
    student_id IN (
      SELECT id FROM public.athletes WHERE user_id = auth.uid()
    )
  );
