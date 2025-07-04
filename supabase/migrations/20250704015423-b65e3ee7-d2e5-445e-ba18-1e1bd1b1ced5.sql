-- Tabela expandida de exercícios com mais categorias
INSERT INTO public.exercise_library (name, muscle_groups, category, exercise_type, equipment_type, difficulty_level, description, instructions, benefits, common_mistakes, contraindications) VALUES
-- PEITO
('Supino reto com barra', ARRAY['Peitoral maior', 'Tríceps', 'Deltoides anterior'], 'Peito', 'Força', 'Barra', 'Intermediário', 'Exercício fundamental para desenvolvimento do peitoral', ARRAY['Deite no banco', 'Pegue a barra com pegada pronada', 'Desça controladamente até o peito', 'Empurre explosivamente'], ARRAY['Força do peitoral', 'Massa muscular', 'Força funcional'], ARRAY['Arco excessivo nas costas', 'Descida muito rápida', 'Pegada muito aberta'], ARRAY['Lesões no ombro', 'Problemas no punho']),

('Supino inclinado 45°', ARRAY['Peitoral maior (porção clavicular)', 'Deltoides anterior', 'Tríceps'], 'Peito', 'Força', 'Halteres', 'Intermediário', 'Foca na porção superior do peitoral', ARRAY['Ajuste banco a 45°', 'Segure halteres', 'Desça controladamente', 'Empurre para cima e para dentro'], ARRAY['Desenvolvimento superior do peito', 'Definição', 'Simetria'], ARRAY['Inclinação muito alta', 'Movimento muito rápido'], ARRAY['Lesões no ombro']),

('Flexão de braços tradicional', ARRAY['Peitoral maior', 'Tríceps', 'Core', 'Deltoides anterior'], 'Peito', 'Peso corporal', 'Nenhum', 'Iniciante', 'Exercício básico funcional', ARRAY['Posição de prancha', 'Mãos na largura dos ombros', 'Desça até quase tocar o chão', 'Empurre para cima'], ARRAY['Força funcional', 'Resistência', 'Estabilidade do core'], ARRAY['Quadril muito alto ou baixo', 'Movimento parcial'], ARRAY[]::text[]),

-- COSTAS
('Puxada frontal', ARRAY['Grande dorsal', 'Romboides', 'Bíceps'], 'Costas', 'Força', 'Máquina', 'Iniciante', 'Exercício fundamental para as costas', ARRAY['Sente na máquina', 'Pegue a barra com pegada pronada', 'Puxe até o peito', 'Controle a subida'], ARRAY['Largura das costas', 'Força de puxar', 'Postura'], ARRAY['Inclinar muito para trás', 'Puxar atrás da cabeça'], ARRAY['Lesões no ombro']),

('Remada curvada', ARRAY['Grande dorsal', 'Romboides', 'Trapézio médio', 'Bíceps'], 'Costas', 'Força', 'Barra', 'Intermediário', 'Exercício para espessura das costas', ARRAY['Curve o tronco 45°', 'Pegue a barra', 'Puxe até o abdômen', 'Controle a descida'], ARRAY['Espessura das costas', 'Força funcional', 'Postura'], ARRAY['Curvar demais', 'Usar muito peso'], ARRAY['Problemas lombares']);

-- Agora criar as novas tabelas
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