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
| 2.13 | Segurança mínima | Em correção por domínio | lote canônico otimizado e RPCs anônimos restritos; auditoria ampla ainda possui pendências |
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
- `sdk/healthflix-sdk.ts`: passou em ESLint; contratos de transporte não usam mais `any`.
- `ContextualPaywall.tsx`: passou em ESLint e TypeScript após tipar a consulta de planos.
- `DailyProtocol.tsx`: passou em ESLint e TypeScript após tipar queries de tarefas e registry.
- `DynamicOffers.tsx`: passou em ESLint e TypeScript após tipar a resposta de ofertas.
- `EcosystemGrid.tsx`: passou em ESLint e TypeScript após tipar módulos e conectores.
- `MissionCompleteOverlay.tsx`: passou em ESLint e TypeScript após tipar o evento de XP.
- `QuickMoodInput.tsx`: passou em ESLint e TypeScript após tipar o registro de humor.
- `HistoricoCompletoModal.tsx`: passou em ESLint e TypeScript após tipar o retorno da timeline.
- `NutritionLogForm.tsx`: passou em ESLint e TypeScript após tipar a resposta do progress-sync.
- `OSDashboard.tsx`: passou em ESLint e TypeScript após tipar o leaderboard.
- `EmojiCalibrationQuiz.tsx`: passou em ESLint e TypeScript após tipar as persistências de calibração.
- `NineFitLayout.tsx`: passou em ESLint e TypeScript após tipar a consulta do activation gate.
- `NineFitTopBar.tsx`: passou em ESLint e TypeScript após estabilizar o callback de notificações.
- `QuickCheckIn.tsx`: passou em ESLint e TypeScript após tipar queries, RPC e callback de carregamento.
- `MetasSection.tsx`: passou em ESLint e TypeScript após tipar queries de metas e estabilizar o carregamento.
- `WeeklyRecapPrompt.tsx`: passou em ESLint e TypeScript após tipar as consultas do resumo semanal.
- `WeeklyTrainingView.tsx`: passou em ESLint e TypeScript após tipar o contrato do RPC semanal e dos exercícios.
- `WeeklyProgressChart.tsx`: passou em ESLint e TypeScript após tipar os dados de execução, nutrição e registry.
- `RecordesSection.tsx`: passou em TypeScript e eliminou os casts não tipados do registro de recorde; resta apenas um warning de export de constante para Fast Refresh.
- `PDIWizard.tsx`: passou em ESLint e TypeScript após tipar o fluxo de persistência do perfil dinâmico.

## Lint global

O lint global permanece pendente por débito legado. A última medição registrada foi de 704 problemas: 663 erros e 41 warnings. Os lotes tipados do check-in, metas, recap semanal, treino semanal, progresso semanal, recordes, PDI e `WorkoutHome`, junto dos anteriores, reduziram 91 ocorrências no total. A prioridade é reduzir por lotes tipados, sem substituições mecânicas que alterem o comportamento.

## Auditoria Supabase

A auditoria foi executada no projeto `mfrydtrzjxscbkaiwfnw`.

- A migration `20260921170000_phase2_cover_foreign_key_indexes.sql` corrigiu as 8 foreign keys sem índice; o advisor não lista mais `unindexed_foreign_keys`.
- A migration `20260921173000_phase2_optimize_canonical_workout_rls.sql` atualizou as policies canônicas sem alterar permissões, usando chamadas cacheadas de `auth.uid()`, `fn_current_athlete_id()` e `is_admin()`.
- O advisor de performance reduziu `auth_rls_initplan` de 303 para 296 ocorrências.
- A migration `20260921180000_phase2_restrict_canonical_workout_rpcs.sql` removeu execução anônima dos RPCs canônicos e adicionou validação de vínculo antes de conceder XP.
- O advisor de segurança passou de 157 para 156 funções SECURITY DEFINER executáveis por anon.
- Ainda existem findings amplos de SECURITY DEFINER, initplan e policies permissivas em outros domínios; eles exigem revisão individual.

## Próximos bloqueios da Fase 2

1. Continuar a auditoria de segurança por domínio, sem mudanças massivas de permissões.
2. Medir performance das rotas críticas no navegador, não apenas do bundle.
3. Expandir testes automatizados além dos smoke checks.
4. Executar o roteiro integrado no preview, incluindo iniciar treino, recarregar, concluir séries, finalizar, feedback, progresso e compartilhamento.
5. Só então revisar os critérios de aceite e decidir o fechamento da fase.
