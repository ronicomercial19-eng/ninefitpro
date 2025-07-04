-- Tabela expandida de exercícios com mais categorias
INSERT INTO public.exercise_library (name, muscle_groups, category, exercise_type, equipment_type, difficulty_level, description, instructions, benefits, common_mistakes, contraindications) VALUES
-- PEITO
('Supino reto com barra', ARRAY['Peitoral maior', 'Tríceps', 'Deltoides anterior'], 'Peito', 'Força', 'Barra', 'Intermediário', 'Exercício fundamental para desenvolvimento do peitoral', ARRAY['Deite no banco', 'Pegue a barra com pegada pronada', 'Desça controladamente até o peito', 'Empurre explosivamente'], ARRAY['Força do peitoral', 'Massa muscular', 'Força funcional'], ARRAY['Arco excessivo nas costas', 'Descida muito rápida', 'Pegada muito aberta'], ARRAY['Lesões no ombro', 'Problemas no punho']),

('Supino inclinado 45°', ARRAY['Peitoral maior (porção clavicular)', 'Deltoides anterior', 'Tríceps'], 'Peito', 'Força', 'Halteres', 'Intermediário', 'Foca na porção superior do peitoral', ARRAY['Ajuste banco a 45°', 'Segure halteres', 'Desça controladamente', 'Empurre para cima e para dentro'], ARRAY['Desenvolvimento superior do peito', 'Definição', 'Simetria'], ARRAY['Inclinação muito alta', 'Movimento muito rápido'], ARRAY['Lesões no ombro']),

('Flexão de braços tradicional', ARRAY['Peitoral maior', 'Tríceps', 'Core', 'Deltoides anterior'], 'Peito', 'Peso corporal', 'Nenhum', 'Iniciante', 'Exercício básico funcional', ARRAY['Posição de prancha', 'Mãos na largura dos ombros', 'Desça até quase tocar o chão', 'Empurre para cima'], ARRAY['Força funcional', 'Resistência', 'Estabilidade do core'], ARRAY['Quadril muito alto ou baixo', 'Movimento parcial'], ARRAY[]),

-- COSTAS
('Puxada frontal', ARRAY['Grande dorsal', 'Romboides', 'Bíceps'], 'Costas', 'Força', 'Máquina', 'Iniciante', 'Exercício fundamental para as costas', ARRAY['Sente na máquina', 'Pegue a barra com pegada pronada', 'Puxe até o peito', 'Controle a subida'], ARRAY['Largura das costas', 'Força de puxar', 'Postura'], ARRAY['Inclinar muito para trás', 'Puxar atrás da cabeça'], ARRAY['Lesões no ombro']),

('Remada curvada', ARRAY['Grande dorsal', 'Romboides', 'Trapézio médio', 'Bíceps'], 'Costas', 'Força', 'Barra', 'Intermediário', 'Exercício para espessura das costas', ARRAY['Curve o tronco 45°', 'Pegue a barra', 'Puxe até o abdômen', 'Controle a descida'], ARRAY['Espessura das costas', 'Força funcional', 'Postura'], ARRAY['Curvar demais', 'Usar muito peso'], ARRAY['Problemas lombares']),

-- PERNAS
('Agachamento livre', ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais', 'Core'], 'Pernas', 'Força', 'Barra', 'Intermediário', 'Rei dos exercícios para pernas', ARRAY['Barra nos trapézios', 'Pés na largura dos ombros', 'Desça como se fosse sentar', 'Suba explosivamente'], ARRAY['Força total das pernas', 'Massa muscular', 'Queima calórica'], ARRAY['Joelhos para dentro', 'Não descer até paralelo'], ARRAY['Lesões no joelho', 'Problemas lombares']),

('Leg press 45°', ARRAY['Quadríceps', 'Glúteos'], 'Pernas', 'Força', 'Máquina', 'Iniciante', 'Alternativa segura ao agachamento', ARRAY['Posicione-se na máquina', 'Pés na plataforma', 'Desça controladamente', 'Empurre a plataforma'], ARRAY['Força das pernas', 'Segurança', 'Isolamento'], ARRAY['Amplitude muito grande', 'Apoiar joelhos no peito'], ARRAY['Problemas lombares severos']),

('Stiff', ARRAY['Isquiotibiais', 'Glúteos', 'Eretores da coluna'], 'Pernas', 'Força', 'Halteres', 'Intermediário', 'Exercício para posterior da coxa', ARRAY['Segure halteres', 'Pés paralelos', 'Desça halteres mantendo pernas retas', 'Suba contraindo glúteos'], ARRAY['Flexibilidade posterior', 'Força dos glúteos'], ARRAY['Dobrar muito os joelhos', 'Curvar as costas'], ARRAY['Lesões lombares']),

-- OMBROS
('Desenvolvimento militar', ARRAY['Deltoides', 'Tríceps', 'Trapézio'], 'Ombros', 'Força', 'Barra', 'Avançado', 'Exercício completo para ombros', ARRAY['Barra na altura dos ombros', 'Empurre para cima', 'Controle a descida'], ARRAY['Força dos ombros', 'Estabilidade', 'Funcionalidade'], ARRAY['Arco excessivo', 'Descer muito a barra'], ARRAY['Impacto no ombro', 'Problemas cervicais']),

('Elevação lateral', ARRAY['Deltoides médio'], 'Ombros', 'Isolamento', 'Halteres', 'Iniciante', 'Isolamento para largura dos ombros', ARRAY['Halteres nas mãos', 'Eleve lateralmente até ombros', 'Controle a descida'], ARRAY['Largura dos ombros', 'Definição'], ARRAY['Elevar muito alto', 'Balançar o corpo'], ARRAY['Impacto no ombro']),

-- BRAÇOS
('Rosca direta', ARRAY['Bíceps braquial', 'Braquial anterior'], 'Braços', 'Isolamento', 'Barra', 'Iniciante', 'Exercício básico para bíceps', ARRAY['Segure a barra', 'Cotovelos fixos', 'Flexione os braços', 'Controle a descida'], ARRAY['Massa do bíceps', 'Força de flexão'], ARRAY['Balançar o corpo', 'Usar cotovelos'], ARRAY[]),

('Tríceps pulley', ARRAY['Tríceps braquial'], 'Braços', 'Isolamento', 'Cabo', 'Iniciante', 'Isolamento eficaz para tríceps', ARRAY['Cabo alto', 'Cotovelos fixos', 'Estenda os braços', 'Controle a subida'], ARRAY['Definição do tríceps', 'Força de extensão'], ARRAY['Mover cotovelos', 'Inclinar o corpo'], ARRAY[]),

-- CORE/ABDOMEN
('Prancha', ARRAY['Core', 'Músculos estabilizadores'], 'Core', 'Estabilização', 'Peso corporal', 'Iniciante', 'Exercício fundamental para core', ARRAY['Posição de flexão', 'Mantenha linha reta', 'Respire normalmente', 'Mantenha a posição'], ARRAY['Estabilidade do core', 'Postura', 'Força funcional'], ARRAY['Quadril muito alto', 'Prender a respiração'], ARRAY[]),

('Abdominal crunch', ARRAY['Reto abdominal'], 'Core', 'Isolamento', 'Peso corporal', 'Iniciante', 'Exercício básico para abdômen', ARRAY['Deite de costas', 'Mãos atrás da cabeça', 'Flexione o tronco', 'Controle a descida'], ARRAY['Força abdominal', 'Definição'], ARRAY['Puxar o pescoço', 'Movimento muito amplo'], ARRAY['Problemas cervicais']),

-- CARDIO/FUNCIONAIS
('Burpee', ARRAY['Corpo todo'], 'Funcional', 'Cardio', 'Peso corporal', 'Avançado', 'Exercício funcional completo', ARRAY['Agache', 'Apoie as mãos', 'Estenda as pernas', 'Flexão', 'Volte ao agachamento', 'Salte'], ARRAY['Condicionamento', 'Queima calórica', 'Força funcional'], ARRAY['Movimento muito rápido', 'Forma inadequada'], ARRAY['Problemas articulares']),

('Mountain climber', ARRAY['Core', 'Ombros', 'Pernas'], 'Funcional', 'Cardio', 'Peso corporal', 'Intermediário', 'Exercício cardio para core', ARRAY['Posição de prancha', 'Alterne joelhos ao peito', 'Mantenha ritmo'], ARRAY['Cardio', 'Core', 'Coordenação'], ARRAY['Perder postura', 'Muito devagar'], ARRAY[]);

-- Tabela de questionários dinâmicos
CREATE TABLE public.questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'fitness', 'nutrition', 'health', 'goals'
  questions JSONB NOT NULL, -- Estrutura das perguntas
  scoring_system JSONB, -- Sistema de pontuação
  recommendations JSONB, -- Recomendações baseadas nas respostas
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de respostas aos questionários
CREATE TABLE public.questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  questionnaire_id UUID REFERENCES public.questionnaires(id) NOT NULL,
  responses JSONB NOT NULL, -- Respostas do usuário
  score NUMERIC, -- Pontuação calculada
  recommendations TEXT[], -- Recomendações geradas
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de métricas em tempo real
CREATE TABLE public.user_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  metric_type TEXT NOT NULL, -- 'weight', 'body_fat', 'muscle_mass', 'energy_level', etc.
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL, -- 'kg', '%', 'level_1_10', etc.
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  source TEXT, -- 'manual', 'device', 'app_calculation'
  notes TEXT
);

-- Tabela de planos de treino expandida
CREATE TABLE public.training_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'beginner', 'intermediate', 'advanced', 'specialized'
  goal TEXT, -- 'weight_loss', 'muscle_gain', 'strength', 'endurance'
  duration_weeks INTEGER,
  frequency_per_week INTEGER,
  equipment_needed TEXT[],
  difficulty_level TEXT,
  program_structure JSONB, -- Estrutura completa do programa
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_by UUID, -- ID do criador (professor/IA)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de análises em tempo real
CREATE TABLE public.real_time_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  analysis_type TEXT NOT NULL, -- 'progress', 'performance', 'health_score'
  data JSONB NOT NULL, -- Dados da análise
  insights TEXT[], -- Insights gerados
  recommendations TEXT[], -- Recomendações
  confidence_score NUMERIC, -- Confiança da análise (0-1)
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_time_analytics ENABLE ROW LEVEL SECURITY;

-- Policies para questionnaires (públicos para leitura)
CREATE POLICY "Everyone can view active questionnaires" 
  ON public.questionnaires 
  FOR SELECT 
  USING (is_active = true);

-- Policies para questionnaire_responses
CREATE POLICY "Users can view their own responses" 
  ON public.questionnaire_responses 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own responses" 
  ON public.questionnaire_responses 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policies para user_metrics
CREATE POLICY "Users can view their own metrics" 
  ON public.user_metrics 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics" 
  ON public.user_metrics 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metrics" 
  ON public.user_metrics 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policies para training_programs
CREATE POLICY "Everyone can view training programs" 
  ON public.training_programs 
  FOR SELECT 
  USING (true);

-- Policies para real_time_analytics
CREATE POLICY "Users can view their own analytics" 
  ON public.real_time_analytics 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert analytics" 
  ON public.real_time_analytics 
  FOR INSERT 
  WITH CHECK (true); -- Permitir inserção do sistema

-- Configurar para tempo real
ALTER TABLE public.questionnaire_responses REPLICA IDENTITY FULL;
ALTER TABLE public.user_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.real_time_analytics REPLICA IDENTITY FULL;