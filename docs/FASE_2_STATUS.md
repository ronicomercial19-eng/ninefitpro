# Fase 2 — Base de qualidade

Status geral: EM EXECUÇÃO

## Escopo e evidências

| Subfase | Escopo | Estado | Evidência atual |
|---|---|---|---|
| 2.1 | Build e ambiente | Validado localmente | `vite build` passou no `main`; warnings de bundle documentados |
| 2.2 | TypeScript e lint | TypeScript validado; lint pendente | `tsc --noEmit` passou; lint global segue informativo por débito legado |
| 2.3 | Rotas | Em auditoria | rotas centralizadas em `src/App.tsx` |
| 2.4 | Loading, erro e vazio | Parcial validado | AppErrorBoundary; Progresso possui erro e retry |
| 2.5 | Persistência e recovery | Validado no escopo do treino | execução aberta reidratada por `execution_id` após reload; recovery amplo da aplicação ainda não é critério do fluxo validado |
| 2.6 | Queries e mutations | Parcial validado | React Query com retry/cache globais; smoke checks passaram |
| 2.7 | Integridade de dados | Parcial | constraints e RPCs canônicas revisadas no fluxo de treino |
| 2.8 | Logs e observabilidade | Parcial | logs estruturados em boundary e fluxos críticos |
| 2.9 | Testes automatizados | Smoke checks validados; suíte ampla pendente | `scripts/qa-fase2.mjs` passou com 11 verificações |
| 2.10 | Mocks e dados falsos | Em auditoria | Progresso consulta RPC real; avaliações oficiais vêm de `avaliacoes_unificadas` |
| 2.11 | Recovery e idempotência | Validado no fluxo de treino | início/conclusão usam execução persistida e a conclusão é coberta pelo smoke test |
| 2.12 | Performance | Validado no gate de bundle | PWA gerada; maior JS 3.603.094 bytes bruto/1.012.554 bytes gzip, dentro dos limites definidos; code splitting segue melhoria futura |
| 2.13 | Segurança mínima | Em execução — bloco final | índices, RLS canônico, views e RPCs internos/de alto impacto foram endurecidos; advisor ainda aponta pendências de domínio amplo |
| 2.14 | QA integrado | Validado pelo usuário | fluxo iniciar → recarregar → séries → finalizar → RPE → progresso → compartilhamento foi validado manualmente |
| 2.15 | Critérios de aceite | Pendente | só fechar após evidências 2.1–2.14 |

## Regra de conclusão

A Fase 2 só será marcada como concluída quando build, typecheck, lint, testes, auditoria de dados, segurança mínima e roteiro integrado estiverem documentados com evidência verificável.

## Evidência local mais recente

Clone do `main` em 21/09/2026:

- `tsc --noEmit`: passou.
- `scripts/qa-fase2.mjs`: passou, 11/11 verificações.
- `vite build`: passou após remover import duplicado de `AppErrorBoundary` em `App.tsx` (commit `61cb2883`), com 4.775 módulos transformados.
- `scripts/performance-fase2.mjs`: passou; maior bundle bruto 3.603.094 bytes e gzip 1.012.554 bytes.
- Warnings restantes: importação mista de `html2canvas` e chunk JavaScript acima de 1 MB.
- `CompleteProfileFlow.tsx`: passou em ESLint sem erros ou warnings.

## Lint global

O lint global permanece pendente por débito legado. A medição atual foi de 657 problemas: 624 erros e 33 warnings. O typecheck continua aprovado; a correção de `DietContentUpload.tsx` removeu dois `any` sem alterar o fluxo funcional.

## Auditoria Supabase

A auditoria foi executada no projeto `mfrydtrzjxscbkaiwfnw`. O lote de performance identificou 8 foreign keys sem índice. Foi criada e aplicada a migration `20260921170000_phase2_cover_foreign_key_indexes.sql`; após a aplicação, o advisor não lista mais `unindexed_foreign_keys`. As migrations `20260921220000_phase2_restrict_high_impact_workout_rpcs.sql` e `20260921221000_phase2_restrict_internal_credits_periodization_rpcs.sql` restringiram dez RPCs de alto impacto/internos a `authenticated`; as verificações SQL confirmaram `anon_execute=false` e `authenticated_execute=true`. Após esses lotes, o advisor registra 142 funções SECURITY DEFINER executáveis por anon, 7 views SECURITY DEFINER e 25 funções com `search_path` mutável. Permanecem warnings de initplan de RLS, policies permissivas múltiplas e itens de segurança que exigem revisão por domínio.

## Próximas pendências da Fase 2

1. Concluir a revisão de segurança por domínio, começando pelo treino e Auth; o usuário pediu que este bloco fique no final.
2. Decidir se o lint legado será reduzido antes do aceite ou ficará como dívida técnica explicitamente registrada.
3. Expandir testes automatizados além dos smoke checks quando houver tempo, sem repetir o QA manual já validado.
4. Revisar os critérios de aceite e decidir o fechamento formal da fase após a segurança.

