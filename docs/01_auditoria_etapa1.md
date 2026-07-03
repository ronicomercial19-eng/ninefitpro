# Auditoria — Etapa 1: Diagnóstico + Mapeamento de Arquitetura

Este documento acompanha o arquivo `sql/01_diagnostico_schema.sql` e descreve a checklist de auditoria a ser marcada após a execução dos selects no Supabase (modo leitura).

Instruções
1. Abra o Supabase SQL Editor (staging).
2. Cole e execute os blocos do arquivo `sql/01_diagnostico_schema.sql` um a um.
3. Revise os resultados e marque cada item na checklist abaixo. Se algum item falhar, cole o resultado/erro aqui e pare: não prossiga para Etapa 2.

Checklist da Auditoria — Etapa 1

- [ ] `strength_records.user_id` é `auth.users.id` (confirmado via athlete_auth_link)
  - Como verificar: no output de `SELECT ... FROM information_schema.columns WHERE table_name = 'strength_records'` confirme a coluna `user_id` existe; depois rode uma query para checar a relação com `athlete_auth_link` em staging:
    - SELECT column_name FROM information_schema.columns WHERE table_name = 'strength_records';
    - SELECT * FROM athlete_auth_link WHERE user_id IS NOT NULL LIMIT 5;

- [ ] `personal_records.aluno_id` existe
  - Verificar coluna `aluno_id` dentro de `personal_records`.

- [ ] `workout_exercise_sets` tem `execution_id`, `rpe`, `actual_weight`, `completed`
  - Verificar existência dessas colunas no output do information_schema.

- [ ] Bio tables usam `user_id`
  - Tabelas: `bio_sleep_logs`, `bio_recovery_state`, `bio_heart_rate_logs`, `bio_hrv_logs` devem ter coluna `user_id`.

- [ ] `vw_athlete_periodizacao_ativa` existe e está funcional
  - Verificar que `pg_get_viewdef('public.vw_athlete_periodizacao_ativa'::regclass, true)` retorna uma definição SQL. Se lançar erro, a view não existe ou há problema de permissão.

- [ ] Nenhuma coluna crítica faltando (se faltar, reportar antes de continuar)
  - Lista de colunas críticas a confirmar: `athletes.id`, `athletes.user_id`, `workout_executions.id`, `workout_executions.athlete_id`, `user_plans.id`, `user_plans.user_id`.

Resultados esperados
- Se todos os itens acima estiverem marcados, responda neste PR com "Etapa 1 aprovada" e eu continuo para a Etapa 2.
- Se algum item falhar, cole os resultados (outputs ou erros) aqui e eu ajudarei a diagnosticar a correção.

Notas de segurança
- Não executar DDL ou DML neste momento.
- Não inclua chaves/credenciais nos comentários.

Meta: após aprovação desta Etapa 1, eu criarei e commitarei os arquivos SQL da Etapa 2 e abrirei PRs separados conforme sua preferência (aqui você pediu para preparar os arquivos e aguardar commit). 

-- 9FIT TEAM — Patch 7 — Etapa 1
