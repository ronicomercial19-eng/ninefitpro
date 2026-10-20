# Histórico integrado 9FIT

Progress Tracker e FitPro são produtos independentes, com builds e publicação próprios. Ambos apontam para o projeto Supabase `mfrydtrzjxscbkaiwfnw` e usam o mesmo `athlete_id` como identidade canônica do atleta. `athletes.aluno_id` liga registros antigos de `alunos` quando existe.

| Dado | Tabela canônica | Regra de leitura |
| --- | --- | --- |
| Avaliação guiada e profissional | `avaliacoes_unificadas` | `athlete_id`; usar apenas valores presentes. `origem='avaliacao_guiada'` identifica autoavaliação. |
| Treino executado no FitPro | `workout_executions` | `athlete_id`, `status='completed'`; usar `workout_date`. |
| Carga realmente executada | `workout_exercise_sets` | Série concluída com `actual_weight > 0`, ligada a execução concluída. Não equivale a teste 1RM. |
| Recordes | `personal_records` | `athlete_id`; apresentação separada das cargas por série. |
| Treino legado do Progress Tracker | `treinos_realizados`, `registros_carga` | `athlete_id`; unir apenas na leitura e mostrar a origem. |

O leitor comum de Histórico está em `src/services/progressHistoryService.ts`, espelhado no repositório FitPro. Os componentes também são espelhados em `src/components/progress/SharedHistory.tsx`. Alterações futuras no contrato devem ser aplicadas aos dois produtos e verificadas contra o banco compartilhado.

As consultas usam o cliente autenticado e as políticas RLS existentes. Não há tabela nova, cópia de avaliações, chave de serviço no navegador ou cálculo clínico inventado. Quando falta uma métrica, a interface mostra ausência de dados. Comparações usam o primeiro e o último valor registrado da mesma métrica.
