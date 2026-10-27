# Indicadores e histórico reconciliados

## Problema e correção

O contexto do aluno já excluía execuções com `completion_valid = false`, mas o contexto do professor, Dashboard/Estatísticas/Relatórios e parte do histórico de progresso ainda contavam apenas `status = completed`.

A migração `20261027234722_reconcile_student_professor_progress.sql` aplica a validação ao contexto do professor (dias ativos, contagem, janelas de treino, conclusão do dia e cobertura semanal), ao overview (contagem, minutos e RPE) e ao hub de avaliações (execuções e cargas do FitPro). RPE legado fora de 1–10 fica ausente. Registros de produtos externos mantêm seus critérios próprios.

O histórico do Train preserva as sessões antigas e mostra se a conclusão é válida, ou o motivo para não entrar nos indicadores. O professor recebe a mesma informação de validade no histórico compartilhado. Duração/volume ausentes são apresentados como ausentes; volume zero registrado continua sendo zero.

O objetivo declarado na ficha tem prioridade na projeção profissional quando `goal` está em `declared_keys`. Na ausência dele, vale o cadastro. A origem e o objetivo anterior são apresentados no contexto profissional, sem sobrescrever os dados do aluno. O novo helper SQL é privado, invoker e sem EXECUTE para anon/authenticated. As permissões das RPCs existentes foram preservadas.

## Verificação

- TypeScript aprovado e 42 testes da suíte principal aprovados.
- 12 regressões PostgreSQL/PGlite aprovadas em `node scripts/qa-progress-reconciliation.mjs`. A dependência isolada fica em scripts/qa-db; pode ser fornecida por `PGLITE_MODULE`.
- Fase 2, Macro 02, QA Master, Macro 03 e três testes de integração aprovados.
- Migração aplicada ao banco mfrydtrzjxscbkaiwfnw; nome e versão local correspondem ao recibo remoto.
- Consulta autenticada dos dois perfis: duas conclusões válidas, 15 dias ativos e as mesmas janelas de treino. Overview: duas conclusões e 177 minutos; RPE não informado. Antes eram cinco conclusões e 228 minutos, com três execuções inválidas.
- Conferência SQL em transação com ROLLBACK: 35 contextos profissionais/overviews conferidos contra as execuções válidas e 32 pares aluno–professor com observações idênticas.
- As 70 execuções da aluna conferida foram preservadas, assim como avaliações, prescrições e acompanhamento existente. Nenhuma mensagem ou orientação nova foi enviada.
- ACLs conferidas após a migração: helper privado inacessível a anon/authenticated; endpoints profissionais seguem negados ao aluno. Os advisors mantêm os avisos anteriores das RPCs SECURITY DEFINER autorizadas, sem expor o helper novo.

O teste cobre projeções, autorização dos endpoints conferidos e apresentação da validade. Não equivale a homologação de provedores externos ou a uma nova execução física de treino.
