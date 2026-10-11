# Contrato de loops do FitPro

Complementa `docs/macro01/data-contracts.md` (fontes de verdade) e `docs/macro01/function-inventory.md`.

## Padrão

Todo loop segue: **gatilho → ação (RPC/trigger no banco) → evento → sync/XP → notificação**.

- A lógica fica no banco (RPC `security definer` com checagem de posse), nunca só no front.
- O servidor decide valores de recompensa; o cliente nunca manda XP.
- O evento do loop vai para `master_registry` por `fn_loop_emit` (telemetria/projeção; não prova pagamento ou execução). Eventos de domínio continuam em `system_events`.
- Falha de registro de evento ou de XP nunca quebra a ação do aluno.
- Escritas idempotentes: dedupe por conteúdo e tetos diários onde há recompensa.
- XP oficial: `athletes.total_xp` via `fn_award_xp`. `xp_total` é legado (só leitura pelo ai-coach); `level` vem só de `fn_award_xp`.

## Eventos (master_registry)

| Loop | event_type | source |
|---|---|---|
| Calibração diária | `daily_calibration` | `calibracao` |
| Treino concluído | `workout_complete` | `train` |
| Compartilhamento | `share_completed` | `share` |
| Biblioteca/protocolo concluído | `protocol_completed` | `library` |

## Status dos loops (07/10/2026)

| Loop | Estado |
|---|---|
| Treino rápido | Seleção estruturada sem random; trava de restrição em todos os caminhos (legado vira mobilidade); Ativação funciona |
| Treino da semana | Gerado sob demanda em `fn_get_week_workouts` |
| Ajuste de treino | Existente (`fn_ajustar_treino_dia`) |
| Sync score | Considera sono, energia, humor, motivação, alimentação e dor |
| Calibração diária | Emite evento; alimenta o sync score |
| PDI | Ficha dinâmica existente (DynamicPDI); recolhida no Perfil |
| Planejamento | 44 modelos publicados, regras e nível completos |
| Progress tracker | Existente |
| RON | Depende de chave de IA própria (pendente) |
| Iniciar/finalizar treino | `completed` ok; `skipped` pendente (responsável: Rony) |
| Nine/Lima | Fallback de nível; data local no front |
| Streaming | = biblioteca (`student_library_assignments`); tabelas HealthFlix marcadas como legado |
| Infoprodutos | Player dentro do FitPro com progresso, retomada e conclusão em 90% (ver `LIBRARY_PLAYER_CONTRACT.md`; falta o lado da biblioteca) |
| Completar perfil | Existente (ID Card) |
| Compartilhamento | XP pago no servidor por trigger, dedupe e teto de 3/dia |
| Modo de assistência | Não definido; sem implementação |
