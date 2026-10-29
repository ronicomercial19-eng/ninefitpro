# FitPro ↔ CORE OS: estado da integração

## Correção do canal de chat — 29/10/2026

O frontend chamava thread.ensure, mas zap-proxy v55 não implementava essa ação e exigia thread_id nas mensagens, embora o app não o enviasse. O destino padrão era a hospedagem Lovable, não a Edge Function oficial.

A v56 publicada resolve a identidade com fn_current_athlete_id e lê nome/telefone do atleta com a sessão do usuário. Reutiliza a conversa por external_key=fitpro:{auth_user_id}; context inclui user_id, athlete_id, name e phone normalizado. Grava o vínculo em core_chat_threads, acessível apenas pelo servidor. O cliente não escolhe conversa, aluno ou papel de remetente. O HMAC permanece no servidor, assina exatamente o corpo ou query enviados e usa a rota oficial do projeto hmppvtdlzsnxyiaozssu. O destino antigo NINEZAP_BASE_URL não é mais utilizado.

O app consulta mensagens a cada 2,5 segundos enquanto a aba Equipe está aberta e visível. Exibe user, agent e operator. Em falha, interrompe polling até nova tentativa. O external_id é mantido para reenvio do mesmo texto após falha, enquanto o componente estiver montado; recarregar a página encerra essa retenção. Não há alegação de fila offline persistente.

Telefone ausente/inválido recebe erro específico e atalho para atualização do perfil. Erros operacionais são gravados em integration_events_log sem corpo das mensagens, telefone ou secret. Requisições ao Core têm timeout e recusam redirecionamento. Nenhuma mensagem de aluno ou evento fictício foi enviado nesta rodada.

## Dependências que não estão resolvidas

- A tentativa de ler zap-api no projeto CORE OS pelo conector retornou falta de permissão. Não foi possível confirmar as afirmações do handoff contra o código atual do Core.
- A CLI local não tem access token. Não foi possível consultar a presença de NINEZAP_SHARED_SECRET; igualdade entre projetos também não está confirmada. Não foram solicitados ou expostos valores de secrets.
- Chave Gemini bloqueada, modo shadow, sender_provider=log e consumidores/eventos são condições relatadas no handoff, ainda não verificadas com o acesso atual. Nenhuma dessas configurações foi alterada.
- Canal B ainda não implementado: publicação durável de payment.approved/payment.failed/student.inactive e consumidor do outbox com cursor/idempotência. O zap-webhook legado não substitui o outbox descrito no guia.
- Nenhum pedido do Core cancela acesso, confirma pagamento, altera treino ou agenda automaticamente nesta entrega.

## Definições sustentadas pelo FitPro atual

- Gateway identificado: InfinitePay. O FitPro já recebe e verifica pagamentos e é o ponto de origem adequado para publicar eventos confirmados. Pagamento pendente/abandono não deve ser inventado como payment.failed.
- FitPro mantém o cadastro, prescrição, execução e acesso como dados canônicos. A opção de memória por aluno exige consumidor no Core, hoje inacessível; não enviar student.snapshot antes de existir consumidor ativo.
- FitPro já possui agenda: a duplicação com class_sessions do Core exige escolher a dona e adaptar os fluxos do outro lado. Não há sincronização bidirecional pronta.
- Pedidos workout.generate_requested/short_requested devem usar geração e travas canônicas do FitPro; cancelamento/pausa/renovação dependem do contrato comercial vigente (acesso avulso por prazo, sem recorrência integrada).

## Próximas entregas necessárias

1. Configurar/verificar o secret pelos painéis dos dois projetos e liberar o acesso técnico ao Core.
2. Definir a dona da agenda e criar o consumidor de resumo de aluno no Core.
3. Fila durável de eventos de saída do FitPro, com retry, telefone/nome, idempotência e classificação de falhas reais da InfinitePay.
4. Leitor do outbox, com cursor persistido somente após gravação durável dos eventos e deduplicação por id; fila de ações e acompanhamento do professor.
5. Conectar cada ação recebida às RPCs canônicas, sem converter pedidos de cobrança em confirmação de pagamento.
6. Publicar geração de inatividade/vencimento com política explícita e sem disparar campanhas retroativas por surpresa.

Compilação técnica e CI do repositório são distintas do QA manual, reservado ao responsável. Não declarar o guia inteiro concluído pela correção do chat.
