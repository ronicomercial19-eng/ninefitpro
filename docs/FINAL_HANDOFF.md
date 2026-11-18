# Handoff final — NineFitPro

A main contém os blocos 1–6 executados.
Última correção de consistência: Hub, 18/11/2026. A Fase 1 está em [HANDOFF_FASE1_HUB.md](HANDOFF_FASE1_HUB.md). A Fase 2 permanece em [HANDOFF_FASE2_TRAIN.md](HANDOFF_FASE2_TRAIN.md). A Fase 3 está em [HANDOFF_FASE3_INICIO.md](HANDOFF_FASE3_INICIO.md). A Fase 4 está em [HANDOFF_FASE4_PERFIL.md](HANDOFF_FASE4_PERFIL.md). A Fase 5 está em [HANDOFF_FASE5_RON.md](HANDOFF_FASE5_RON.md).

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

## O que entrou em 18/11/2026 no Hub
- `weekSessionSuffix` e a barra do `FitOSConsoleDock` só desenham N/5 com a semana confirmada.
- Cobertura de 7 dias do registro rápido distingue lendo, não confirmado e zero real.
- Falha de `vw_fitpro_diet_context` não apaga um plano já lido e trava o atalho de nutrição com "Plano não confirmado".

## Pendências conhecidas
- Fases 6 a 8 ainda não foram reabertas nesta rodada: módulos do ecossistema, painel do professor e o passo final aluno/professor.
- O redesign Nine Core do painel do professor (05/11/2026) não foi reaberto aqui.
- 5 módulos em atenção/configuração.
- 5 tabelas RLS sem política.
- QA visual depende do preview do Lovable.
- SmartTreino, SmartPeriodizer, Progress, Postura Pro e HealthFlix devem manter seus frontends próprios.
- Comunidade e Postura Pro seguem com dependência externa documentada em [auditoria-integracoes-professor-2026-11-01.md](auditoria-integracoes-professor-2026-11-01.md).
