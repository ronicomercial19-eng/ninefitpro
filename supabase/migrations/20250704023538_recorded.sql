-- Insert periodization types into the database
INSERT INTO public.training_programs (
  name,
  description,
  category,
  goal,
  difficulty_level,
  program_structure,
  is_ai_generated
) VALUES 
-- 1. Periodização Linear
('Periodização Linear (Clássica)', 
 'Modelo tradicional com progressão sequencial. Volume alto com intensidade baixa inicialmente, diminuindo volume e aumentando intensidade progressivamente.',
 'Periodização',
 'hipertrofia,força',
 'iniciante',
 '{"fases": [{"nome": "Hipertrofia/Adaptação Anatômica", "series": "3-5", "reps": "8-15", "intensidade": "baixa-moderada"}, {"nome": "Força", "series": "3-5", "reps": "4-6", "intensidade": "alta"}, {"nome": "Potência", "series": "3-5", "reps": "1-3", "intensidade": "muito alta"}, {"nome": "Transição (Deload)", "series": "2-3", "reps": "8-12", "intensidade": "baixa"}]}',
 true),

-- 2. Periodização Ondulatória Diária (DUP)
('Periodização Ondulatória Diária (DUP)', 
 'Variação do estímulo a cada sessão dentro da mesma semana. Previne estagnação com variação constante.',
 'Periodização',
 'hipertrofia,força,potência',
 'intermediario',
 '{"estrutura_semanal": {"segunda": {"foco": "hipertrofia", "series": 3, "reps": "10-12"}, "quarta": {"foco": "força", "series": 4, "reps": "4-6"}, "sexta": {"foco": "potência", "series": 5, "reps": "2-3"}}}',
 true),

-- 3. Periodização Ondulatória Semanal (WUP)
('Periodização Ondulatória Semanal (WUP)', 
 'Ondulação do foco de uma semana para outra, não diariamente.',
 'Periodização',
 'hipertrofia,força,potência',
 'intermediario',
 '{"ciclo_semanal": [{"semana": 1, "foco": "hipertrofia", "volume": "alto"}, {"semana": 2, "foco": "força", "intensidade": "alta"}, {"semana": 3, "foco": "potência", "velocidade": "explosão"}, {"semana": 4, "foco": "deload"}]}',
 true),

-- 4. Periodização em Blocos
('Periodização em Blocos', 
 'Blocos altamente especializados, cada um focado no desenvolvimento de uma capacidade motora específica.',
 'Periodização',
 'performance,força,potência',
 'avancado',
 '{"blocos": [{"nome": "Acumulação", "duracao": "2-6 semanas", "foco": "resistência muscular e hipertrofia", "volume": "alto"}, {"nome": "Transmutação", "duracao": "2-4 semanas", "foco": "força máxima ou potência", "intensidade": "alta"}, {"nome": "Realização", "duracao": "1-2 semanas", "foco": "pico de performance", "volume": "muito baixo", "intensidade": "máxima"}]}',
 true),

-- 5. Periodização Reversa
('Periodização Reversa', 
 'Oposto da linear: começa com alta intensidade e baixo volume, depois diminui intensidade e aumenta volume.',
 'Periodização',
 'endurance,força',
 'intermediario',
 '{"fases": [{"nome": "Força/Potência", "volume": "baixo", "intensidade": "alta", "exemplo": "3x3"}, {"nome": "Hipertrofia", "volume": "moderado", "intensidade": "moderada", "exemplo": "3x8"}, {"nome": "Resistência Muscular", "volume": "alto", "intensidade": "baixa", "exemplo": "4x15-20"}]}',
 true),

-- 6. Periodização Conjugada
('Periodização Conjugada (Westside)', 
 'Treina múltiplas qualidades físicas simultaneamente na mesma semana, alternando exercícios principais.',
 'Periodização',
 'força,potência,hipertrofia',
 'avancado',
 '{"estrutura_semanal": {"dia1": {"nome": "Max Effort Superior", "foco": "1-3RM parte superior"}, "dia2": {"nome": "Dynamic Effort Inferior", "foco": "velocidade 50-60% 1RM inferior"}, "dia3": {"nome": "Max Effort Inferior", "foco": "1-3RM parte inferior"}, "dia4": {"nome": "Dynamic Effort Superior", "foco": "velocidade parte superior"}}}',
 true),

-- 7. Modelo de Autorregulação (ART)
('Modelo de Autorregulação (ART)', 
 'Abordagem flexível que ajusta o treino baseado na prontidão e recuperação usando RPE/RIR.',
 'Periodização',
 'personalizado',
 'intermediario',
 '{"principios": {"RPE": "Rate of Perceived Exertion", "RIR": "Reps in Reserve", "exemplo": "Agachamento: 3 séries de 5 repetições @ RPE 8"}, "vantagens": ["Flexibilidade", "Individualização", "Prevenção overtraining"]}',
 true),

-- 8. Periodização em Escada
('Periodização em Escada (Step-Wise)', 
 'Aumento linear da carga por 3-4 semanas, seguido de semana de deload para supercompensação.',
 'Periodização',
 'força,hipertrofia',
 'iniciante',
 '{"exemplo_ciclo": [{"semana": 1, "carga": "3x8 com 80kg"}, {"semana": 2, "carga": "3x8 com 82.5kg"}, {"semana": 3, "carga": "3x8 com 85kg"}, {"semana": 4, "tipo": "deload", "carga": "3x8 com 60kg"}, {"semana": 5, "carga": "3x8 com 87.5kg"}]}',
 true),

-- 9. Periodização Híbrida
('Periodização Híbrida (Linear-Ondulatória)', 
 'Combina estrutura linear de longo prazo com variação ondulatória de curto prazo.',
 'Periodização',
 'hipertrofia,força',
 'intermediario',
 '{"conceito": "Macrociclo linear + microciclo ondulatório", "exemplo": "Bloco de força com variação semanal entre força máxima e força com hipertrofia"}',
 true),

-- 10. Periodização Polarizada
('Periodização Polarizada', 
 'Popular em endurance: 80% volume baixa intensidade + 20% altíssima intensidade, evitando zona moderada.',
 'Periodização',
 'endurance,condicionamento',
 'avancado',
 '{"distribuicao": {"zona1": "80% - baixa intensidade", "zona3": "20% - altíssima intensidade"}, "evitar": "zona cinzenta moderada"}',
 true),

-- 11. Modelo ATR
('Modelo ATR (Acumulação-Transmutação-Realização)', 
 'Versão condensada da Periodização em Blocos para atletas com calendário denso de competições.',
 'Periodização',
 'performance,competição',
 'avancado',
 '{"fases": [{"nome": "Acumulação", "duracao": "2-4 semanas", "foco": "volume para acumular fadiga"}, {"nome": "Transmutação", "duracao": "1-3 semanas", "foco": "conversão em performance específica"}, {"nome": "Realização", "duracao": "1-2 semanas", "foco": "tapering para pico"}]}',
 true),

-- 12. Periodização por Níveis
('Periodização por Níveis (Tier System)', 
 'Organiza sessões em níveis de prioridade baseados em padrões de movimento.',
 'Periodização',
 'funcional,força',
 'intermediario',
 '{"niveis": [{"nivel1": "Prioridade máxima - exercício principal", "exemplo": "Agachamento"}, {"nivel2": "Suplementar - complementa principal", "exemplo": "Afundo Búlgaro"}, {"nivel3": "Acessórios - hipertrofia e correções", "exemplo": "Extensora, Stiff"}]}',
 true),

-- 13. Periodização de Pêndulo
('Periodização de Pêndulo', 
 'Alterna foco entre dois objetivos complementares em microciclos, como um pêndulo.',
 'Periodização',
 'hipertrofia,força',
 'intermediario',
 '{"conceito": "Alternância entre volume e intensidade", "ciclo": [{"micro1": "Ênfase em Volume"}, {"micro2": "Ênfase em Intensidade"}, {"micro3": "Retorno ao Volume com cargas maiores"}]}',
 true),

-- 14. Periodização Cíclica
('Periodização Cíclica', 
 'Repetição do mesmo ciclo para desenvolvimento contínuo, quebrando PRs a cada ciclo.',
 'Periodização',
 'lifestyle,progresso',
 'intermediario',
 '{"caracteristicas": ["Ciclos de 4-8 semanas", "Foco em quebrar PRs", "Desenvolvimento contínuo", "Sem pico específico"], "ideal": "Lifestyle lifters"}',
 true),

-- 15. Periodização de Potência-Velocidade
('Periodização de Potência-Velocidade', 
 'Modelo linear focado especificamente no desenvolvimento de potência e velocidade explosiva.',
 'Periodização',
 'potência,velocidade,explosão',
 'avancado',
 '{"fases": [{"fase1": "Força Máxima - base de força"}, {"fase2": "Conversão para Potência - 80-90% 1RM"}, {"fase3": "Velocidade-Força - 50-70% 1RM rápido"}, {"fase4": "Velocidade - pouca carga, pliometria"}]}',
 true);;
