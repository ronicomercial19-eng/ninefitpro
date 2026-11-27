# Handoff final — NineFitPro

A main contém os blocos 1–6 executados.
Última correção de consistência: módulos do ecossistema, 27/11/2026. A Fase 1 está em [HANDOFF_FASE1_HUB.md](HANDOFF_FASE1_HUB.md). A Fase 2 permanece em [HANDOFF_FASE2_TRAIN.md](HANDOFF_FASE2_TRAIN.md). A Fase 3 está em [HANDOFF_FASE3_INICIO.md](HANDOFF_FASE3_INICIO.md). A Fase 4 está em [HANDOFF_FASE4_PERFIL.md](HANDOFF_FASE4_PERFIL.md). A Fase 5 está em [HANDOFF_FASE5_RON.md](HANDOFF_FASE5_RON.md). A Fase 6 está em [HANDOFF_FASE6_ECOSSISTEMA.md](HANDOFF_FASE6_ECOSSISTEMA.md).

## Publicação Lovable
1. Sincronizar a branch main.
2. Executar build.
3. Validar login e perfil Fernanda.
4. Validar /9fit/hub, /9fit/os, /9fit/dieta, /9fit/ron e cards do ecossistema.
5. Validar iframe interno e compartilhamentos.
6. No Hub e no Início, com a leitura do plano falhando, o selo não pode dizer "SEM CICLO ATIVO".
7. No Hub, antes do snapshot, o brief não pode dizer "Sem treino registrado" nem mostrar 0/5, e a barra de consistência não pode pintar preenchimento. Com snapshot vazio, esse texto e o 0/5 continuam válidos.
8. No Hub e no Perfil, "professor ainda não vinculou" só depois que a consulta confirma que não há ficha. Falha de leitura pede nova tentativa e não desenha cartão com nível 1 ou 0 XP.
9. No RON, falha ao ler o histórico não pode abrir a saudação de conversa vazia. Sem texto do coach, o balão não pode dizer "Entendido! Processando diretrizes."
10. No registro rápido do Hub, antes da primeira leitura, não pode aparecer "0 de 7 dias". Falha do plano alimentar não pode virar "Escolher refeição".
11. No card "Sua alimentação hoje", antes da leitura, não pode aparecer "sem meta prescrita". Se a leitura já tinha voltado e um refresh falha, kcal e plano não somem. O texto ao RON não pode dizer "nenhum" plano nem "0 refeições" enquanto o dia não foi confirmado.
12. No card do RON dentro do Hub, SYNC carregando ou em erro não pode dizer "Comece contando como você está hoje." nem abrir a calibração. Uma falha ao reler os resultados não pode apagar os cards da semana já mostrados.
13. No ritmo de 7 dias, uma semana já confirmada não pode virar "Curva indisponível" só porque o refresh falhou.
14. No Hub, ciclo ou biblioteca já confirmados não podem sumir só porque o refresh falhou. Sem leitura anterior, falha do plano continua "CICLO NÃO CONFIRMADO" e não "SEM CICLO ATIVO".
15. Em `/9fit/modules`, falha ao ler o catálogo não pode dizer "Catálogo em modo de reserva", "temporariamente indisponível" nem "0 destinos configurados". Uma atualização que falha não apaga o catálogo já confirmado.

## O que entrou em 27/11/2026 nos módulos
- `catalogAfterRead` separa a primeira falha de uma atualização que falha.
- A primeira falha mantém os módulos conhecidos abríveis e diz "Leitura do módulo não confirmada".
- Status, lista e iframe já confirmados permanecem quando a consulta seguinte falha no mesmo escopo.

## O que entrou em 25/11/2026 no Hub
- `planAfterRead` e `libraryAfterRead` separam a primeira falha de uma atualização que falha.
- O selo, o nome do plano e a contagem da biblioteca permanecem quando a consulta seguinte falha para o mesmo atleta.
- O aviso de atualização não diz que os dados deixaram de existir. A linha "Carregando seus dados…" não cobre uma leitura que já voltou.

## O que entrou em 18/11/2026 no Hub
- `weekSessionSuffix` e a barra do `FitOSConsoleDock` só desenham N/5 com a semana confirmada.
- Cobertura de 7 dias do registro rápido distingue lendo, não confirmado e zero real.
- Falha de `vw_fitpro_diet_context` não apaga um plano já lido e trava o atalho de nutrição com "Plano não confirmado".

## O que entrou em 20/11/2026 no Hub
- `nutritionRead` distingue lendo, não confirmado, pronto e leitura anterior com refresh falho.
- O card compacto e o resumo de alimentação usam essa regra. Uma falha de `useNutritionToday` não apaga o dia já lido e uma exceção não deixa o loading preso.

## O que entrou em 24/11/2026 no Hub
- `ronTodayCopy` separa leitura em curso e falha do convite de calibração. Offline, leitura desatualizada e dia ainda sem SYNC continuam iguais.
- `useRonResultCards` deixa os slides confirmados no lugar quando a consulta seguinte falha.
- `coverageReadState` mantém o ritmo de 7 dias já lido durante um refresh que falha.

## Pendências conhecidas
- Fase 6 do catálogo do aluno foi reaberta em 27/11/2026. Fases 7 e 8 desta rodada continuam abertas: painel do professor com as APIs respectivas e o passo final aluno/professor.
- O redesign Nine Core do painel do professor (05/11/2026) não foi reaberto aqui.
- 5 módulos em atenção/configuração.
- 5 tabelas RLS sem política.
- QA visual depende do preview do Lovable.
- SmartTreino, SmartPeriodizer, Progress, Postura Pro e HealthFlix devem manter seus frontends próprios.
- Comunidade e Postura Pro seguem com dependência externa documentada em [auditoria-integracoes-professor-2026-11-01.md](auditoria-integracoes-professor-2026-11-01.md).
