# Fase 2 — Base de qualidade

Status geral: EM EXECUÇÃO

## Escopo e evidências

| Subfase | Escopo | Estado | Evidência atual |
|---|---|---|---|
| 2.1 | Build e ambiente | Validado localmente | `vite build` passou no `main`; warnings de bundle documentados |
| 2.2 | TypeScript e lint | TypeScript validado; lint pendente | `tsc --noEmit` passou; lint global segue informativo por débito legado |
| 2.3 | Rotas | Em auditoria | rotas centralizadas em `src/App.tsx` |
| 2.4 | Loading, erro e vazio | Parcial validado | AppErrorBoundary; Progresso possui erro e retry |
| 2.5 | Persistência e recovery | Parcial | execução de treino reidratada após reload |
| 2.6 | Queries e mutations | Parcial validado | React Query com retry/cache globais; smoke checks passaram |
| 2.7 | Integridade de dados | Parcial | constraints e RPCs canônicas revisadas no fluxo de treino |
| 2.8 | Logs e observabilidade | Parcial | logs estruturados em boundary e fluxos críticos |
| 2.9 | Testes automatizados | Smoke checks validados; suíte ampla pendente | `npm run qa:fase2` passou com 6 verificações |
| 2.10 | Mocks e dados falsos | Em auditoria | Progresso consulta RPC real; avaliações oficiais vêm de `avaliacoes_unificadas` |
| 2.11 | Recovery e idempotência | Parcial | início/conclusão do treino usam execução persistida |
| 2.12 | Performance | Medição inicial concluída | build transformou 4.775 módulos; JS principal 3.598,50 kB bruto/1.012,30 kB gzip; chunk acima de 1 MB exige code splitting |
| 2.13 | Segurança mínima | Auditoria encontrou pendências críticas | advisors Supabase registrou 9 views SECURITY DEFINER, 157 funções SECURITY DEFINER executáveis por anon, 11 tabelas RLS sem policy e 28 funções com search_path mutável; requer revisão por domínio |
| 2.14 | QA integrado | Pendente | aguarda roteiro completo no preview |
| 2.15 | Critérios de aceite | Pendente | só fechar após evidências 2.1–2.14 |

## Regra de conclusão

A Fase 2 só será marcada como concluída quando build, typecheck, lint, testes, auditoria de dados, segurança mínima e roteiro integrado estiverem documentados com evidência verificável.

## Evidência local mais recente

Clone do `main` em 21/09/2026:

- `tsc --noEmit`: passou.
- `scripts/qa-fase2.mjs`: passou, 6/6 verificações.
- `vite build`: passou, 4.775 módulos transformados.
- Warnings restantes: importação mista de `html2canvas` e chunk JavaScript acima de 1 MB.
- `CompleteProfileFlow.tsx`: passou em ESLint sem erros ou warnings.

## Lint global

O lint global permanece pendente por débito legado. A última medição registrada foi de 813 problemas: 769 erros e 44 warnings. A prioridade é reduzir por lotes tipados, sem substituições mecânicas que alterem o comportamento.

## Auditoria Supabase

A auditoria de segurança e performance foi executada no projeto `mfrydtrzjxscbkaiwfnw`. O resultado não é um motivo para alterar permissões em massa automaticamente: há funções e políticas de domínios diferentes, e uma mudança ampla poderia quebrar fluxos existentes. O próximo lote deve começar pelo domínio canônico do treino, revisar cada função/view, aplicar correções em migration versionada e repetir os advisors.

## Próximos bloqueios da Fase 2

1. Corrigir e revalidar segurança do domínio canônico do treino, começando por `workout_executions`, `athletes`, `athlete_auth_link`, `notifications` e `user_profiles`.
2. Medir performance das rotas críticas no navegador, não apenas do bundle.
3. Expandir testes automatizados além dos smoke checks.
4. Executar o roteiro integrado no preview, incluindo iniciar treino, recarregar, concluir séries, finalizar, feedback, progresso e compartilhamento.
5. Só então revisar os critérios de aceite e decidir o fechamento da fase.
