Integração FitPro ↔ CORE OS — guia completo
Atualizado em 29/10/2026. Baseado no código das Edge Functions e no banco do Supabase do Core. O código do FitPro não foi lido, então tudo que depende dele está marcado como a confirmar no FitPro.
Equipe do FitPro: comecem pela seção abaixo, que lista o que falta do lado de vocês.
Para a equipe do FitPro: o que falta do lado de vocês
Resumo: o Core já está pronto para receber o chat e os eventos do FitPro. Até agora nenhuma chamada do FitPro chegou, então o primeiro passo é de vocês.
[ ] Apontar o chat para /functions/v1/zap-api/api/public/zap/threads e assinar cada chamada com HMAC-SHA256 (seção 2). O NINEZAP_SHARED_SECRET precisa ser idêntico nos dois lados.
[ ] Ao abrir o chat, criar a conversa com external_key, user_id, name e phone. O telefone é obrigatório (seção 3).
[ ] Enviar cada mensagem com external_id e buscar as respostas por polling a cada 2 a 3 segundos, mostrando as mensagens agent e operator (seção 3).
[ ] Publicar eventos de negócio com phone, name e idempotency_key, começando por payment.failed, payment.approved e student.inactive (seção 4 e tabela da seção 14).
[ ] Consumir o outbox com o cursor next_after e agir nos eventos que pedem ação do app: workout.generate_requested, renewal.requested, subscription.cancel_requested, subscription.pause_requested, class.late_cancel e conversation.handoff (seções 4 e 16).
[ ] Responder as quatro decisões da seção 17: dados do aluno, dona da agenda de aulas, gateway de pagamento e quem gera student.inactive.
[ ] Não usar a função nine-zap; ela é legado (seção 7).
Já resolvido no Core em 29/10/2026: a passagem para atendimento humano agora vale também para o chat do app, e seis eventos novos passam a sair no outbox (cancelamento, pausa e downsell de plano, aula cancelada ou remarcada em cima da hora e avaliação agendada).
1. Visão geral
O FitPro conversa com o Core por três canais, todos no mesmo projeto Supabase do Core:
• Canal A — Chat e mensagens (função zap-api). O aluno fala no app, a mensagem entra no Core, que retoma conversas guiadas, dispara fluxos por palavra-chave e aciona agentes. É o caminho oficial do chat.
• Canal B — Eventos de negócio (função core-events). O FitPro avisa o Core que algo aconteceu (pagamento, cadastro, inatividade) e o Core reage com fluxos e agentes. No sentido contrário, o FitPro lê eventos de saída (outbox) que o Core gera, como pedido de treino ou check-in registrado.
• Canal C — Mensagens proativas no chat do app. Mensagens que o Core envia por iniciativa própria (campanhas, lembretes, 9SENDER) são espelhadas na conversa do app por triggers no banco, sem passar pelo WhatsApp.
Não existe hoje um webhook de pagamento próprio do Core. Pagamentos entram pelo Canal B como eventos (seção 5).
2. Endereços e autenticação
Base: https://hmppvtdlzsnxyiaozssu.supabase.co/functions/v1
• Chat: /zap-api/api/public/zap/threads e /zap-api/api/public/zap/threads/{id}/messages
• Eventos: /core-events/api/public/events, /core-events/api/public/events/types, /core-events/api/public/events/outbox
• Saúde: /zap-api/health e /core-events/health
Assinatura (igual nas duas funções):
• Algoritmo: HMAC-SHA256 em hexadecimal, usando o NINEZAP_SHARED_SECRET.
• Texto assinado: {timestamp}.{material}. No POST, o material é o corpo exato enviado. No GET, é a query string incluindo o ? (ou texto vazio se não houver query).
• Headers: X-Zap-Timestamp (segundos Unix, tolerância de 5 minutos), X-Zap-Signature, X-Zap-Tenant (padrão fitpro) e, nos eventos, Idempotency-Key.
• O secret precisa ser idêntico nos dois lados, sem espaço ou quebra de linha no fim. Ele pode estar como secret da Edge Function ou no cofre do Core.
• Erros de autenticação: 401 com missing signature headers, bad timestamp, timestamp expired ou signature mismatch; 503 se o secret não estiver configurado no Core.
Exemplo de assinatura em TypeScript:
async function sign(secret: string, ts: string, material: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${material}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function core(path: string, method: 'GET' | 'POST', body?: object, query = '') {
  const ts = String(Math.floor(Date.now() / 1000));
  const raw = method === 'GET' ? query : JSON.stringify(body ?? {});
  const res = await fetch(`${BASE}${path}${query}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-zap-timestamp': ts, 'x-zap-signature': await sign(SECRET, ts, raw), 'x-zap-tenant': 'fitpro' },
    body: method === 'POST' ? raw : undefined,
  });
  return res.json();
}
Ponto crítico: a assinatura é calculada sobre o mesmo texto que vai no corpo. Não reserialize o JSON depois de assinar.
3. Canal A — Chat (zap-api)
Criar ou reaproveitar a conversa: POST /threads com external_key (obrigatório, até 200 caracteres, por exemplo fitpro:{id do aluno}), subject e context. A chamada é idempotente: se a chave já existe, a conversa é reaproveitada e o contexto é mesclado. O Core acrescenta sozinho channel: app, internal_only: true e source.
No context, envie sempre:
• user_id (vira external_user_id; é o que faz o Core escolher o agente de alunos, A055, em vez do agente de leads, A011);
• name;
• phone em qualquer formato brasileiro (o Core normaliza para +55...). O telefone também é a chave que faz os eventos de saída chegarem ao FitPro (seção 4).
O phone é obrigatório na prática. As conversas guiadas (menu de aulas, cobrança, check-in) e as mensagens proativas são endereçadas e retomadas pelo telefone. Sem ele, o Core não entrega a mensagem e não consegue ligar a resposta do aluno à conversa guiada em andamento.
Listar conversas: GET /threads?external_key=....
Ler mensagens: GET /threads/{id}/messages?limit=100 (1 a 500), em ordem cronológica. Cada mensagem traz sender_type (user, agent ou operator), body, external_id, attachments e created_at.
Enviar mensagem do aluno: POST /threads/{id}/messages com:
• body (1 a 4000 caracteres);
• external_id (1 a 200 caracteres; use o id da mensagem no FitPro para evitar duplicação em reenvio);
• sender_type (user por padrão);
• attachments (lista, opcional).
O que o Core faz com a mensagem do aluno: ela passa pelo mesmo caminho do WhatsApp, ou seja, retoma uma conversa guiada em andamento, dispara fluxos por palavra-chave e, se for texto livre, aciona o agente A055 (aluno) ou A011 (lead). A resposta do POST traz message, handled_by_flow, flow_status e deduped.
A resposta do Core não vem no POST. Ela aparece depois como mensagem agent na mesma conversa. O FitPro precisa buscar novas mensagens: faça polling de GET messages a cada 2 a 3 segundos enquanto o chat estiver aberto. Usar o Realtime do Supabase em vez de polling é possível, mas exige política de leitura na tabela e é a confirmar no FitPro.
Mensagens enviadas com sender_type agent ou operator pelo FitPro são apenas gravadas na conversa, sem acionar o Core.
Mensagens proativas (Canal C). Três triggers no banco levam mensagens do Core para a conversa do app. Todos localizam a conversa pelo telefone (context.phone) com channel = app:
• trg_mirror_sender_to_app_thread (antes de gravar na fila): mensagem individual de WhatsApp, fora de campanha, vai para o chat do app e a linha da fila fica skipped com erro in_app, ou seja, não sai pelo WhatsApp. As conversas guiadas (menu, cobrança, check-in) usam esse caminho.
• trg_sender_inapp_deliver: com o provedor em modo log (hoje), as mensagens de campanha também são entregues no app. Sem conversa do app com aquele telefone, ficam skipped com erro no_inapp_thread.
• trg_sender_inapp_flush_backlog: ao criar ou atualizar uma conversa do app com telefone, entrega até 5 mensagens das últimas 24 horas que estavam esperando.
Quando o envio real pelo WhatsApp for ligado (sender_provider = meta), as campanhas passam a sair pelo WhatsApp e só as mensagens individuais continuam espelhadas no app.
4. Canal B — Eventos
FitPro → Core
POST /events com type, payload e, opcionalmente, idempotency_key (ou header Idempotency-Key).
Regras:
• type no formato modulo.acao, em minúsculas (por exemplo payment.failed), até 100 caracteres.
• Prefixos reservados ao Core e recusados: agent., zap., alert., conversation. e message..
• payload com no máximo 8000 caracteres; phone é validado e normalizado; name é cortado em 120 caracteres.
• Repetir a mesma idempotency_key em 24 horas devolve deduped: true sem duplicar.
• O Core só aceita o evento se houver um fluxo ou agente ativo consumindo aquele tipo. Caso contrário responde 422 evento sem consumidor ativo.
• A fonte da verdade dos tipos aceitos é GET /events/types, que lista cada tipo e quem consome.
Tipos com consumidor ativo hoje (fluxos do 9FLOW):
• Aluno e treino: student.inactive, student.plan_expiring, progress.reassessment_due, periodization.cycle_ending, workout.published, assessment.requested, posture.assessment_done, health_day.completed, fit360.weekly_checkin, program.purchased, contract.expiring.
• Pagamento e vendas: payment.approved, payment.failed, sale.closed, cart.abandoned, healthflix.trial_ending.
• Cadastros e leads: fitpro.signup, store.signup, freelancer.signup, gymmanager.signup, personal.lead, lead.high_ticket, techsoft.lead, freelancer.job_available, nutrifoods.order_requested, smarttreino.requested, product.integration_requested.
Tipos consumidos por agentes: checkout.abandoned (A013), subscription.cancelled (A018), incident.opened (A009), payment.failed (A036), lead.created (A011) e pain.reported (A048).
Inclua sempre phone e name. Todo fluxo com conversa ou mensagem usa o telefone do evento; sem ele o fluxo falha (ask: destinatario ausente). Exceção: contract.expiring, health_day.completed, sale.closed e product.integration_requested são internos e não levam telefone. Os campos extras de cada tipo estão na seção 14.
Core → FitPro (outbox)
GET /events/outbox?after={data ISO}&limit=100&types=a,b:
• limit de 1 a 200; sem after, devolve as últimas 24 horas.
• Resposta: events (id, type, created_at, payload), next_after e has_more. Guarde o next_after como cursor da próxima chamada e repita enquanto has_more for verdadeiro.
• Tipos de saída (mais seis desde 29/10/2026, listados na seção 16): offer.interest, proposal.requested, workout.short_requested, workout.generate_requested, student.goal_set, payment.recovery_claimed, checkin.recorded, renewal.requested, onboarding.requested, periodization.next_cycle_requested, followup.requested, reassessment.requested, checkout.resume_requested, store.onboarding_requested, freelancer.onboarding_requested, job.accepted, job.declined, lead.qualified, order.requested e conversation.handoff.
• Isolamento: o Core só entrega os eventos cujo telefone pertence a uma conversa do tenant. Sem context.phone na conversa, nenhum evento de saída chega ao FitPro.
• Processe cada evento de forma idempotente, usando o id do evento.
5. Pagamentos
O Core não tem rota de webhook de pagamento, e a cobrança criada pelos agentes fica como registro pendente (provedor manual). O caminho previsto é o FitPro, ou o gateway por meio do FitPro, publicar payment.approved e payment.failed no Canal B, que já têm fluxo ativo. Para um gateway enviar direto ao Core seria preciso criar uma rota nova; isso depende de qual gateway será usado e está pendente de decisão.
6. Tabelas de apoio
fitpro_links (vínculo entre ids do FitPro e ids locais) e fitpro_event_log (registro de eventos recebidos) existem, mas estão vazias e não são usadas pelo core-events atual, que grava direto em events. Se for necessário auditar cada evento do FitPro ou mapear ids, o core-events precisa passar a gravar nelas.
7. A função nine-zap (legado)
Existe uma segunda função de chat, a nine-zap, anterior à zap-api. Ela não usa as mesmas rotas e, por padrão, responde sozinha com IA. Em 29/10/2026 foi ajustada para encaminhar ao Core quando o modo for live e para tratar dor e lesão antes da IA, mas o caminho oficial é a zap-api. Recomendação: apontar o FitPro para a zap-api e descontinuar a nine-zap depois do primeiro teste ponta a ponta.
8. Comportamento de segurança que o FitPro vai observar
• Relato de dor, lesão ou risco clínico nunca é respondido por IA: vai para um profissional humano, com alerta no painel do operador.
• O squad clínico (Iota) sempre exige aprovação humana.
• Resposta a mensagem recebida não é barrada pelo horário de silêncio nem pelo limite diário de mensagens; já as mensagens proativas são.
• Em modo shadow (atual), os agentes raciocinam mas não executam efeitos externos. O 9FLOW não respeita o shadow: fluxos e conversas guiadas executam e enfileiram mensagens normalmente, inclusive para eventos publicados pelo FitPro. Já o gate de dor e lesão vale só para agentes; nos fluxos, apenas o check-in semanal tem triagem de dor própria.
• Em live, a resposta de cada agente respeita o nível de autonomia dele (approval, notify ou auto).
9. Situação atual (29/10/2026)
• Nenhuma requisição do FitPro chegou a nenhuma das funções nas últimas 24 horas: o problema da assinatura ainda é anterior ao servidor (URL errada, chamada não disparada ou outro ambiente).
• Todos os runs de agentes falham porque a chave do Gemini está bloqueada no Google Cloud (API_KEY_SERVICE_BLOCKED). Enquanto isso, conversas guiadas e fluxos funcionam; respostas de agentes em texto livre, não.
• O envio externo está em modo de registro (sender_provider = log), sem entrega real por WhatsApp.
• O Core está em shadow.
10. Checklist de implementação no FitPro
1. Configurar três variáveis: base da URL, NINEZAP_SHARED_SECRET e tenant fitpro. Conferir o secret nos dois lados.
2. Implementar a função de assinatura (seção 2) e testar com GET /zap-api/health e depois com GET /threads assinado.
3. Ao abrir o chat, criar ou reaproveitar a conversa com external_key, user_id, name e phone.
4. Enviar cada mensagem com external_id, tratar 401, 422 e 502 e repetir com o mesmo external_id em caso de falha de rede.
5. Buscar novas mensagens por polling enquanto o chat estiver aberto e mostrar agent e operator como respostas.
6. Publicar os eventos de negócio da seção 4 com phone, name e idempotency_key, começando por payment.failed, payment.approved e student.inactive.
7. Consumir o outbox com cursor (next_after) e tratar primeiro workout.generate_requested, checkin.recorded e conversation.handoff.
8. Registrar no FitPro os erros do Core para investigar sem precisar abrir o Supabase.
11. Critérios de aceite
• Uma mensagem assinada do FitPro aparece em zap_messages da conversa certa e, no Core, gera uma execução de agente ou de fluxo.
• A mesma mensagem reenviada com o mesmo external_id não duplica.
• Uma mensagem com relato de dor gera alerta humano e nenhuma resposta de IA.
• Um evento payment.failed publicado pelo FitPro dispara o fluxo correspondente.
• Um evento de saída gerado pelo Core é lido no outbox e processado uma única vez.
• Com o Core em live, a resposta do agente aparece no chat do app em até alguns segundos.
12. Pontos a confirmar no código do FitPro
• URL e headers que o FitPro usa hoje ao chamar o Core, e se alguma chamada é disparada de fato.
• De onde vem o user_id e se o telefone do aluno está sempre disponível.
• Se o chat usa polling ou Realtime para mostrar mensagens novas.
• Qual gateway de pagamento está em uso e quem publica payment.approved e payment.failed.
• Quem gera student.inactive e student.plan_expiring: o FitPro ou uma varredura do Core.
13. Dados do aluno: o que o Core tem e o que falta sincronizar
Hoje o Core não guarda o cadastro nem o histórico dos alunos do FitPro, e nenhuma rota recebe esses dados. Verificado no banco em 29/10/2026:
• workouts, workout_assignments, performance_logs, leads e profiles têm 0 linhas; class_sessions tem 2.
• profiles guarda só nome e avatar de operadores do painel, não de alunos. Não existe tabela mestra de alunos.
• O aluno é identificado por três chaves soltas: external_user_id (id do FitPro, em texto) em workout_assignments, phone em class_sessions e nas conversas, e lead_id em leads. O único elo entre elas é o telefone.
• Os agentes leem dados com data.query (somente leitura, até 50 linhas, só em tabelas liberadas para o squad; o Epsilon, por exemplo, lê workouts, workout_assignments, performance_logs e class_sessions). Com a tabela vazia, a regra do agente é registrar sem dados e encerrar sem ação. Na prática, sem dados o agente A055 não tem sobre o que conversar.
• Os fluxos só escrevem em leads, events, memory_bus e nas tabelas sender_*. Nenhuma rota recebe treino, execução ou frequência do FitPro.
Três caminhos possíveis para trazer os dados:
1. Memória por aluno. O FitPro publica um evento de resumo (por exemplo student.snapshot, com plano, objetivo, treino atual e última frequência). Um fluxo grava no memory_bus com escopo user e scope_id igual ao id do aluno, e o agente lê com memory.read. É o mais curto e não exige tabela nova; exige criar o fluxo consumidor.
2. Rota de sincronização. Criar uma função com HMAC (por exemplo core-sync) que grava em workouts, workout_assignments e performance_logs. Dá dados estruturados aos agentes; dá mais trabalho.
3. Consulta ao FitPro. Um fluxo chama uma API do FitPro pelo nó http (que só aceita URLs públicas). Agentes não chamam HTTP direto, então a consulta passaria por um fluxo, e o FitPro precisaria expor uma API autenticada.
14. Campos de cada evento do FitPro
Levantado lendo os 27 fluxos ativos por evento. A coluna Campos lista o que o fluxo lê do evento, além de phone e name quando indicados. Respostas do aluno (objetivo, escolha, confirmação) vêm da conversa, não do evento. Um asterisco em Evento de saída significa que ele não é entregue pelo outbox (seção 16).
Evento
Campos
Fluxo ativo
Evento de saída
assessment.requested
phone, name
Agendamento de avaliação física (conversa guiada)
assessment.scheduled*, conversation.handoff
cart.abandoned
phone, name, cart_id
NineFit: carrinho abandonado
checkout.resume_requested
contract.expiring
client, contract, days (sem telefone)
Contratos: renovação
renewal.proposal_requested*
fit360.weekly_checkin
phone, name
Fit360: check-in semanal com triagem de dor
checkin.recorded
fitpro.signup
phone, name
Onboarding FitPro: objetivo e primeiro treino
student.goal_set
freelancer.job_available
phone, name, job_id, job_label
Staff Connect: vaga para freelancer
job.accepted, job.declined
freelancer.signup
phone, name
Staff Connect: cadastro de freelancer
freelancer.onboarding_requested
gymmanager.signup
phone, name
Gym Manager: onboarding
onboarding.requested
health_day.completed
condominio, inscritos (sem telefone)
Health Day → Nine Living
proposal.requested
healthflix.trial_ending
phone, name
HealthFlix: fim do teste e conversão
offer.interest
lead.high_ticket
phone, name
Alto ticket: triagem de proposta
proposal.requested
nutrifoods.order_requested
phone, name
Nutrifoods: pedido
order.requested
payment.approved
phone, name
NineFit Connect: pagamento aprovado
nenhum
payment.failed
phone, name
Cobrança: pagamento recusado
payment.recovery_claimed
periodization.cycle_ending
phone, name, student
Periodizer: fim de ciclo (para o profissional)
periodization.next_cycle_requested
personal.lead
phone, name
9FIT: lead de assessoria de personal
lead.qualified
posture.assessment_done
phone, name
Postura Pro: avaliação concluída
followup.requested
product.integration_requested
product (sem telefone)
Protocolo: entrada de novo produto
product.integration_checklist*
program.purchased
phone, program
Nine Fit Nine: compra de programa gravado
nenhum
progress.reassessment_due
phone, name
Progress Tracker: hora de reavaliar
reassessment.requested
sale.closed
offer, seller, value (sem telefone)
Comercial: comissão de venda (10%)
commission.due*
smarttreino.requested
phone, name
SmartTreino: treino por perfil
workout.generate_requested
store.signup
phone, name
Fitness Place: cadastro de loja
store.onboarding_requested
student.inactive
phone, name
Retenção: reativação de aluno sumido
workout.short_requested
student.plan_expiring
phone, name
Fit Training ADM: plano perto de vencer
renewal.requested
techsoft.lead
phone, name
Techsoft: lead de solução digital
proposal.requested
workout.published
phone, name
Fit Central: treino lançado pelo coach
nenhum
Os eventos zap.message_received (mensagens do chat) também têm dois fluxos: o menu de aulas e o atendimento humano (seção 15).
15. Agenda de aulas e menu do aluno
A agenda de aulas do personal já funciona dentro do Core, pelo chat. O aluno abre o menu escrevendo uma destas palavras: menu, aula, aulas, agendar, marcar, desmarcar, remarcar, reagendar, reajustar, cancelar ou cancelamento. Escrever atendente, humano ou suporte passa a conversa para atendimento humano.
• O que o menu faz: mostra dias e horários livres, lista as aulas do aluno, agenda, cancela e remarca. A reativação, a cobrança e as demais conversas guiadas usam o mesmo mecanismo.
• Regras (política class_policy): cancelamento gratuito até 12 horas antes; aviso mínimo de 2 horas para agendar; janela de 14 dias; no máximo 4 aulas futuras por aluno. Cancelar ou remarcar com menos de 12 horas marca a aula como late_cancel e emite class.late_cancel ou class.late_reschedule.
• Onde ficam os dados: disponibilidade em trainer_availability (11 faixas ativas hoje) e aulas em class_sessions (2 hoje), identificadas pelo telefone do aluno, no fuso America/Sao_Paulo.
• Lembretes: um fluxo agendado a cada 15 minutos envia lembrete 24 horas e 2 horas antes da aula.
• No chat do app: as opções aparecem como lista numerada em texto, e o aluno responde com o número ou com o texto. Botões e listas interativas existem só no WhatsApp.
A agenda tem uma só dona. Se o FitPro também tem agenda de aulas, é preciso escolher: o Core como dona (o FitPro passa a ler as aulas por uma rota nova ou por eventos) ou o FitPro como dona (os fluxos deixam de gravar em class_sessions e chamam a API do FitPro pelo nó http). Hoje o agendamento não emite evento algum, então o FitPro só saberia de uma aula marcada lendo a tabela.
16. Ações do Core que não chegam ao FitPro
O outbox só entrega eventos de origem 9flow, de uma lista fixa de 26 tipos (20 originais e 6 acrescentados em 29/10/2026), cujo telefone pertença a uma conversa do tenant. Por isso várias ações do Core ficam sem canal de volta:
Ação no Core
O que acontece hoje
Chega ao FitPro?
Correção
Agente atribui treino (fitness.assign_workout)
Grava em workouts e workout_assignments do Core; não emite evento
Não
Emitir workout.assigned e incluí-lo no outbox, ou o FitPro ler a tabela
Agente propõe oferta (offers.propose)
Emite offer.proposed com origem do agente
Não (origem diferente de 9flow)
Emitir com origem 9flow ou ampliar o filtro do outbox
Agente cria cobrança (billing.create_charge)
Grava em transactions como pendente (provedor manual)
Não
Depende da escolha do gateway
Fluxos emitem eventos fora da lista
assessment.scheduled, class.late_cancel, class.late_reschedule, subscription.cancel_requested, subscription.downsell_requested e subscription.pause_requested
Sim, resolvido em 29/10/2026: os seis entram na lista do core-events
Os outros três (renewal.proposal_requested, product.integration_checklist, commission.due) não levam telefone e continuam internos
Passar para humano em conversa do app
Antes, a marca human_handoff só ia para conversas wa:{telefone}
Sim, resolvido em 29/10/2026: um trigger no banco marca a conversa do app pelo telefone quando o fluxo emite conversation.handoff
Para o Core voltar a responder, o campo human_handoff da conversa precisa ser limpo; não encontrei rota para isso (confirmar no painel)
Alerta de dor ou lesão
Grava em decisions (painel do operador)
Não
Se o FitPro precisar avisar o profissional, emitir um evento de saída
Opt-out do aluno
Grava em sender_suppressions e marca a conversa
Não
Emitir evento de saída se o FitPro precisar espelhar o descadastro
17. Decisões pendentes e ordem de implementação
Quatro decisões travam o desenho final. Nenhuma depende de chaves:
1. Dados do aluno (seção 13): memória por aluno, rota de sincronização ou consulta ao FitPro.
2. Dona da agenda de aulas (seção 15): Core ou FitPro.
3. Gateway de pagamento (seção 5): qual é, e se o FitPro ou o gateway publica payment.approved e payment.failed.
4. Saídas para o FitPro (seção 16): ampliar o outbox e emitir workout.assigned, ou o FitPro ler tabelas do Core.
Ordem recomendada:
1. Fazer o FitPro chamar a zap-api com o secret certo (seção 10, itens 1 e 2) e liberar a chave do Gemini no Google Cloud.
2. Chat ponta a ponta com user_id, name e phone na conversa, com polling de mensagens.
3. Eventos de pagamento (payment.failed e payment.approved) pelo Canal B.
4. Ajustes no Core: marcar human_handoff na conversa do app e ampliar a lista do outbox.
5. Implementar a decisão 1 (dados do aluno) e a decisão 2 (agenda).
6. Consumir o outbox no FitPro e tratar cada evento de saída.
7. Passar o Core para live por squad, começando pelo Epsilon (engajamento), com os agentes em approval.