# Escala para 3.000 contas — auditoria e execução

Início: 28/10/2026. Meta: 3.000 contas; isso não significa 3.000 sessões simultâneas. Capacidade concorrente e latência ainda precisam de medição. Não se deve gerar carga destrutiva nem enviar mensagens/pagamentos reais como teste.

## Vinte pendências priorizadas

| # | Prioridade | Pendência e evidência | Situação |
|---|---|---|---|
| 01 | P0 | Expiração não bloqueia recursos pagos: `NineFitLayout` só verifica autenticação/configuração; banco não tem RPC canônica de acesso pago. | Banco/APIs corrigidos: relógio do servidor, RLS, triggers/RPCs, 22 APIs protegidas; consultoria preservada explicitamente. Tela de bloqueio e monitor publicados na entrega #113; bundle público index-D3FjENGC.js confirmou mensagens de ativação e vencimento. |
| 02 | P0 | Sem rechecagem de pagamentos já aprovados: `_shared/infinitepay.ts` retorna imediatamente para recibo pago; `cron.job` não contém reconciliação financeira. | Rechecagem automática implantada e jobs executando. Erro do provedor não suspende; resposta explícita negativa suspende; reconfirmação não estende o período. Fila durável implantada para referências recebidas antes de falha inicial: 10 candidatos/minuto, backoff, lease e encaminhamento para revisão. Não recupera checkout abandonado sem referência do provedor. Monitor atualizado e publicado na entrega #115; ver docs/paid-access-lifecycle.md. |
| 03 | P0 | Hidratação aceita atleta arbitrário e quantidade não validada: função real `fn_add_hydration` é SECURITY DEFINER e não verifica identidade. | Corrigida no banco e verificada com ROLLBACK: identidade/vínculo, quantidade 1–2000 ml e data de São Paulo. |
| 04 | P0 | XP aceita fonte genérica/valor do cliente: `fn_award_xp` comprova treino/protocolo, mas outros nomes de fonte escapam dessas provas; treinador genérico também tem acesso amplo. | Corrigida no banco: fonte verificada, vínculo e recibos de check-in/consistência; valores definidos no servidor. Testada contra farm, repetição e conta cruzada. |
| 05 | P0 | Mutações têm repetição global automática: `App.tsx`, `mutations: { retry: 1 }`; escrita não idempotente pode duplicar após resposta perdida. | Corrigida e publicada na entrega #110. Bundle público `index-BLmxZHpj.js` confirmou `mutations:{retry:!1}`. |
| 06 | P0 | RON não impõe limite de consumo por conta no handler auditado: `ai-coach/index.ts` autentica e processa requisição sem quota/rate limit. | Corrigida nas 22 APIs implantadas: IA 10/min por aluno (equipe 60), conteúdo 60/min (equipe 180), contador atômico limitado a uma linha por conta/categoria. Isso não é teto financeiro diário. |
| 07 | P1 | Entrada JSON de IA não tem limite explícito antes de `req.json()` em `ai-coach`. Autenticação não limita memória/tamanho de prompt. | Corrigida: 64 KiB normalmente/12 MiB para mídia, leitura de stream limitada, preflight atualizado e validação de destinos de aluno/usuário antes do processamento. |
| 08 | P1 | Lista profissional inteira em memória: `ProfessorWorkspace` chama `fn_coach_students` sem paginação. A inspeção posterior confirmou retorno JSON agregado (não sofre corte padrão de 1.000 linhas do REST), mas continua agregando/transmitindo toda a carteira e monta milhares de opções. | Parcial: cache de cinco minutos, timeout/cancelamento e seletor com busca e até 101 opções (incluindo a seleção atual). RPC ainda transmite a carteira completa; migração para paginação real permanece pendente. |
| 09 | P1 | `StudentsPage` faz `.in('id', athleteIds)` com toda a carteira e `select('*')`, incluindo dados desnecessários; 3.000 IDs geram URL grande e consulta ampla. | Corrigida e publicada na entrega #114: IDs em lotes de 100, três requisições simultâneas, projeção explícita, cancelamento por sessão e 50 cartões por página. Busca cobre toda a carteira; nenhum erro devolve lista parcial. |
| 10 | P1 | Chat consulta a cada 4 segundos (`use-ninezap-chat`); 3.000 conversas abertas implicariam até 750 consultas/s antes de outras telas. Isso é cenário de estresse, não previsão de uso. | Melhoria publicada na entrega #110: 5s ativo, 15s recente, 60s ocioso; foco atualiza imediatamente. Ainda avaliar limite/histórico do provedor. |
| 11 | P1 | Acompanhamento consulta fila a cada 20s e detalhe a cada 15s, inclusive sem mudança (`CareWorkspace`). | Melhoria publicada na entrega #110: fila 60s/detalhe 30s, sem polling de fundo, escrita invalida imediatamente. Medição de carga pendente. |
| 12 | P1 | Contexto completo do aluno é relido a cada 30s e sem timeout (`useCoachStudentContext`), com várias agregações. | Parcial: timeout 15s, cache 30s e intervalo 60s implementados; consultas/índices ainda serão medidos. |
| 13 | P1 | Páginas são importadas diretamente em `App.tsx`; bundle publicado anterior tinha aproximadamente 4,25 MB de JavaScript. | Corrigida e publicada na entrega #111: 83 páginas sob demanda, Suspense e recuperação de erro. Bundle público `index-DUi9uEE0.js`: 1.222.481 caracteres; build local 1.228.346 bytes, gzip 361.042. Sem chunks manuais de React. |
| 14 | P1 | PWA faz precache de todas as imagens e aceita arquivos de 12 MB (`vite.config.ts`); build anterior cacheava ~9,5 MB. | Corrigida e publicada: shell de ~1,56 MB; páginas cacheadas quando acessadas, fotos fora do precache. Worker público confirmado e CI passa a bloquear regressão de orçamento. |
| 15 | P1 | Push considera dispositivo inscrito sem conferir conta: `usePushNotifications.checkSubscription` usa apenas `!!sub`. Também não verifica erro da exclusão. | Correção publicada: exige vínculo com a conta, verifica exclusão, ignora respostas de sessão antiga e desliga endpoint ao sair. Worker gerado agora importa handlers explicitamente e recusa destinos externos. Não foi enviada notificação real de teste; QA de permissão/dispositivo fica com o usuário. |
| 16 | P1 | Advisor de desempenho aponta 24 chaves estrangeiras sem índice de cobertura, afetando relações/cascatas da conta. | Corrigida no banco: 24 índices criados, preservando prefixos existentes e índices parciais adequados. Advisor passou de 24 pendências para zero. |
| 17 | P1 | Advisor aponta 308 políticas com reavaliação de auth por linha. Corrigir políticas quentes preservando semântica e isolamento. | Corrigida no banco: 9 políticas quentes e mais 299 políticas em 148 tabelas otimizadas. Advisor caiu de 308 para zero. Condições, papéis e operações preservados; escopos reais de aluno/admin iguais antes/depois. |
| 18 | P2 | Índices duplicados de appointments: `idx_appointments_teacher_date` e `idx_appointments_teacher_sched` idênticos segundo advisor. | Corrigida: duplicado sem dependentes removido, índice equivalente preservado e ausência de duplicação confirmada no advisor. |
| 19 | P1 | Não há ensaio documentado de restauração/recuperação nos scripts e docs auditados. Backup disponível/configuração do provedor ainda precisa ser conferido. | Aberta; não afirmar inexistência de backup sem confirmar. |
| 20 | P1 | Sem teste de carga encontrado nem orçamento de latência/capacidade. Banco real declara `max_connections=60`; isso não equivale ao limite de usuários do REST. | Parcial: ensaio isolado com 3.000 contas, 60.000 notificações, 3.000 endpoints fictícios e 100 consultas com RLS. Não mede concorrência HTTP nem comprova SLA de produção. |

## Evidências de base

- Advisors consultados: segurança e desempenho, no projeto `mfrydtrzjxscbkaiwfnw`.
- Banco com volume atual pequeno: ~254 treinos diários, ~213 séries, ~1570 exercícios prescritos (estimativas de estatística). Uma consulta rápida nesse volume não comprova escala.
- Guard de hidratação: `authenticated` pode executar; `anon` já não pode. O problema confirmado está em contas autenticadas cruzarem atletas.
- Cache de React Query já é limpo na troca/logout; não registrar esse item como falha nova.
- `fn_save_api_connector` já valida administrador ativo; não registrar como falha sem evidência adicional.

## Critério de conclusão

Cada item só vira corrigido após mudança concreta, teste apropriado e verificação da versão efetivamente publicada/aplicada. Melhorias parciais ficam identificadas como parciais. Testes visuais permanecem com o usuário; testes técnicos e de isolamento ficam nesta execução.

## Primeira entrega técnica

Migração aplicada: `20261028092723_scale_guard_hydration_xp.sql`. Dezesseis verificações isoladas de PostgreSQL testam hidratação, autorização, XP de booking real, marco de consistência, repetição e preservação do recibo de treino. Validação real com conta autenticada recusou outro atleta, volume negativo e bônus inventado; a gravação legítima funcionou e todas as alterações de teste foram revertidas.

Os atuais chamadores de XP no app são treino/protocolo, check-in confirmado, marco de sete dias e trigger de compartilhamento. Fontes genéricas não usadas pelo app foram bloqueadas; nenhuma promessa visual de recompensa deve usar valores arbitrários do cliente.

## Entrega de páginas e notificações

Teste do build: `node scripts/check-delivery-budget.mjs`. Limites: entrada <1,6 MB, gzip <500 KB e precache <2,2 MB; nenhuma foto editorial/API no precache. O valor medido é do artefato de build, não uma medição de latência de usuários. Worker de push testado sem enviar mensagens reais: título/corpo limitados e cliques restritos a rotas internas do aluno. A permissão do navegador continua opcional e explícita.

## Banco e ensaio de 3.000 contas

Migração aplicada: `20261028094531_scale_hot_indexes_rls.sql`. Timeout de lock de 2s e de instrução de 30s limitam impacto da implantação. Índices existentes com as mesmas colunas iniciais não são duplicados, incluindo o caso parcial `IS NOT NULL`.

`node scripts/qa-scale-database.mjs` cria somente dados fictícios em PostgreSQL/PGlite. Verifica repetição da migração, isolamento, escrita cruzada recusada e plano com índice/InitPlan. Exemplo medido localmente: P95 sequencial ~1,91 ms; isso não é latência de produção, nem teste de sessões concorrentes. Validação real preservou as 69 notificações visíveis da conta de teste e não expôs nem alterou outra conta; alterações de teste revertidas.

## Acesso pago

Migração `20261028102751_automatic_paid_access_lifecycle` aplicada e 22 versões de funções atualizadas a partir dos fontes reais da nuvem. Houve 23 verificações de banco isolado e validação transacional real de preservação da consultoria, vencimento, bloqueio de writer, confirmação e suspensão/reconfirmação sem duplicar prazo. Todos os testes reais foram revertidos e nenhuma assinatura paga de teste ficou no banco.

Jobs de ciclo de acesso e rechecagem já registram execução real sem erros. Smoke público recusou requisição não autenticada nas 22 APIs e acesso sem segredo ao reconciliador; nenhum provedor de IA ou cobrança real foi invocado pelo teste. Escopo e limitações estão em `docs/paid-access-lifecycle.md`.

## Carteira profissional

Teste isolado de 3.000 IDs preservou todos os resultados e sua ordem, removeu IDs duplicados, limitou cada consulta a 100 IDs e o trabalho a três requisições simultâneas. Falha rejeita o conjunto; cancelamento impede novos lotes. A grade monta 50 cartões e a busca continua em todos os alunos. O seletor limita opções exibidas, mantendo sempre o aluno selecionado. A consulta canônica agregada ainda precisa de paginação no servidor; essa limitação não foi ocultada como item resolvido.

Publicação #114 verificada no bundle público `index-fyBqs-F-.js` e no chunk `StudentsPage-Bu7hWoMY.js`: busca do seletor, chave de consulta e paginação presentes.

## Políticas de identidade por consulta

Migração aplicada `20261028173013_hoist_remaining_policy_identity_checks.sql`. Fotografia de 299 políticas em `scripts/fixtures/rls-identity-before.json`; hashes dos predicados abortam a migração se houver divergência. A alteração envolve somente chamadas sem parâmetro auth.uid/jwt/role, sem ocorrências correspondentes em literais SQL; ALTER POLICY preserva papéis, comando e modo permissivo/restritivo. O helper temporário é excluído.

`node scripts/qa-rls-identity.mjs`: 3.000 contas fictícias, escopos antes/depois para aluno/professor/admin/claims anônimas, escrita cruzada recusada, subconsulta correlacionada e expressão previamente otimizada preservadas, InitPlan confirmado. Em produção, os escopos reais comparados ficaram idênticos: aluno 1 atleta/69 notificações/73 treinos/480 exercícios/4 pedidos; administrador 38 atletas/33 notificações/254 treinos/1570 exercícios/0 pedidos próprios. Tudo consultado sob papel authenticated e revertido; nenhuma linha de usuário foi alterada.

Advisor confirmou ausência de auth_rls_initplan, de FK sem índice e de índice duplicado. Isso não substitui auditoria integral das regras herdadas nem medição de concorrência. Referência: [otimização de funções em RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select).

Entrega #115 publicada: bundle `index-C0g1DzAV.js`, monitor `MonetizacaoPage-Ew08GJpm.js` com fila automática e revisão necessária confirmados por leitura do artefato público.
