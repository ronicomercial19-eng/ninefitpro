# QA — Painel do Professor FitPro (/app)

Escopo: só o FitPro (ninefitpro). Stevent é um fornecedor terceiro e não foi alterado.

## Bugs confirmados e corrigidos
1. **AuthContext: corrida ao trocar de sessão.** Perfil e papel eram carregados por chamadas assíncronas sem cancelamento, então um login/logout rápido podia aplicar o papel do usuário anterior. Correção: guarda de geração (`createGenerationGuard`) que descarta respostas antigas. O logout também invalida carregamentos pendentes.
2. **Spinner infinito no AppLayout.** Uma falha ao carregar o papel deixava `userRole=null` e o painel girava para sempre. Correção: `roleStatus` (`idle|loading|ready|error`) e tela de erro com "Tentar novamente" e "Sair".
3. **Papel inconsistente.** `identity.roles[0]` sobrescrevia `profiles.role`, e `isTrainer` não reconhecia `professor`, enquanto `loginDestination` mandava professor para `/app`, que o devolvia ao hub. Correção: `resolveRole` (perfil canônico > user_roles por prioridade), `isStaffRole` e `isAdminRole`. Nada vem de user_metadata.
4. **Dashboard com contadores errados:**
   - Usava `a.id`/`a.name`/`a.email`, mas a view expõe `athlete_id`/`athlete_name`/`athlete_email`. Resultado: "sem treino" contava todos os alunos ativos e os nomes não apareciam.
   - "Treinos da semana" eram os 5 últimos `workouts` de qualquer pessoa. Agora são as `workout_executions` concluídas nos últimos 7 dias dos alunos do professor.
   - "Agendamentos (próximas 24h)" contava todos os agendamentos futuros, inclusive de outros professores, porque a política de staff libera leitura. Agora: só as próximas 24h e só `teacher_id = professor` (admin vê tudo).
   - Atribuições e RPE não tinham escopo. Agora filtram pelos alunos do professor.
   - Erros eram ignorados e viravam zeros. Agora aparece uma tela de erro com retry.
5. **Código com service role no frontend:** `src/lib/supabase-webhook-handler.ts` (sem uso) foi removido.
6. Tipo inválido (`pending`) em `usePhysicalCommitments.ts`. O breadcrumb "Início" apontava para `/dashboard`; agora aponta para `/app`.

## Verificado sem alteração
- `vw_fitpro_coach_student_performance` e `vw_fitpro_performance_overview` são `security_invoker=true`.
- `athletes`: admin_all, athlete_own_record, coach_manage_own (`coach_id = auth.uid()`). O isolamento entre professores vem do RLS.
- O AppLayout bloqueia quem não é staff, mandando para `/9fit/hub`.

## Pendências (não corrigidas por falta de prova de exploração ou por envolver regra de negócio)
- `appointments`: a política "Staff vê e gerencia todos os agendamentos" (`is_trainer`) dá a qualquer professor acesso à agenda de todos. Pode ser a agenda central da academia, que é intencional. Requer decisão de negócio.
- `workouts`: política `anon SELECT true`. Hoje não é explorável, porque não há GRANT para anon. Recomendo remover.
- `workouts` e `workout_progress` ainda usam a tabela legada `students`/`alunos` em algumas políticas.
- RON Professor, Relatórios e prescrições/PDI: não foram auditados a fundo nesta rodada.

## Achados do Stevent que não se aplicam
O banco de talentos/vagas/contratos e o modelo de organizações não existem no FitPro e não foram portados.

## Testes
`npm test` roda 11 testes em `src/lib/__tests__`:
- Acesso vertical: aluno não é staff; professor/trainer acessam o painel; só admin é admin.
- Acesso horizontal: professor vê só os próprios alunos.
- Contadores do dashboard.
- Guarda de troca de sessão e de logout.
