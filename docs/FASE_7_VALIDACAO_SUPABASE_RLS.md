# Fase 7 — validação Supabase/RLS e smoke test

Este roteiro deve ser executado no projeto Supabase conectado ao `ninefitpro`. As migrations precisam ser aplicadas nesta ordem:

1. `20260908232549_hub_snapshot_contract.sql`
2. `20260908235741_reconcile_identity_and_score_contract.sql`
3. `20260909000014_workout_execution_contract.sql`

## Pré-check

- Confirmar backup/snapshot do banco.
- Confirmar que `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e demais secrets existem apenas em Edge Functions.
- Confirmar que o usuário de teste possui um único vínculo canônico em `athletes.user_id` ou `athlete_auth_link`.

## RLS negativo/positivo

Executar com dois usuários autenticados diferentes:

- Usuário A deve conseguir chamar `fn_get_hub_snapshot()` e iniciar apenas assignment pertencente a A.
- Usuário B deve receber `assignment_access_denied` ao tentar iniciar o assignment de A.
- `get_athlete_scores(athlete_id_de_outro_usuario)` deve retornar `athlete_access_denied`.
- Usuário anônimo não deve executar `fn_current_athlete_id()`, `get_athlete_scores(uuid)` ou os RPCs de execução.
- Repetir `fn_save_workout_set` para a mesma execução/exercício/série deve atualizar a mesma linha, nunca duplicar.

## Smoke test funcional

1. Login → carregamento do Hub sem spinner infinito.
2. Abrir treino → iniciar execução.
3. Marcar série → recarregar → série permanece marcada.
4. Finalizar sem séries → bloqueado.
5. Finalizar com uma série → execução fica `completed`.
6. Dor sem variação segura → RON não afirma ajuste sem confirmação do RPC.
7. Checkout → mensagem de outra origem/janela é ignorada.
8. Checkout success → só exibe acesso após entitlement ativo pelo webhook.
9. Push → subscription é criada/removida pelo usuário autenticado.

## Critério de aceite

A fase só pode ser marcada como concluída quando:

- migrations aplicadas sem erro;
- testes positivo/negativo acima registrados;
- Edge Functions implantadas;
- um dispositivo mobile real conclui o smoke test;
- webhook assinado do provedor de pagamento confirmado.

Sem esses resultados, o PR permanece aberto e o deploy de produção não deve ser considerado validado.
