-- Item H: preenche conteúdo real (macrocycle/mesocycle/microcycle) dos 30 modelos
-- do banco que estavam vazios, seguindo o mesmo padrão dos 14 já completos.
-- macrocycle: array de fases (usado por fn_generate_plan_from_bank_model).
-- mesocycle/microcycle: array-de-array de strings (mesmo formato dos modelos existentes),
-- usados hoje só para exibição na aba Banco (contagem/preview).

update periodization_models set
  macrocycle = '["Adaptação","Consolidação","Manutenção"]'::jsonb,
  mesocycle = '[["Sem 1-8: adaptação de rotina","Sem 9-16: consolidação de hábito","Sem 17-24: manutenção e ajustes"]]'::jsonb,
  microcycle = '[["2 sessões funcionais","2 sessões cardio leve","1 sessão mobilidade"]]'::jsonb,
  recommended_for = '["iniciantes","população geral","baixo nível de atividade prévia"]'::jsonb
where id = 'm11';

update periodization_models set
  macrocycle = '["Reativação","Reintegração ao esforço"]'::jsonb,
  mesocycle = '[["Sem 1-6: reativação sem carga","Sem 7-12: reintegração progressiva"]]'::jsonb,
  microcycle = '[["3 sessões mobilidade/ativação","1 sessão força leve supervisionada"]]'::jsonb,
  recommended_for = '["pós-lesão leve","retorno ao treino","idosos"]'::jsonb
where id = 'm23';

update periodization_models set
  macrocycle = '["Adaptação","Consolidação","Manutenção","Revisão anual"]'::jsonb,
  mesocycle = '[["Sem 1-8: adaptação","Sem 9-28: consolidação","Sem 29-44: manutenção","Sem 45-48: revisão e reavaliação"]]'::jsonb,
  microcycle = '[["2 sessões funcionais","2 sessões cardio leve","1 sessão mobilidade/flexibilidade"]]'::jsonb,
  recommended_for = '["população geral","manutenção de saúde a longo prazo"]'::jsonb
where id = 'm27';

update periodization_models set
  macrocycle = '["Adaptação metabólica","Déficit calórico moderado"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação com peso corporal","Sem 5-12: circuitos com déficit calórico"]]'::jsonb,
  microcycle = '[["3 sessões circuito funcional","2 sessões cardio em casa"]]'::jsonb,
  recommended_for = '["sem acesso a academia","iniciante/intermediário"]'::jsonb
where id = 'm26';

update periodization_models set
  macrocycle = '["Adaptação (2 sem)","Déficit progressivo (8 sem)","Finalização (2 sem)"]'::jsonb,
  mesocycle = '[["Sem 1-2: adaptação","Sem 3-10: déficit calórico progressivo","Sem 11-12: finalização e reavaliação"]]'::jsonb,
  microcycle = '[["3 sessões musculação full body","2 sessões cardio moderado"]]'::jsonb,
  recommended_for = '["cut curto","intermediário"]'::jsonb
where id = 'm09';

update periodization_models set
  macrocycle = '["Adaptação","Déficit ondulatório","Platô/ajuste","Finalização"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação","Sem 5-16: déficit com refeeds ondulatórios","Sem 17-20: ajuste de platô","Sem 21-24: finalização"]]'::jsonb,
  microcycle = '[["4 sessões musculação","2 sessões cardio intervalado"]]'::jsonb,
  recommended_for = '["intermediário","histórico de dieta anterior"]'::jsonb
where id = 'm10';

update periodization_models set
  macrocycle = '["Adaptação","Volume","Intensificação","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação ABC","Sem 5-16: volume progressivo","Sem 17-20: intensificação","Sem 21-24: deload"]]'::jsonb,
  microcycle = '[["Treino A","Treino B","Treino C — repetido 2x/semana cada"]]'::jsonb,
  recommended_for = '["intermediário","academia tradicional"]'::jsonb
where id = 'm22';

update periodization_models set
  macrocycle = '["Base","Força-hipertrofia conjugada","Pico","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-4: base geral","Sem 5-16: força máxima + hipertrofia simultâneas","Sem 17-20: pico","Sem 21-24: deload"]]'::jsonb,
  microcycle = '[["Dia de força máxima","Dia de volume hipertrofia","Dia de acessórios"]]'::jsonb,
  recommended_for = '["intermediário/avançado"]'::jsonb
where id = 'm14';

update periodization_models set
  macrocycle = '["Adaptação neural","Consolidação de técnica"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação neural full body","Sem 5-12: consolidação de técnica e progressão de carga"]]'::jsonb,
  microcycle = '[["3 sessões full body/semana"]]'::jsonb,
  recommended_for = '["iniciante absoluto"]'::jsonb
where id = 'm19';

update periodization_models set
  macrocycle = '["Base de força","Hipertrofia","Força-hipertrofia mista","Pico","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-8: base de força","Sem 9-24: hipertrofia","Sem 25-40: mista","Sem 41-44: pico","Sem 45-48: deload"]]'::jsonb,
  microcycle = '[["Upper força","Lower força","Upper hipertrofia","Lower hipertrofia"]]'::jsonb,
  recommended_for = '["intermediário/avançado","objetivo misto"]'::jsonb
where id = 'm16';

update periodization_models set
  macrocycle = '["Adaptação (8 sem)","Volume (24 sem)","Intensificação (12 sem)","Deload (4 sem)"]'::jsonb,
  mesocycle = '[["Sem 1-8: adaptação","Sem 9-32: volume progressivo","Sem 33-44: intensificação","Sem 45-48: deload"]]'::jsonb,
  microcycle = '[["4 sessões split muscular","progressão linear de carga semanal"]]'::jsonb,
  recommended_for = '["iniciante/intermediário","ganho de massa a longo prazo"]'::jsonb
where id = 'm01';

update periodization_models set
  macrocycle = '["Adaptação (4 sem)","Volume (12 sem)","Intensificação (6 sem)","Deload (2 sem)"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação","Sem 5-16: volume","Sem 17-22: intensificação","Sem 23-24: deload"]]'::jsonb,
  microcycle = '[["4 sessões split muscular"]]'::jsonb,
  recommended_for = '["intermediário"]'::jsonb
where id = 'm02';

update periodization_models set
  macrocycle = '["Adaptação","Ondulação volume/intensidade (bloco 1)","Ondulação volume/intensidade (bloco 2)","Pico","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-6: adaptação","Sem 7-24: ondulação bloco 1","Sem 25-40: ondulação bloco 2","Sem 41-44: pico","Sem 45-48: deload"]]'::jsonb,
  microcycle = '[["Semana alto volume","Semana alta intensidade — alternadas"]]'::jsonb,
  recommended_for = '["intermediário/avançado"]'::jsonb
where id = 'm03';

update periodization_models set
  macrocycle = '["Bloco de Acumulação","Bloco de Transformação","Bloco de Realização"]'::jsonb,
  mesocycle = '[["Sem 1-8: acumulação","Sem 9-16: transformação","Sem 17-24: realização"]]'::jsonb,
  microcycle = '[["4 sessões split por grupo muscular"]]'::jsonb,
  recommended_for = '["intermediário/avançado"]'::jsonb
where id = 'm04';

update periodization_models set
  macrocycle = '["Base de força","Hipertrofia acessória","Pico de força","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-12: base de força (levantamentos básicos)","Sem 13-32: hipertrofia acessória","Sem 33-44: pico de força","Sem 45-48: deload"]]'::jsonb,
  microcycle = '[["Dia de agachamento","Dia de supino","Dia de terra","Dias de acessórios/hipertrofia"]]'::jsonb,
  recommended_for = '["intermediário/avançado","objetivo força+estética"]'::jsonb
where id = 'm17';

update periodization_models set
  macrocycle = '["Base de força","Hipertrofia acessória","Pico","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-6: base de força","Sem 7-16: hipertrofia acessória","Sem 17-22: pico","Sem 23-24: deload"]]'::jsonb,
  microcycle = '[["Dia de agachamento","Dia de supino","Dia de terra","Dia de acessórios"]]'::jsonb,
  recommended_for = '["intermediário"]'::jsonb
where id = 'm18';

update periodization_models set
  macrocycle = '["Adaptação","Volume PPL","Intensificação","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação","Sem 5-16: volume PPL 2x/semana","Sem 17-20: intensificação","Sem 21-24: deload"]]'::jsonb,
  microcycle = '[["Push","Pull","Legs — repetido 2x/semana"]]'::jsonb,
  recommended_for = '["intermediário"]'::jsonb
where id = 'm21';

update periodization_models set
  macrocycle = '["Adaptação","Volume Upper/Lower","Intensificação","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação","Sem 5-16: volume","Sem 17-20: intensificação","Sem 21-24: deload"]]'::jsonb,
  microcycle = '[["Upper A","Lower A","Upper B","Lower B"]]'::jsonb,
  recommended_for = '["intermediário"]'::jsonb
where id = 'm20';

update periodization_models set
  macrocycle = '["Base aeróbica","Força complementar","Específico de prova","Taper"]'::jsonb,
  mesocycle = '[["Sem 1-8: base aeróbica + força geral","Sem 9-16: força complementar específica","Sem 17-22: trabalho específico de prova","Sem 23-24: taper"]]'::jsonb,
  microcycle = '[["2 sessões corrida","2 sessões força complementar","1 mobilidade"]]'::jsonb,
  recommended_for = '["corredores amadores"]'::jsonb
where id = 'm24';

update periodization_models set
  macrocycle = '["Base geral","Força e potência","Específico de luta","Taper"]'::jsonb,
  mesocycle = '[["Sem 1-8: base geral","Sem 9-16: força e potência","Sem 17-22: específico de luta","Sem 23-24: taper pré-competição"]]'::jsonb,
  microcycle = '[["2 sessões força","2 sessões potência/pliometria","1 mobilidade/recuperação"]]'::jsonb,
  recommended_for = '["lutadores amadores"]'::jsonb
where id = 'm25';

update periodization_models set
  macrocycle = '["Base","Força máxima conjugada","Potência","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-4: base","Sem 5-16: força máxima + velocidade conjugadas","Sem 17-20: potência","Sem 21-24: deload"]]'::jsonb,
  microcycle = '[["Dia de esforço máximo","Dia de esforço dinâmico","Dia de esforço repetido"]]'::jsonb,
  recommended_for = '["avançado","atletas de força"]'::jsonb
where id = 'm15';

update periodization_models set
  macrocycle = '["Adaptação com peso corporal/elásticos","Força progressiva","Consolidação"]'::jsonb,
  mesocycle = '[["Sem 1-6: adaptação","Sem 7-18: força progressiva com carga mínima","Sem 19-24: consolidação"]]'::jsonb,
  microcycle = '[["3 sessões força","2 sessões mobilidade/core"]]'::jsonb,
  recommended_for = '["sem acesso a equipamento","iniciante/intermediário"]'::jsonb
where id = 'm28';

update periodization_models set
  macrocycle = '["Hipertrofia de base","Força submáxima","Força máxima","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-6: hipertrofia de base","Sem 7-14: força submáxima","Sem 15-22: força máxima (>85% 1RM)","Sem 23-24: deload"]]'::jsonb,
  microcycle = '[["Dia de agachamento","Dia de supino","Dia de terra","Dia de acessórios"]]'::jsonb,
  recommended_for = '["intermediário/avançado","foco em 1RM"]'::jsonb
where id = 'm05';

update periodization_models set
  macrocycle = '["Hipertrofia de base","Força submáxima","Força máxima (bloco 1)","Força máxima (bloco 2)","Pico + Deload"]'::jsonb,
  mesocycle = '[["Sem 1-10: hipertrofia de base","Sem 11-20: força submáxima","Sem 21-32: força máxima bloco 1","Sem 33-44: força máxima bloco 2","Sem 45-48: pico e deload"]]'::jsonb,
  microcycle = '[["Dia de agachamento","Dia de supino","Dia de terra","Dia de acessórios"]]'::jsonb,
  recommended_for = '["avançado","powerlifting"]'::jsonb
where id = 'm06';

update periodization_models set
  macrocycle = '["Base geral","Força","Potência","Específico","Taper"]'::jsonb,
  mesocycle = '[["Sem 1-10: base geral","Sem 11-22: força","Sem 23-34: potência","Sem 35-44: específico de modalidade","Sem 45-48: taper"]]'::jsonb,
  microcycle = '[["2 sessões força","2 sessões potência","1 sessão específica de modalidade"]]'::jsonb,
  recommended_for = '["atletas multi-esportivos"]'::jsonb
where id = 'm07';

update periodization_models set
  macrocycle = '["Base geral","Força e potência","Específico","Taper"]'::jsonb,
  mesocycle = '[["Sem 1-6: base geral","Sem 7-16: força e potência","Sem 17-22: específico de modalidade","Sem 23-24: taper"]]'::jsonb,
  microcycle = '[["2 sessões força","2 sessões potência","1 específica"]]'::jsonb,
  recommended_for = '["atletas intermediários"]'::jsonb
where id = 'm08';

update periodization_models set
  macrocycle = '["Base de força","Conversão em potência","Pico de potência","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-8: base de força","Sem 9-16: conversão em potência (pliometria/balístico)","Sem 17-22: pico de potência","Sem 23-24: deload"]]'::jsonb,
  microcycle = '[["Dia de força máxima","Dia de potência/pliometria","Dia de velocidade"]]'::jsonb,
  recommended_for = '["avançado","esportes de potência"]'::jsonb
where id = 'm13';

update periodization_models set
  macrocycle = '["Base física","Força e potência","Específico de campo/quadra","Taper"]'::jsonb,
  mesocycle = '[["Sem 1-6: base física geral","Sem 7-16: força e potência","Sem 17-22: específico de campo/quadra","Sem 23-24: taper"]]'::jsonb,
  microcycle = '[["2 sessões força","2 sessões potência/agilidade","1 específica de modalidade"]]'::jsonb,
  recommended_for = '["esportes de campo/quadra"]'::jsonb
where id = 'm29';

update periodization_models set
  macrocycle = '["Ano 1 - Base geral","Ano 1 - Desenvolvimento","Ano 2 - Especialização","Ano 2 - Pico e transição"]'::jsonb,
  mesocycle = '[["Sem 1-24: base geral (ano 1, 1ª metade)","Sem 25-48: desenvolvimento (ano 1, 2ª metade)","Sem 49-72: especialização (ano 2, 1ª metade)","Sem 73-96: pico e transição (ano 2, 2ª metade)"]]'::jsonb,
  microcycle = '[["3-4 sessões força/condicionamento geral","progressão plurianual"]]'::jsonb,
  recommended_for = '["atletas jovens/base","planejamento de longo prazo"]'::jsonb
where id = 'm30';

update periodization_models set
  macrocycle = '["Adaptação","Resistência de força","Resistência específica","Deload"]'::jsonb,
  mesocycle = '[["Sem 1-4: adaptação","Sem 5-16: resistência de força (altas repetições)","Sem 17-20: resistência específica de modalidade","Sem 21-24: deload"]]'::jsonb,
  microcycle = '[["4 sessões circuito/altas repetições"]]'::jsonb,
  recommended_for = '["intermediário","esportes de resistência"]'::jsonb
where id = 'm12';;
