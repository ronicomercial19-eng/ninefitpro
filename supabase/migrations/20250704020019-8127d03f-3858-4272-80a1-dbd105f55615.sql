-- Criar as novas tabelas primeiro
CREATE TABLE public.questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  questions JSONB NOT NULL,
  scoring_system JSONB,
  recommendations JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  questionnaire_id UUID REFERENCES public.questionnaires(id) NOT NULL,
  responses JSONB NOT NULL,
  score NUMERIC,
  recommendations TEXT[],
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT,
  notes TEXT
);

CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  goal TEXT,
  duration_weeks INTEGER,
  frequency_per_week INTEGER,
  equipment_needed TEXT[],
  difficulty_level TEXT,
  program_structure JSONB,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.real_time_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  analysis_type TEXT NOT NULL,
  data JSONB NOT NULL,
  insights TEXT[],
  recommendations TEXT[],
  confidence_score NUMERIC,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active questionnaires" ON public.questionnaires FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own responses" ON public.questionnaire_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own responses" ON public.questionnaire_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own metrics" ON public.user_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own metrics" ON public.user_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own metrics" ON public.user_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Everyone can view training programs" ON public.training_programs FOR SELECT USING (true);
CREATE POLICY "Users can view their own analytics" ON public.real_time_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert analytics" ON public.real_time_analytics FOR INSERT WITH CHECK (true);