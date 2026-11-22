-- Verificar se a tabela athletes existe e corrigir se necessário
CREATE TABLE IF NOT EXISTS public.athletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  experience_level TEXT,
  primary_goal TEXT,
  training_environment TEXT,
  weekly_frequency INTEGER,
  session_duration TEXT,
  injuries_limitations TEXT,
  birthdate DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS na tabela athletes
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;

-- Criar políticas para a tabela athletes
DROP POLICY IF EXISTS "Coaches can manage their athletes" ON public.athletes;
DROP POLICY IF EXISTS "Admins can manage all athletes" ON public.athletes;

CREATE POLICY "Coaches can manage their athletes" 
ON public.athletes 
FOR ALL 
USING (coach_id = auth.uid());

CREATE POLICY "Admins can manage all athletes" 
ON public.athletes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_athletes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_athletes_updated_at ON public.athletes;
CREATE TRIGGER update_athletes_updated_at
  BEFORE UPDATE ON public.athletes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_athletes_updated_at();;
