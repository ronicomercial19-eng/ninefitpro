-- Primeiro, vamos ver as constraints existentes e ajustar
ALTER TABLE public.exercise_library DROP CONSTRAINT IF EXISTS exercise_library_category_check;

-- Criar nova constraint mais flexível
ALTER TABLE public.exercise_library ADD CONSTRAINT exercise_library_category_check 
CHECK (category IN ('Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Funcional', 'Cardio', 'Força', 'Flexibilidade'));

-- Agora inserir os exercícios
INSERT INTO public.exercise_library (name, muscle_groups, category, exercise_type, equipment_type, difficulty_level, description, instructions, benefits, common_mistakes, contraindications) VALUES
('Supino reto com barra', ARRAY['Peitoral maior', 'Tríceps', 'Deltoides anterior'], 'Peito', 'Força', 'Barra', 'Intermediário', 'Exercício fundamental para desenvolvimento do peitoral', ARRAY['Deite no banco', 'Pegue a barra', 'Desça controladamente', 'Empurre explosivamente'], ARRAY['Força do peitoral', 'Massa muscular'], ARRAY['Arco excessivo', 'Descida rápida'], ARRAY['Lesões no ombro']),

('Puxada frontal', ARRAY['Grande dorsal', 'Romboides', 'Bíceps'], 'Costas', 'Força', 'Máquina', 'Iniciante', 'Exercício fundamental para as costas', ARRAY['Sente na máquina', 'Pegue a barra', 'Puxe até o peito'], ARRAY['Largura das costas', 'Força de puxar'], ARRAY['Inclinar muito para trás'], ARRAY['Lesões no ombro']),

('Agachamento livre', ARRAY['Quadríceps', 'Glúteos', 'Isquiotibiais'], 'Pernas', 'Força', 'Barra', 'Intermediário', 'Rei dos exercícios para pernas', ARRAY['Barra nos trapézios', 'Desça como sentar', 'Suba explosivamente'], ARRAY['Força das pernas', 'Massa muscular'], ARRAY['Joelhos para dentro'], ARRAY['Lesões no joelho']),

('Desenvolvimento militar', ARRAY['Deltoides', 'Tríceps'], 'Ombros', 'Força', 'Barra', 'Avançado', 'Exercício completo para ombros', ARRAY['Barra na altura dos ombros', 'Empurre para cima'], ARRAY['Força dos ombros'], ARRAY['Arco excessivo'], ARRAY['Problemas cervicais']),

('Rosca direta', ARRAY['Bíceps braquial'], 'Braços', 'Isolamento', 'Barra', 'Iniciante', 'Exercício básico para bíceps', ARRAY['Segure a barra', 'Flexione os braços'], ARRAY['Massa do bíceps'], ARRAY['Balançar o corpo'], ARRAY[]::text[]),

('Prancha', ARRAY['Core'], 'Core', 'Estabilização', 'Peso corporal', 'Iniciante', 'Exercício fundamental para core', ARRAY['Posição de flexão', 'Mantenha linha reta'], ARRAY['Estabilidade do core'], ARRAY['Quadril muito alto'], ARRAY[]::text[]),

('Burpee', ARRAY['Corpo todo'], 'Funcional', 'Cardio', 'Peso corporal', 'Avançado', 'Exercício funcional completo', ARRAY['Agache', 'Apoie as mãos', 'Salte'], ARRAY['Condicionamento'], ARRAY['Movimento rápido'], ARRAY[]::text[]);