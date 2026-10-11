# Professor — execução do checklist

## Item 1 — base e branches: concluído

Conferência em 11/10/2026. Base anterior 3e98a9b; main atual 68fb36f. Oito commits do fluxo Lovable anterior chegaram ao GitHub. A resposta final desse fluxo registra conclusão, embora o status externo ainda indique running. Não foi enviado novo pedido de implementação ao Lovable.

`git fetch origin --prune` e `git for-each-ref --no-merged origin/main refs/remotes/origin` confirmaram nenhuma branch remota com commits fora da main. Checkout existente codex/professor-fitpro-qa avançado por fast-forward: não criada outra branch. supabase/.temp é artefato local não versionado e não integra a entrega.

Mudanças recebidas: AuthContext, AppLayout, Dashboard, helpers/testes, tipos gerados, variáveis públicas Supabase, lock Bun, pequeno ajuste de tipo e remoção de webhook client sem uso. Nenhuma migração de banco foi adicionada nessa rodada. Corrigida incompatibilidade entre o Vitest recém-adicionado e package-lock/npm ci: os testes usam node:test, já adotado pelo projeto; lock Bun restaurado ao contrato anterior. A revisão não declara essas mudanças todas aprovadas: permissões e fluxos passam pelos próximos itens.

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

## Item 3 — autenticação: implementado, validação técnica em andamento

- Invalidação ocorre ao receber a sessão, antes do callback agendado, com limpeza imediata de perfil/papel.
- Logout cancela trabalho ainda não iniciado e limpa dados/cache da conta.
- Resposta inicial de getSession não sobrescreve um evento mais novo, mesmo do mesmo usuário.
- Cleanup/StrictMode invalidam consultas antigas sem revivê-las com geração coincidente de outro effect.
- Falha de leitura/papel mostra recuperação no guard externo; não apresenta estado ready sem papel.
- Serviço de papel e contexto usam o mesmo resolvedor; fallback de user_roles aceita múltiplas linhas.
- Cache React Query é limpo na troca de identidade; a autorização final do banco não é substituída por isso.

15 testes de lógica passam (11 recebidos + 4 regressões de concorrência). Esses testes não comprovam RLS nem substituem reteste com contas reais. npm test agora integra o CI. Typecheck/build e regressões serão registrados após execução.

## Próximos itens

Itens 4 a 24 permanecem pendentes. Item 4 começa pela auditoria das políticas permissivas combinadas, agenda, atribuições de treino e atualização de campos privilegiados. Não declarar segurança resolvida por filtros frontend.
