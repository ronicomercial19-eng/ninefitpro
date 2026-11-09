# FitPro / Core: integração implementada em 09/11/2026

## Publicado no backend

- FitPro mfrydtrzjxscbkaiwfnw: core-os-dispatch, com autenticação interna de
  worker ou sessão de administrador. O token interno foi criado no Vault;
  somente service_role pode recuperá-lo.
- Cliente HMAC assina os mesmos bytes enviados e a query com "?"; somente
  aceita o endereço oficial hmppvtdlzsnxyiaozssu. Nunca segue redirecionamentos.
- Fila core_event_queue: idempotência, lease, retry, bloqueio explícito de
  evento sem consumidor e retomada após completar identidade/telefone.
- Eventos de cadastro, pagamento aprovado e treino concluído/pulado passam
  pela fila. Atraso/cancelamento não são classificados como payment.failed.
  Recusa real pode ser enfileirada pelo backend confiável usando fn_core_enqueue;
  o webhook atual da InfinitePay não fornece uma recusa canônica persistida.
- O cron semanal prepara fit360.weekly_checkin somente para usuários já
  vinculados ao chat, ativados e com treino recente. Sem campanha histórica.
- Outbox com persistência transacional de página + cursor e deduplicação por ID.
  Core core-events v10 oferece cursor de data + ID, preservando clientes antigos.
- student.goal_set salva o objetivo e chama fn_treino_rapido e
  fn_apply_readiness_to_workout; não contorna acesso, dor, restrições ou calibração.
- checkin.recorded é registrado em master_registry como weekly_checkin.
  Não inventa os campos da calibração diária.
- renewal.requested e conversation.handoff geram acompanhamento do profissional.
  Pedido de renovação não libera acesso.
- payment.recovery_claimed não confirma pagamento por declaração. Confirma
  somente pagamento canônico paid explicitamente vinculado; sem vínculo,
  exige conferência do profissional/provedor.
- Core: espelhamento, entrega e backlog do chat respeitam opt-out,
  silêncio 22h–7h de Brasília, limite de três mensagens automáticas/dia e
  recusa de destinatário ambíguo. Excesso é adiado, não marcado como entregue.

## Interface e operação

- /api/zap/health: visualização autenticada de administrador no SPA e rota
  JSON com Bearer no servidor Express. A chamada assinada roda no backend.
  Responde apenas status e quantidade de tipos.
- Ação administrativa backfill no worker cria/reutiliza conversas em lotes de
  25, sem publicar signup retroativo. Preserva as conversas com chave legada.
- Chat: polling 4 s aberto/visível, 60 s em segundo plano; deduplicação por ID,
  texto puro e external_id estável para retry da mesma mensagem.
- Painel do profissional mostra solicitações e motivo de impedimento do treino.
  Nova verificação é autorizada por dono/profissional/admin e passa novamente
  pelas mesmas travas canônicas.

## Testes reais do guia

Conta de teste indicada pelo usuário. Nenhuma conta de aluno
foi escolhida por suposição. Os testes ocorreram em 09/11/2026.

1. Health assinado: HTTP 200 e 32 tipos de evento.
2. Conversa existente reutilizada, sem duplicar thread.
3. "menu": mensagem recebida no Core e resposta do menu lida de volta
   pelo backend FitPro através do endpoint assinado.
4. fitpro.signup: fila entregue, identidade/telefone presentes e pergunta
   de objetivo lida no chat.
5. student.goal_set: evento retornou pelo outbox; objetivo salvo no FitPro.
   O retorno conversation.handoff também foi persistido e notificado.

O teste também encontrou uma pré-condição
de treino que requer revisão em Ajuste de Treino; a prescrição foi retida
corretamente como needs_review/training_restrictions_review.
Não remover restrições para forçar o teste a passar.

Teste de provider anterior: A011 done em shadow, 3788 tokens usando adaptador
Vertex. Este teste não promoveu os 100 agentes para live.

## Validação técnica

- node --test scripts/qa-core-integration.test.mjs: sete testes.
- Core: três testes de cursor e cinco testes de autenticação Vertex.
- SQL com rollback: dedupe da fila e inbox, claim exclusivo, privilégios
  dos RPCs, rejeição de identidade e objetivo inválidos.
- SQL com rollback no Core: silêncio, três entregas, quarta adiada e opt-out.
- Verificação de tipos e compilação da interface.

## Secrets

- NINEZAP_SHARED_SECRET: código aleatório compartilhado, igual nos dois
  Supabases. NÃO é chave Google nem JSON de conta de serviço.
- NINEZAP_BASE_URL: https://hmppvtdlzsnxyiaozssu.supabase.co/functions/v1
- NINEZAP_TENANT: fitpro
- JSON de conta de serviço/Vertex permanece somente no secret de IA do Core.
- Nenhum valor de secret foi versionado.

WhatsApp oficial não foi ativado; sender_provider continua log com entrega
no chat do app. O motor e o cadastro dos squads são distintos dos workflows
legados de um banco gerenciado do Lovable.
