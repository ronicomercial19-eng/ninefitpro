-- Create user achievements table for gamification
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  points INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  credits_remaining INTEGER DEFAULT 0,
  total_credits INTEGER DEFAULT 0,
  plan_type TEXT DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user plans table
CREATE TABLE IF NOT EXISTS public.user_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  monthly_price DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create vacation freeze requests table
CREATE TABLE IF NOT EXISTS public.vacation_freeze_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  freeze_start_date DATE NOT NULL,
  freeze_end_date DATE NOT NULL,
  reason TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user profile details table
CREATE TABLE IF NOT EXISTS public.user_profile_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL UNIQUE,
  name TEXT,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(5,2),
  goal TEXT,
  photo_url TEXT,
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_freeze_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_details ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Everyone can view achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Everyone can manage achievements" ON public.user_achievements FOR ALL USING (true);

CREATE POLICY "Everyone can view credits" ON public.user_credits FOR SELECT USING (true);
CREATE POLICY "Everyone can manage credits" ON public.user_credits FOR ALL USING (true);

CREATE POLICY "Everyone can view plans" ON public.user_plans FOR SELECT USING (true);
CREATE POLICY "Everyone can manage plans" ON public.user_plans FOR ALL USING (true);

CREATE POLICY "Everyone can view freeze requests" ON public.vacation_freeze_requests FOR SELECT USING (true);
CREATE POLICY "Everyone can manage freeze requests" ON public.vacation_freeze_requests FOR ALL USING (true);

CREATE POLICY "Everyone can view profile details" ON public.user_profile_details FOR SELECT USING (true);
CREATE POLICY "Everyone can manage profile details" ON public.user_profile_details FOR ALL USING (true);

-- Insert sample data
INSERT INTO public.user_credits (user_email, credits_remaining, total_credits, plan_type) VALUES
('demo@user.com', 8, 12, 'premium');

INSERT INTO public.user_plans (user_email, plan_name, plan_type, monthly_price, features) VALUES
('demo@user.com', 'Plano Premium', 'premium', 149.90, 
'["Acesso ilimitado", "12 créditos para aulas", "Avaliação física mensal", "Nutricionista online"]'::jsonb);

INSERT INTO public.user_profile_details (user_email, name, weight, body_fat_percentage, goal) VALUES
('demo@user.com', 'Usuário Demo', 75.5, 18.5, 'Emagrecimento');

INSERT INTO public.user_achievements (user_email, achievement_type, achievement_name, description, points) VALUES
('demo@user.com', 'workout', 'Primeiro Treino', 'Completou seu primeiro treino!', 50),
('demo@user.com', 'consistency', 'Semana Forte', 'Treinou 5 dias na semana', 100),
('demo@user.com', 'milestone', 'Força Total', 'Aumentou 10kg no supino', 200);