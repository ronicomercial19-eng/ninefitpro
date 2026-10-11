# Professor — execução do checklist

## Item 1 — base e branches: concluído

Conferência em 11/10/2026. Base anterior 3e98a9b; main atual 68fb36f. Oito commits do fluxo Lovable anterior chegaram ao GitHub. A resposta final desse fluxo registra conclusão, embora o status externo ainda indique running. Não foi enviado novo pedido de implementação ao Lovable.

`git fetch origin --prune` e `git for-each-ref --no-merged origin/main refs/remotes/origin` confirmaram nenhuma branch remota com commits fora da main. Checkout existente codex/professor-fitpro-qa avançado por fast-forward: não criada outra branch. supabase/.temp é artefato local não versionado e não integra a entrega.

Mudanças recebidas: AuthContext, AppLayout, Dashboard, helpers/testes, tipos gerados, variáveis públicas Supabase, lock Bun, pequeno ajuste de tipo e remoção de webhook client sem uso. Nenhuma migração de banco foi adicionada nessa rodada. Corrigida incompatibilidade entre o Vitest recém-adicionado e package-lock/npm ci: os testes usam node:test, já adotado pelo projeto; lock Bun restaurado ao contrato anterior. A revisão não declara essas mudanças todas aprovadas: permissões e fluxos passam pelos próximos itens.

Durante a execução, main recebeu bdfc806 (191 arquivos modificados), retirando testes, migrações, QA18/Macros e correções de autenticação/dashboard. CI 38167524986 falhou na instalação e build. A origem dessa alteração não foi atribuída ao Lovable: seu histórico consultado não mostra novo pedido correspondente. O merge de reconciliação f7af524 incorpora o commit à história e preserva integralmente a árvore bcdda1e com as entregas aprovadas e correções desta rodada. Não foram reaproveitadas as regressões nem os caches de ferramenta adicionados pelo cleanup.

## Item 2 — mapa do painel: concluído como inventário de código

Rotas /app usam PrivateRoute + AppLayout; dados efetivamente protegidos dependem das políticas do banco e dos endpoints, a revisar no item 4. Fonte atual de identidade: vw_current_identity, profiles e user_roles. Vínculos: athletes.coach_id, athlete_auth_link e vw_current_relationships.

| Tela/rota | Implementação/fonte atual | Lacuna a tratar no respectivo item |
|---|---|---|
| /app | Dashboard, view coach_student_performance, execuções, agendamentos e atribuições | Validar métricas, escopo, fonte e períodos. |
| /app/alunos | StudentsPage, vw_current_relationships, athletes, StudentDetailedView | Contexto compartilhado, minimização, prescrições e histórico. |
| /app/smart-treino | SmartTreinoPage, TrainingAdjustmentsPage, conector, navegação | Links não substituem edição e prescrição no contexto do aluno. |
| /app/smart-periodizer | SmartPeriodizer, smartperiodizer-proxy, atribuições no cadastro | Ciclos, revisão, versões e publicação com aluno selecionado. |
| /app/fit-copilot | FitCopilotPage, links para RON/ajustes/alunos, conector | Sugestões e aplicação rastreável sem perder aluno. |
| /app/treino-ia | AITrainingPage, questionário, RPC prescrever_treino, ai_training_generations | Conferir payload, seleção do aluno, edição e entrega; não confundir geração com prescrição entregue. |
| /app/assistente-ia | AIChatPage, ai-coach | Chat atual sem aluno compartilhado; conferir contrato streaming/JSON, continuidade e ações. |
| /app/postura-pro | PosturaProPage, postura_scans, assessments, postura-pro-scan | Atualmente cria scan do usuário professor; revisar associação ao aluno, acesso às mídias e resultado real. |
| /app/skills | SkillManagerPage, skills, skill_activations, SkillUploader | Aqui Skills são capacidades de IA e ativação global; não confundir com habilidades físicas. Separar administração global de uso pelo professor. |
| /app/ron | RonProfessorPage, athletes, workout_executions, avaliacoes_unificadas, ai-coach | Contexto do aluno, contrato backend, respostas atrasadas, sinais e atualidade. |
| /app/agenda | AgendaPage, appointments, class_bookings, gym_classes, student_credits | Permissões, erro, fuso, recorrência, conflitos e operação de créditos. |
| /app/relatorios e /app/estatisticas | ReportsPage, StatisticsPage e geradores | Fonte, fórmula, dados permitidos e erros reais. |
| /app/monetizacao | MonetizacaoPage e recursos comerciais | Oferta, benefício, acesso e entrega nas fontes próprias do FitPro. |
| /9fit/mensagens | Mensagens do aluno encaminha experiência de IA | Não é prova de comunicação humana bidirecional; item 19 precisa confirmar ou implementar fluxo nativo. |

Também existem exercícios, super-séries, séries de referência, análise IA, HealthFlix, NEXUS, modelos, comunidade, configurações e Roadmap. Preservar suas rotas; sua presença não comprova conclusão de fluxo. Header tem configurações sem ação, ajuda sem destino e iniciais fixas: item 22.

Stevent: talentos, vagas, pipeline, contratos e pagamentos de freelancers continuam fora do escopo.

## Item 3 — autenticação: correção técnica validada

- Invalidação ocorre ao receber a sessão, antes do callback agendado, com limpeza imediata de perfil/papel.
- Logout cancela trabalho ainda não iniciado e limpa dados/cache da conta.
- Resposta inicial de getSession não sobrescreve um evento mais novo, mesmo do mesmo usuário.
- Cleanup/StrictMode invalidam consultas antigas sem revivê-las com geração coincidente de outro effect.
- Falha de leitura/papel mostra recuperação no guard externo; não apresenta estado ready sem papel.
- Serviço de papel e contexto usam o mesmo resolvedor; fallback de user_roles aceita múltiplas linhas.
- Cache React Query é limpo na troca de identidade; a autorização final do banco não é substituída por isso.

15 testes de lógica passam (11 recebidos + 4 regressões de concorrência). Esses testes não comprovam RLS nem substituem reteste com contas reais. npm test agora integra o CI. Typecheck local passou; CI 618, commit aaf4f6d, passou incluindo build e regressões. Contas desativadas também deixam de receber acesso visual.

## Item 4 — permissões: correções principais aplicadas; auditoria ainda em andamento

Migração professor_access_boundaries aplicada em mfrydtrzjxscbkaiwfnw após teste transacional com rollback, e retestada após aplicação. Os dados sintéticos e identidades de teste não persistiram (zero usuários @qa.invalid).

Correções verificadas:

- Agenda deixa de conceder gestão global a qualquer trainer; acesso por vínculo autorizado ou administrador.
- Prescrições exigem vínculo professor/aluno; created_by sozinho não concede permissão.
- Perfil não pode promover seu próprio papel nem alterar campos privilegiados de acesso.
- Vínculos de atleta/usuário/professor não podem ser reassociados pelo cliente sem autorização administrativa.
- Cadastros novos não recebem professor/admin por user_metadata nem por comparação de e-mail. Provisionamento profissional usa app_metadata.fitpro_role definido pelo servidor. Contas existentes preservadas.
- Vínculos de login só são criados por servidor/admin; reservas e leitura de créditos deixam de usar acesso global de trainer.
- Revogados grants anônimos de perfil, papéis, agenda e prescrição; user_roles não aceita escrita direta autenticada.

Teste no PostgreSQL verificou leitura e edição próprias, bloqueio entre professores, bloqueio de autoelevação, leitura da prescrição entregue pelo aluno, impedimento de prescrição pelo aluno, visão administrativa e negação anônima. O arquivo supabase/tests/professor_access_boundaries.sql deve ser executado em BEGIN/ROLLBACK; não é um teste do navegador.

Segunda migração professor_periodization_privacy aplicada e retestada: periodizações, snapshots, ondas e scans de postura restritos ao vínculo. View vw_athlete_periodizacao_ativa agora security_invoker; teste confirmou planejamento visível ao aluno e professor responsável, sem acesso de outro professor. Resultado postural só é escrito pelo serviço; aluno não pode forjá-lo. Revogado acesso RPC a cinco funções de trigger. Advisor posterior deixou de apontar security_definer_view e anon_security_definer_function_executable.

Serviços corrigidos e publicados no backend: create-athlete-user versão 57 exige papel canônico ativo, aluno próprio ainda sem vínculo e email correspondente, rejeita vínculo ambíguo e não reassocia conta existente automaticamente. smartperiodizer-proxy versão 4 exige aluno autorizado antes de encaminhar pedido com chave de parceiro e rejeita identificadores conflitantes. Ambos retornaram 401 na chamada HTTP sem autorização. Cinco testes de lógica adicionais cobrem provisionamento e identificadores de parceiro; não foram criadas contas reais nem enviados emails de teste.

Pendências antes de fechar o item 4: completar conferência de serviços/RPCs relevantes, especialmente smartreino-proxy e fluxos de recuperação de acesso. Avisos de funções security definer exigem análise de autorização, não são automaticamente provas de exploração. Algumas tabelas legadas ainda requerem conferência no caminho de uso real dos módulos.

Item 5 ainda pendente: assessments é público e a política de objetos não limita proprietário. A correção requer armazenamento privado, permissões por vínculo e URLs temporárias em todos os leitores e no serviço de análise; alterar só o bucket quebraria imagens existentes.

Referências de diagnóstico: [funções privilegiadas autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) e [views privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view). Não há certificação global de segurança nesta etapa.

## Próximos itens

Item 4 permanece em andamento; itens 5 a 24 pendentes. Não declarar segurança resolvida por filtros frontend nem considerar a aplicação desta migração aprovação completa do painel.
