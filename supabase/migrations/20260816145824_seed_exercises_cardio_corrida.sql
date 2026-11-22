INSERT INTO exercises (name, description, target_muscles, goal, equipment, difficulty_level, is_optional)
VALUES
  ('Corrida Contínua Z2', 'Corrida em zona 2 (aeróbica leve), ritmo conversável, foco em base aeróbica.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'beginner', false),
  ('Corrida em Ritmo de Limiar (Tempo Run)', 'Corrida sustentada em ritmo de limiar anaeróbico, "comfortably hard".', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'intermediate', false),
  ('Corrida em Ritmo de Prova (Race Pace)', 'Corrida no ritmo alvo de competição, para adaptação específica.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'advanced', false),
  ('Intervalado Curto (200-400m)', 'Repetições curtas em alta intensidade com recuperação ativa ou total entre tiros.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'intermediate', false),
  ('Intervalado Longo (800m-2km)', 'Repetições longas em ritmo de limiar/VO2max, recuperação controlada.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'advanced', false),
  ('Sprint Alático (<60m)', 'Tiros de velocidade máxima em distância curta, recuperação completa entre tiros.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'advanced', false),
  ('Fartlek', 'Corrida com variação livre de ritmo intercalando trechos fortes e leves.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'intermediate', false),
  ('Hill Sprints (Tiros em Subida)', 'Tiros de velocidade em subida, ênfase em potência e força específica de corrida.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'advanced', false),
  ('Rodagem Longa (Long Run)', 'Corrida contínua de longa duração em ritmo controlado, desenvolvimento de resistência de base.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'intermediate', false),
  ('Strides (Acelerações Curtas)', 'Acelerações progressivas curtas (~80-100m) em ritmo quase máximo, foco técnico.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'beginner', false),
  ('Corrida com Cadência Controlada', 'Corrida contínua com foco em cadência de passada alvo (ex: 170-180 spm).', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'intermediate', false),
  ('30/30 (Intervalado Curto por Tempo)', 'Alternância de 30s forte / 30s leve em blocos contínuos.', ARRAY['cardio', 'membros inferiores'], 'endurance', 'nenhum', 'intermediate', false);;
