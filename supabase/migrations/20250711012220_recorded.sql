
-- Criar tabela para armazenar os modelos de periodização
CREATE TABLE IF NOT EXISTS periodization_models (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT NOT NULL CHECK (goal IN ('hipertrofia', 'emagrecimento', 'performance', 'bem-estar')),
  duration TEXT NOT NULL CHECK (duration IN ('3m', '6m', '12m', '24m')),
  description TEXT NOT NULL,
  macrocycle JSONB NOT NULL,
  mesocycle JSONB NOT NULL,
  microcycle JSONB NOT NULL,
  recommended_for JSONB NOT NULL,
  graph_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para armazenar análises de match de perfil
CREATE TABLE IF NOT EXISTS profile_periodization_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id UUID REFERENCES user_profiles(id),
  periodization_model_id TEXT REFERENCES periodization_models(id),
  match_percentage INTEGER NOT NULL CHECK (match_percentage >= 0 AND match_percentage <= 100),
  match_factors JSONB NOT NULL,
  recommended_rank INTEGER NOT NULL CHECK (recommended_rank >= 1 AND recommended_rank <= 3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir os modelos de periodização
INSERT INTO periodization_models (id, title, goal, duration, description, macrocycle, mesocycle, microcycle, recommended_for, graph_data) VALUES
('linear-hipertrofia-1', 'Linear Hipertrofia 6m (Iniciante/Intermediário)', 'hipertrofia', '6m', 'Progressão contínua: volume alto inicial decresce, intensidade sobe até pico.', 
 '["Adaptação (4 sem)", "Transição (8 sem)", "Pico (4 sem)", "Deload (2 sem)"]',
 '[["Sem 1‑4: volume alto (↑ sets×reps)", "Sem 5‑12: moderado", "Sem 13‑16: intensividade elevada", "Sem 17‑18: redução total"]]',
 '[["Semana alta‑volume", "Semana média‑volume", "Semana alta‑intensidade", "Redução 50%"]]',
 '["iniciante", "intermediário"]',
 '{"volume": [100, 90, 80, 50], "intensity": [60, 70, 80, 60]}'),

('ondulante-hipertrofia-1', 'Ondulante Semanal Hipertrofia 6m (Intermediário/Avançado)', 'hipertrofia', '6m', 'Variações semanais entre volume e intensidade com microciclos ondulados.',
 '["Acumulação (8 sem)", "Transformação (8 sem)", "Realização + Deload (8 sem)"]',
 '[["Sem 1‑8: foco volume", "Sem 9‑16: foco intensidade", "Sem 17‑24: pico e deload intercalado"]]',
 '[["Dia 1: volume alto", "Dia 2: intensidade média", "Dia 3: intensidade alta", "Deload final"]]',
 '["intermediário", "avançado"]',
 '{"volume": [100, 80, 60, 50], "intensity": [60, 70, 85, 60]}'),

('dup-hipertrofia-1', 'Ondulante Diária (DUP) Hipertrofia 3m (Avançado)', 'hipertrofia', '3m', 'Variação diária intensa entre volume e carga máxima.',
 '["Acúmulo/undulating ciclos intensos"]',
 '[["Sem 1‑4: volume moderado vs carga média", "Sem 5‑8: intensidade alta – menor volume", "Sem 9‑12: pico e deload alternado"]]',
 '[["Dia alta carga (85 % 1RM)", "Dia volume (12‑15 reps)", "Dia médio‑intensão", "Deload leve ou descanso"]]',
 '["avançado"]',
 '{"volume": [90, 70, 60, 40], "intensity": [65, 75, 85, 60]}'),

('linear-emagrecimento-1', 'Linear Emagrecimento 12m (Intermediário)', 'emagrecimento', '12m', 'Volume elevado inicialmente para calorias, intensidade progressiva para manutenção de massa magra.',
 '["Adaptação (8 sem)", "Transição com déficit (16 sem)", "Manutenção e deload (8 sem)"]',
 '[["Sem 1‑8: volume alto cardio+RT", "Sem 9‑24: intensidade progressiva", "Sem 25‑32: intensidade alta volume moderado"]]',
 '[["3 dias RT + 2 dias cardio leve", "4 dias RT + 1 HIIT", "Deload redução calórica leve", "Ajuste conforme progresso"]]',
 '["intermediário"]',
 '{"volume": [100, 90, 80, 60], "intensity": [50, 60, 70, 55]}'),

('bloco-hipertrofia-1', 'Bloco Hipertrofia 6m (Avançado)', 'hipertrofia', '6m', 'Periodização em blocos com foco em volume, força e potência.',
 '["Acumulação", "Transformação", "Realização"]',
 '[["Sem 1-6: volume alto", "Sem 7-12: força", "Sem 13-18: potência"]]',
 '[["Semana 1: força moderada", "Semana 2: volume elevado", "Semana 3: potência leve", "Semana 4: deload"]]',
 '["avançado"]',
 '{"volume": [100, 90, 75, 50], "intensity": [60, 70, 85, 60]}'),

('flexivel-hipertrofia-1', 'Hipertrofia Flexível 6m (Intermediário)', 'hipertrofia', '6m', 'Adaptação da carga e volume com base em resposta semanal do atleta.',
 '["Adaptação", "Progressão", "Pico"]',
 '[["Sem 1-4: volume leve a moderado", "Sem 5-8: aumento gradual de carga", "Sem 9-12: redução de volume, aumento de intensidade"]]',
 '[["Autoajuste semanal com base no RPE", "Volume variável por grupo muscular", "Deload leve quando necessário"]]',
 '["intermediário"]',
 '{"volume": [90, 80, 70, 60], "intensity": [65, 70, 80, 60]}'),

('progressivo-hipertrofia-1', 'Progressivo Hipertrofia 6m (Iniciante/Intermediário)', 'hipertrofia', '6m', 'Modelo baseado na sobrecarga progressiva com estímulos crescentes a cada mesociclo.',
 '["Adaptação", "Sobrecompensação", "Pico"]',
 '[["Sem 1-4: intensidade leve", "Sem 5-8: intensidade média", "Sem 9-12: intensidade alta"]]',
 '[["Semana 1: carga leve", "Semana 2: carga média", "Semana 3: carga alta", "Semana 4: deload"]]',
 '["iniciante", "intermediário"]',
 '{"volume": [100, 85, 70, 60], "intensity": [55, 65, 75, 60]}'),

('supercompensacao-hipertrofia-1', 'Supercompensação Hipertrofia 6m (Intermediário)', 'hipertrofia', '6m', 'Treinamento baseado na teoria da supercompensação, alternando estímulo e recuperação planejada.',
 '["Estimulação", "Recuperação", "Adaptação"]',
 '[["Sem 1-3: carga elevada", "Sem 4: recuperação", "Sem 5-7: carga moderada", "Sem 8: recuperação total"]]',
 '[["Estímulo forte", "Manutenção", "Redução de carga", "Nova sobrecarga"]]',
 '["intermediário"]',
 '{"volume": [95, 75, 60, 90], "intensity": [60, 70, 65, 75]}'),

('mix-hipertrofia-lpup', 'Hipertrofia Mista LP+UP 12m (Avançado)', 'hipertrofia', '12m', 'Combina periodização linear e ondulante ao longo do ano, ideal para avançados.',
 '["Linear 6m", "Ondulante 6m"]',
 '[["Sem 1-24: progressão linear", "Sem 25-48: progressão ondulante"]]',
 '[["Ciclo de força", "Ciclo de hipertrofia", "Ciclo de recuperação", "Ciclo de pico"]]',
 '["avançado"]',
 '{"volume": [80, 85, 75, 70], "intensity": [70, 75, 80, 85]}'),

('linear-performance-1', 'Performance Linear 6m (Esportivo - Corrida)', 'performance', '6m', 'Periodização linear voltada à melhora da resistência aeróbica com picos de intensidade.',
 '["Base", "Construção", "Pico", "Deload"]',
 '[["Sem 1-4: base aeróbica", "Sem 5-8: treino intervalado", "Sem 9-12: longões e sprints", "Sem 13-16: taper"]]',
 '[["1 treino longo", "2 intervalados", "1 técnica", "1 descanso ativo"]]',
 '["intermediário", "atletas"]',
 '{"volume": [80, 90, 95, 60], "intensity": [50, 65, 80, 60]}'),

('ondulante-performance-1', 'Performance Ondulante 3m (Esportivo - Futebol)', 'performance', '3m', 'Ciclos ondulantes de potência, resistência e agilidade para atletas de campo.',
 '["Base física", "Habilidade técnica"]',
 '[["Sem 1-2: força + agilidade", "Sem 3-4: resistência + técnica", "Sem 5-6: potência + jogo reduzido"]]',
 '[["Segunda: força", "Quarta: tático", "Sexta: potência", "Domingo: jogo"]]',
 '["avançado", "atleta coletivo"]',
 '{"volume": [70, 75, 65, 50], "intensity": [60, 70, 85, 60]}'),

('linear-bemestar-1', 'Bem-estar Linear 12m (População Geral)', 'bem-estar', '12m', 'Progresso contínuo voltado à saúde geral, com foco em frequência, mobilidade e carga leve.',
 '["Adaptação", "Consolidação", "Manutenção"]',
 '[["Sem 1-8: exercícios funcionais", "Sem 9-16: leve resistência", "Sem 17-24: cardiorrespiratório e força leve"]]',
 '[["2 sessões aeróbico leve", "1 sessão mobilidade", "2 sessões força leve"]]',
 '["iniciantes", "população geral"]',
 '{"volume": [60, 65, 70, 70], "intensity": [40, 45, 50, 55]}'),

('ondulante-bemestar-1', 'Ondulante Bem-estar 6m (Intermediário)', 'bem-estar', '6m', 'Alternância de estímulos semanais para saúde, variando entre força leve, mobilidade e aeróbico.',
 '["Adaptação", "Progressão leve", "Manutenção"]',
 '[["Sem 1-4: foco em mobilidade", "Sem 5-8: força leve", "Sem 9-12: resistência leve"]]',
 '[["Semana 1: mobilidade + caminhada", "Semana 2: resistência leve", "Semana 3: circuito leve", "Semana 4: descanso ativo"]]',
 '["população especial", "intermediário"]',
 '{"volume": [60, 55, 70, 65], "intensity": [40, 45, 50, 45]}'),

('especial-emagrecimento-1', 'Emagrecimento Pós-Obesidade 6m (Especial)', 'emagrecimento', '6m', 'Treino com foco em segurança e aderência para quem saiu do quadro de obesidade clínica.',
 '["Base funcional", "Transição", "Redução calórica"]',
 '[["Sem 1-6: caminhada + força leve", "Sem 7-12: incremento aeróbico", "Sem 13-18: HIIT adaptado"]]',
 '[["Caminhada diária leve", "2x funcional leve", "1x HIIT leve"]]',
 '["população especial"]',
 '{"volume": [80, 75, 70, 65], "intensity": [40, 50, 60, 50]}');

-- Adicionar RLS policies
ALTER TABLE periodization_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_periodization_matches ENABLE ROW LEVEL SECURITY;

-- Policy para permitir que todos vejam os modelos de periodização
CREATE POLICY "Everyone can view periodization models" ON periodization_models
  FOR SELECT USING (true);

-- Policy para permitir que usuários vejam suas próprias análises de match
CREATE POLICY "Users can view their own matches" ON profile_periodization_matches
  FOR SELECT USING (
    user_profile_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy para permitir inserção de análises de match
CREATE POLICY "System can insert matches" ON profile_periodization_matches
  FOR INSERT WITH CHECK (true);

-- Função para calcular match de perfil com periodização
CREATE OR REPLACE FUNCTION calculate_periodization_match(
  profile_goal TEXT,
  profile_experience TEXT,
  profile_age INTEGER,
  profile_injuries TEXT,
  model_goal TEXT,
  model_recommended_for JSONB
) RETURNS INTEGER AS $$
DECLARE
  match_score INTEGER := 0;
  base_score INTEGER := 0;
BEGIN
  -- Match exato do objetivo (60 pontos)
  IF profile_goal = model_goal THEN
    base_score := base_score + 60;
  END IF;
  
  -- Match de experiência (30 pontos)
  IF model_recommended_for ? profile_experience THEN
    base_score := base_score + 30;
  END IF;
  
  -- Ajustes por idade (10 pontos)
  IF profile_age BETWEEN 18 AND 30 THEN
    base_score := base_score + 10;
  ELSIF profile_age BETWEEN 31 AND 45 THEN
    base_score := base_score + 8;
  ELSE
    base_score := base_score + 5;
  END IF;
  
  -- Penalizações por lesões
  IF profile_injuries IS NOT NULL AND LENGTH(profile_injuries) > 0 THEN
    IF model_recommended_for ? 'avançado' THEN
      base_score := base_score - 15;
    END IF;
  END IF;
  
  -- Garantir que o score não ultrapasse 100
  match_score := LEAST(base_score, 100);
  
  RETURN GREATEST(match_score, 0);
END;
$$ LANGUAGE plpgsql;
;
