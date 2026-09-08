# Validação de Contratos — Notificações e Recap

## Consultas identificadas no ninefitpro-

O recap semanal consulta:
- `workout_executions` por `athlete_id`, `status = completed`, `completed_at`;
- `personal_records` por `athlete_id`, `created_at`;
- `sync_score_logs` por `user_id`, `created_at`, campo `score`.

## Compatibilidade aparente

As consultas usam identificadores escopados ao usuário/atleta e não fazem leitura global. O componente retorna estado vazio quando não há atividade real.

## Validações ainda necessárias

A existência das colunas no código não comprova as políticas RLS. Antes de integrar, confirmar no projeto Supabase:
- RLS habilitado nas três tabelas;
- política que relaciona `athlete_id` ao usuário autenticado;
- política que relaciona `sync_score_logs.user_id` a `auth.uid()`;
- ausência de políticas permissivas para `anon`;
- índices em `athlete_id`, `user_id` e datas;
- timezone consistente com a janela de sete dias.

## Decisão

O contrato de consulta é aceitável para adaptação, mas a integração fica bloqueada até a confirmação das políticas RLS no ambiente Supabase. Não adicionar migrations automaticamente.
