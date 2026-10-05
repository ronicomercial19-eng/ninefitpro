# Macro 03 — periodização, calendário e execução semanal

## Entregas

- **Meso 3.1 — Calendário:** calendário de Planejamento navega entre meses e abre Train já no dia selecionado; visão semanal mostra uma semana por vez com navegação pelos dias e semanas.
- **Meso 3.2 — Prescrição:** a semana pode ser completada a partir de periodização ativa. Geração idempotente por aluno/semana, sem apagar treino existente, treino rápido ou execução iniciada/concluída/pulada. O gerador legado delega ao novo contrato.
- **Meso 3.3 — Execução:** início/retomada continua no player guiado, assistência Ron permanece integrada e “Não vou treinar” cria status persistente `skipped` sem mexer na prescrição. Somente o treino de hoje pode ser pulado.
- **Meso 3.4 — SYNC:** XP não depende de SYNC. Consumidores migrados usam contexto diário e exibem ausência como “Sem leitura”; não há fallback inventado para prontidão.
- **Meso 3.5 — Datas:** telas ajustadas usam `America/Sao_Paulo` para calendário, execução, semana e Nine/Lima.

## Guardrails da geração

- Apenas segunda-feira inicia semana; geração limitada à semana atual até 12 semanas adiante.
- Requer periodização ativa. Frequência vem da regra ativa do SmartTreino ou do perfil, com fallback de três dias; dias selecionados são previsíveis.
- Uma trava transacional por atleta/semana impede chamadas simultâneas duplicadas.
- Prescrições (incluindo treino rápido) e execuções existentes são preservadas; a função aborta atomicamente se uma sessão planejada não puder ser produzida. Execuções em andamento não podem ser descartadas pelo comando de pular.
- `prescrever_treino` segue os protocolos atribuídos, mas a seleção é determinística por aluno/data/bloco e impede repetição dentro de cada bloco da sessão; não usa `random()`.

## Banco e release

Migrations: `20261005200347_macro03_periodized_week_and_execution_states.sql`, `20261005202000_macro03_preserve_quick_workouts.sql`, `20261005202500_macro03_preserve_open_executions.sql` e `20261005203000_macro03_deterministic_periodized_selection.sql`.

Aplicada ao projeto FitPro `mfrydtrzjxscbkaiwfnw`. A consulta direta de smoke test via ferramenta administrativa não tem JWT de aluno e foi corretamente recusada por `not_authorized_for_athlete`; leitura funcional exige sessão de aluno pelo app. QA funcional com conta real ainda não está confirmado.

## Verificação

- `tsc -b --pretty false`: PASS.
- `scripts/qa-macro03.ts`: PASS.
- `scripts/qa-macro02.ts`: PASS.
- `vite build`: não validado; o binding nativo SWC falhou na instalação no Windows (restrição ACL do cache nativo e fallback requer `npm`, ausente no ambiente). CI quality-gates executará o build em Linux.
- QA visual/execução com sessão de aluno: checklist do usuário; validar troca de semana, gerar sem duplicar, iniciar/retomar, pular, histórico e RON durante a sessão.

## Próximo macro

O pedido de streaming HealthFlix foi registrado em [Macro 05](../macro05/healthflix-fitpro-integration.md). A autenticação do estudante e o contrato de progresso/retomada precisam ser verificados no serviço remoto antes de exibir promessas de progresso salvo.
