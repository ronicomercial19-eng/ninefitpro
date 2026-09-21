# Fase 2 — Base de qualidade

Status geral: EM EXECUÇÃO

## Escopo e evidências

| Subfase | Escopo | Estado | Evidência atual |
|---|---|---|---|
| 2.1 | Build e ambiente | Parcial | scripts build/typecheck existentes; deploys realizados |
| 2.2 | TypeScript e lint | Em auditoria | typecheck precisa ser executado no commit atual |
| 2.3 | Rotas | Em auditoria | rotas centralizadas em src/App.tsx |
| 2.4 | Loading, erro e vazio | Parcial | AppErrorBoundary; Progresso possui erro e retry |
| 2.5 | Persistência e recovery | Parcial | execução de treino reidratada após reload |
| 2.6 | Queries e mutations | Em auditoria | React Query com retry/cache globais |
| 2.7 | Integridade de dados | Parcial | constraints e RPCs canônicas revisadas no fluxo de treino |
| 2.8 | Logs e observabilidade | Parcial | logs estruturados em boundary e fluxos críticos |
| 2.9 | Testes automatizados | Pendente | falta suíte automatizada executável no repositório |
| 2.10 | Mocks e dados falsos | Em auditoria | Progresso consulta RPC real; avaliações oficiais vêm de avaliacoes_unificadas |
| 2.11 | Recovery e idempotência | Parcial | início/conclusão do treino usam execução persistida |
| 2.12 | Performance | Pendente | falta medição de bundle e rotas críticas |
| 2.13 | Segurança mínima | Em auditoria | RLS e funções SECURITY DEFINER precisam revisão por domínio |
| 2.14 | QA integrado | Pendente | aguarda roteiro completo no preview |
| 2.15 | Critérios de aceite | Pendente | só fechar após evidências 2.1–2.14 |

## Regra de conclusão

A Fase 2 só será marcada como concluída quando build, typecheck, lint, testes, auditoria de dados, segurança mínima e roteiro integrado estiverem documentados com evidência verificável.
