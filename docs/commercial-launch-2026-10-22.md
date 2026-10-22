# Oferta 9FIT PRO — preparação comercial

## Produto e operação

Um produto digital, mensal R$ 97 ou anual R$ 997, mesmos benefícios. Valores preservados dos links existentes; condições no provedor ainda precisam de conferência. Nenhum preço foi alterado na InfinitePay.

Proposta: **Seu treino organizado. Sua evolução registrada.** Planejamento e execução, sessões/cargas, avaliação guiada e histórico, ajustes conforme contexto. Sem promessa de resultado físico ou diagnóstico. Profissionais via Staff, contratados separadamente, conforme disponibilidade e condições do serviço. Não anunciar como incluídos concierge humano, consulta nutricional, smartwatch, IA ilimitada ou futuros módulos.

Suporte NINE FIT: envio pelo app; resposta por e-mail em até 24 horas, para o e-mail da conta. Destino autorizado: 9fit.nine@gmail.com. O usuário não especificou exceção de fins de semana: texto mantém 24 horas, sem inventar dias úteis. Não é urgência. Equipe precisa acompanhar a caixa e cumprir o prazo.

## Estado técnico / bloqueios de lançamento

- Catálogo único em src/config/commercialOffer.ts, usado no modal e assinatura. Entradas legadas reexportam a tela canônica.
- Eventos de clique não são trial nem conversão. Removidas promessas de teste grátis e cancelamento em um clique nesses fluxos.
- Formulário em assinatura e Equipe > Suporte; grava support_tickets sob identidade autenticada/RLS. Limite aplicativo de 5/h (não substitui rate limit de infraestrutura); falhas e encaminhamento não confirmado são explícitos.
- Edge Function fitpro-support: JWT e getUser, destinatário fixo, validação de tamanho, sem anexos/dados de saúde. RESEND_API_KEY e SUPPORT_FROM_EMAIL devem estar configurados; remetente deve ser verificado. A existência dessas configurações não foi confirmada (CLI sem autenticação). Teste de entrega autenticado ainda necessário. Não dizer que e-mails já chegam.
- Webhook legado publicado aceitava user_email/plan_id sem comprovar pagamento e atualizava profiles.plan_status. Tela lê user_subscriptions; não há trigger de conciliação entre eles. Endpoint colocado em fail-closed (503/403), sem alterar assinaturas existentes. Não é integração pronta.
- CHECKOUT_READY=false: links InfinitePay preservados no catálogo, mas não há botão de cobrança enquanto pagamento->assinatura não passar no teste. CTA comercial abre contato explicitamente, não simula compra.

Antes de tráfego de conversão: conferir os dois planos na InfinitePay; autenticar eventos conforme contrato real do produto Planos/Recorrências; verificar pagamento no servidor; mapear usuário por referência confiável; idempotência; atualizar assinatura canônica; renovação, falha, cancelamento e expiração; teste de ponta a ponta com aprovação humana para qualquer cobrança. Não usar contrato de Checkout avulso como se fosse de assinatura sem confirmação.

## Criativos preparados, NÃO veiculados

Título: Seu treino organizado. Sua evolução registrada.

Texto A: Planeje seus treinos, registre suas sessões e acompanhe sua evolução em um só lugar. Conheça o 9FIT PRO.

Texto B: Tire seu treino do improviso. Organize sua rotina e veja o histórico do que você realmente registrou no 9FIT PRO.

CTA: Conhecer o 9FIT PRO.

Não veicular como compra pronta enquanto os bloqueios acima persistirem. Não foram criados anúncios, pixel, públicos, campanhas nem gastos. Para ativação serão necessários canal/conta, destino final validado, criativos aprovados e limite de orçamento autorizado.
