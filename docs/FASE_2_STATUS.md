# Fase 2 — Base de qualidade

Status geral: EM EXECUÇÃO

## Escopo e evidências

| Subfase | Escopo | Estado | Evidência atual |
|---|---|---|---|
| 2.1 | Build e ambiente | Validado localmente | `vite build` passou no `main` atual; warnings de bundle documentados |
| 2.2 | TypeScript e lint | TypeScript validado; lint pendente | `tsc --noEmit` passou; lint segue informativo por débito legado; execução local: 845 problemas (797 erros, 48 warnings) |
| 2.3 | Rotas | Em auditoria | rotas centralizadas em src/App.tsx |
| 2.4 | Loading, erro e vazio | Parcial validado | AppErrorBoundary; Progresso possui erro e retry; demais telas em auditoria |
| 2.5 | Persistência e recovery | Parcial | execução de treino reidratada após reload |
| 2.6 | Queries e mutations | Parcial validado | React Query com retry/cache globais; smoke checks passaram |
| 2.7 | Integridade de dados | Parcial | constraints e RPCs canônicas revisadas no fluxo de treino |
| 2.8 | Logs e observabilidade | Parcial | logs estruturados em boundary e fluxos críticos |
| 2.9 | Testes automatizados | Smoke checks validados; suíte ampla pendente | `npm run qa:fase2` passou com 6 verificações |
| 2.10 | Mocks e dados falsos | Em auditoria | Progresso consulta RPC real; avaliações oficiais vêm de avaliacoes_unificadas |
| 2.11 | Recovery e idempotência | Parcial | início/conclusão do treino usam execução persistida |
| 2.12 | Performance | Pendente | falta medição de bundle e rotas críticas |
| 2.13 | Segurança mínima | Em auditoria | RLS e funções SECURITY DEFINER precisam revisão por domínio |
| 2.14 | QA integrado | Pendente | aguarda roteiro completo no preview |
| 2.15 | Critérios de aceite | Pendente | só fechar após evidências 2.1–2.14 |

## Regra de conclusão

A Fase 2 só será marcada como concluída quando build, typecheck, lint, testes, auditoria de dados, segurança mínima e roteiro integrado estiverem documentados com evidência verificável.
\n## Evidência local mais recente\n\nClone do `main` em 21/09/2026: `tsc --noEmit` passou, `scripts/qa-fase2.mjs` passou (6/6), `vite build` passou. O build emitiu apenas warnings de chunk > 1 MB e importação mista de `html2canvas`.\n
## Lint — evidência local\n\nExecução de `eslint .` no clone do `main`: 845 problemas, sendo 797 erros e 48 warnings. O principal grupo é `@typescript-eslint/no-explicit-any`; há também warnings de dependências de hooks.\n
## Lint — lote crítico do fluxo principal\n\nExecução focada em `WorkoutExecution.tsx`, `PostWorkoutModal.tsx` e `Progresso.tsx`: 29 problemas (25 erros e 4 warnings). O maior grupo está em `WorkoutExecution.tsx`, que ainda usa `any` nos contratos de exercícios, overrides, RPCs e respostas de execução. A correção deve ser feita por contratos tipados, não por substituição mecânica, para preservar o comportamento validado.\n
## Lint — redução do primeiro lote tipado\n\n`WorkoutExecution.tsx`, `PostWorkoutModal.tsx` e `Progresso.tsx` foram medidos após a tipagem inicial. O conjunto caiu de 29 para 19 problemas: 15 erros e 4 warnings. TypeScript continua passando. `PostWorkoutModal` e `Progresso` ficaram sem erros nesse recorte; os restantes estão em `WorkoutExecution.tsx`.\n
## Fluxo crítico — lint fechado\n\nApós tipagem dos contratos e correção das dependências de hooks, `WorkoutExecution.tsx` passou em TypeScript e ESLint sem erros ou warnings no clone do `main`.\n
## Lint global — atualização\n\nApós limpar o fluxo crítico, o lint global passou de 845 para 816 problemas: 772 erros e 44 warnings. A redução foi de 29 problemas sem alteração do comportamento do treino.\n
## Lint global — pós-Tailwind\n\nApós tipar o `tailwind.config.ts`, o lint global ficou em 815 problemas: 771 erros e 44 warnings.\n
## Lint global — pós-AchievementShareSheet\n\nApós tipar a detecção da Web Share API, o lint global ficou em 814 problemas: 770 erros e 44 warnings.\n