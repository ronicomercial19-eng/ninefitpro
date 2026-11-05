# Handoff final — NineFitPro

A main contém os blocos 1–6 executados.
Última correção de consistência: brief semanal do Hub e do Início, 05/11/2026. A Fase 1 está em [HANDOFF_FASE1_HUB.md](HANDOFF_FASE1_HUB.md). A Fase 2 permanece em [HANDOFF_FASE2_TRAIN.md](HANDOFF_FASE2_TRAIN.md). A Fase 3 está em [HANDOFF_FASE3_INICIO.md](HANDOFF_FASE3_INICIO.md).

## Publicação Lovable
1. Sincronizar a branch main.
2. Executar build.
3. Validar login e perfil Fernanda.
4. Validar /9fit/hub, /9fit/os, /9fit/dieta, /9fit/ron e cards do ecossistema.
5. Validar iframe interno e compartilhamentos.
6. No Hub e no Início, com a leitura do plano falhando, o selo não pode dizer "SEM CICLO ATIVO".
7. No Hub, antes do snapshot, o brief não pode dizer "Sem treino registrado" nem mostrar 0/5. Com snapshot vazio, esse texto continua válido.

## Pendências conhecidas
- Fases 4 a 8 ainda não foram reabertas nesta rodada: Perfil, RON, módulos do ecossistema, painel do professor e o passo final aluno/professor.
- O redesign Nine Core do painel do professor (05/11/2026) não foi reaberto aqui.
- 5 módulos em atenção/configuração.
- 5 tabelas RLS sem política.
- QA visual depende do preview do Lovable.
- SmartTreino, SmartPeriodizer, Progress, Postura Pro e HealthFlix devem manter seus frontends próprios.
- Comunidade e Postura Pro seguem com dependência externa documentada em [auditoria-integracoes-professor-2026-11-01.md](auditoria-integracoes-professor-2026-11-01.md).
