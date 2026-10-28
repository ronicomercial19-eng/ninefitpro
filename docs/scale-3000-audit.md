# Escala para 3.000 contas — auditoria e execução

Início: 28/10/2026. Meta: 3.000 contas; isso não significa 3.000 sessões simultâneas. Capacidade concorrente e latência ainda precisam de medição. Não se deve gerar carga destrutiva nem enviar mensagens/pagamentos reais como teste.

## Vinte pendências priorizadas

| # | Prioridade | Pendência e evidência | Situação |
|---|---|---|---|
| 01 | P0 | Expiração não bloqueia recursos pagos: `NineFitLayout` só verifica autenticação/configuração; banco não tem RPC canônica de acesso pago. | Aberta; rascunho anterior não aplicado precisa de revisão/testes. |
| 02 | P0 | Sem rechecagem de pagamentos já aprovados: `_shared/infinitepay.ts` retorna imediatamente para recibo pago; `cron.job` não contém reconciliação financeira. | Aberta. |
| 03 | P0 | Hidratação aceita atleta arbitrário e quantidade não validada: função real `fn_add_hydration` é SECURITY DEFINER e não verifica identidade. | Corrigida no banco e verificada com ROLLBACK: identidade/vínculo, quantidade 1–2000 ml e data de São Paulo. |
| 04 | P0 | XP aceita fonte genérica/valor do cliente: `fn_award_xp` comprova treino/protocolo, mas outros nomes de fonte escapam dessas provas; treinador genérico também tem acesso amplo. | Corrigida no banco: fonte verificada, vínculo e recibos de check-in/consistência; valores definidos no servidor. Testada contra farm, repetição e conta cruzada. |
| 05 | P0 | Mutações têm repetição global automática: `App.tsx`, `mutations: { retry: 1 }`; escrita não idempotente pode duplicar após resposta perdida. | Corrigida e publicada na entrega #110. Bundle público `index-BLmxZHpj.js` confirmou `mutations:{retry:!1}`. |
| 06 | P0 | RON não impõe limite de consumo por conta no handler auditado: `ai-coach/index.ts` autentica e processa requisição sem quota/rate limit. Conferir versão cloud antes de alterar. | Aberta. |
| 07 | P1 | Entrada JSON de IA não tem limite explícito antes de `req.json()` em `ai-coach`. Autenticação não limita memória/tamanho de prompt. | Aberta. |
| 08 | P1 | Lista profissional inteira em memória: `ProfessorWorkspace` chama `fn_coach_students` sem paginação; risco de corte padrão do REST e carteira incompleta. | Aberta. |
| 09 | P1 | `StudentsPage` faz `.in('id', athleteIds)` com toda a carteira e `select('*')`, incluindo dados desnecessários; 3.000 IDs geram URL grande e consulta ampla. | Aberta. |
| 10 | P1 | Chat consulta a cada 4 segundos (`use-ninezap-chat`); 3.000 conversas abertas implicariam até 750 consultas/s antes de outras telas. Isso é cenário de estresse, não previsão de uso. | Melhoria implementada, aguardando publicação: 5s ativo, 15s recente, 60s ocioso; foco atualiza imediatamente. Ainda avaliar limite/histórico do provedor. |
| 11 | P1 | Acompanhamento consulta fila a cada 20s e detalhe a cada 15s, inclusive sem mudança (`CareWorkspace`). | Melhoria implementada, aguardando publicação: fila 60s/detalhe 30s, sem polling de fundo, escrita invalida imediatamente. Medição de carga pendente. |
| 12 | P1 | Contexto completo do aluno é relido a cada 30s e sem timeout (`useCoachStudentContext`), com várias agregações. | Parcial: timeout 15s, cache 30s e intervalo 60s implementados; consultas/índices ainda serão medidos. |
| 13 | P1 | Páginas são importadas diretamente em `App.tsx`; bundle publicado anterior tinha aproximadamente 4,25 MB de JavaScript. | Código corrigido, aguardando publicação: 83 páginas sob demanda, Suspense e recuperação de erro. Build: entrada 1.228.346 bytes, gzip 361.042, sem chunks manuais de React. |
| 14 | P1 | PWA faz precache de todas as imagens e aceita arquivos de 12 MB (`vite.config.ts`); build anterior cacheava ~9,5 MB. | Código corrigido, aguardando publicação: shell de ~1,56 MB; páginas cacheadas quando acessadas, fotos fora do precache. Orçamentos de entrega agora bloqueiam regressão na CI. |
| 15 | P1 | Push considera dispositivo inscrito sem conferir conta: `usePushNotifications.checkSubscription` usa apenas `!!sub`. Também não verifica erro da exclusão. | Código corrigido, aguardando publicação: exige vínculo com a conta, verifica exclusão, ignora respostas de sessão antiga e desliga endpoint ao sair. Detectado também que o worker gerado sobrescrevia o handler de push de public/sw.js; handlers agora importados explicitamente e destinos externos recusados. |
| 16 | P1 | Advisor de desempenho aponta 24 chaves estrangeiras sem índice de cobertura. Selecionar índices por consultas reais; não criar tudo indiscriminadamente. | Aberta. |
| 17 | P1 | Advisor aponta 308 políticas com reavaliação de auth por linha. Corrigir políticas quentes preservando semântica e isolamento. | Aberta. |
| 18 | P2 | Índices duplicados de appointments: `idx_appointments_teacher_date` e `idx_appointments_teacher_sched` idênticos segundo advisor. | Aberta; verificar dependências antes de remover. |
| 19 | P1 | Não há ensaio documentado de restauração/recuperação nos scripts e docs auditados. Backup disponível/configuração do provedor ainda precisa ser conferido. | Aberta; não afirmar inexistência de backup sem confirmar. |
| 20 | P1 | Sem teste de carga encontrado nem orçamento de latência/capacidade. Banco real declara `max_connections=60`; isso não equivale ao limite de usuários do REST. | Aberta; preparar ensaio isolado e plano de concorrência. |

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
