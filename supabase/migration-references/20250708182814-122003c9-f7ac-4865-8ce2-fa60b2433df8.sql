
-- Create students table to manage student profiles
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professor_id uuid REFERENCES auth.users NOT NULL,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  objetivo text NOT NULL,
  telefone text,
  data_nascimento date,
  peso_kg numeric,
  altura_cm numeric,
  nivel_experiencia text DEFAULT 'iniciante',
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Professor can manage their own students
CREATE POLICY "Professors can manage their students" 
  ON public.students 
  FOR ALL 
  USING (auth.uid() = professor_id);

-- Students can view their own profile
CREATE POLICY "Students can view their profile" 
  ON public.students 
  FOR SELECT 
  USING (auth.uid()::text = email);
