# Fase 15 — status de segurança e performance

Última verificação: 2026-09-21, projeto Supabase `mfrydtrzjxscbkaiwfnw`.

## Correções aplicadas

- `vw_athlete_periodizacao_ativa` configurada como `security_invoker`.
- `fn_map_phase_category`, `fn_check_catalog_published_complete` e `is_admin()` receberam `search_path` fixo.
- A sobrecarga sem argumentos de `is_admin()` deixou de ser executável por clientes.
- `_goal_defaults` e as 11 tabelas internas receberam RLS e política explícita de negação para `anon`/`authenticated`.
- Três RPCs legados/internos sem uso no cliente tiveram o acesso de cliente revogado: `_selecionar_exercicios_bloco`, `audit_alunos_changes` e `deprecated_prescrever_treino_rapido`.

## Advisor de segurança restante

- 156 funções `SECURITY DEFINER` ainda executáveis por `authenticated`; precisam de classificação individual antes de revogar, porque várias são chamadas pelo produto.
- 1 função de integração (`validate_partner_key`) ainda executável por `anon`.
- Extensões `vector` e `btree_gin` no schema `public`.
- Políticas que permitem acesso anônimo em tabelas legadas/compatibilidade.
- OTP acima de uma hora, proteção contra senhas vazadas desativada e atualização de Postgres disponível.

## Advisor de performance restante

- 296 avisos de `auth_rls_initplan`.
- 340 avisos de políticas permissivas múltiplas.
- 144 índices não utilizados e 1 tabela sem chave primária.

Esses itens não foram mascarados como concluídos. A próxima etapa deve tratar RPCs por grupo de uso, validar os fluxos após cada revogação e só então atualizar o status final da Fase 15.
