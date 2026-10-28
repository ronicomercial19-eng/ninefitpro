# Checkout Integrado InfinitePay

## Oferta e vínculo

O checkout vende um mês (R$ 97) ou doze meses (R$ 997) de acesso ao 9FIT PRO, com pagamento único e renovação manual. Não cria uma assinatura recorrente no provedor.

Os checkouts compartilhados informados pelo proprietário são:

- Mensal: https://checkout.infinitepay.io/ronynapoleao/2utdwtAthR
- Anual: https://checkout.infinitepay.io/ronynapoleao/y7bJTioTMm

Eles ficam registrados como referências comerciais. Os botões do app levam a `/9fit/checkout/basic` ou `/9fit/checkout/annual`, exigem conta confirmada e criam um checkout por pedido. O identificador `order_nsu` é gerado no servidor e vinculado ao usuário autenticado. Não é atribuído acesso por e-mail informado no webhook ou por flags na URL.

Retorno: https://ninefitpro.lovable.app/9fit/pagamento/retorno

Webhook: https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/infinitepay-webhook

## Fluxo

1. `infinitepay-checkout` valida a sessão com `auth.getUser`, rejeita contas anônimas/não confirmadas e prepara um pedido pelo serviço backend. Período/preço são definidos no banco.
2. A API `/links` recebe o pedido, os itens, retorno e webhook. Nenhum nome, e-mail, senha ou token do usuário é enviado para gerar o link.
3. A resposta real pode ser um slug ou uma URL assinada com `?lenc=`; ambos os formatos são aceitos exclusivamente no domínio/merchant InfinitePay esperado. A primeira URL persistida é reutilizada nas tentativas seguintes. Há limite de cinco pedidos por hora por conta.
4. Webhook e retorno consultam `/payment_check` no servidor. Apenas `success=true`, `paid=true`, valor original exato e valor pago suficiente permitem chamar a confirmação.
5. A RPC de confirmação só pode ser executada pelo serviço backend. Ela grava a assinatura e o recibo do pedido na mesma transação. `transaction_nsu` é único. Reenvio do mesmo pagamento não estende o acesso duas vezes.
6. Cada compra soma um mês/ano de calendário, em São Paulo, ao fim do acesso ativo com prazo; sem acesso vigente, começa no momento da confirmação.
7. O retorno mostra pendência até haver confirmação. A referência sobrevive ao login em armazenamento de sessão por até quatro horas. Outro usuário não pode consultar ou reivindicar o pedido.

## Operação

- Dados: `infinitepay_orders` permite leitura do próprio usuário, sem escrita pelo cliente. `infinitepay_payment_reviews` só é acessível ao serviço backend. Ambas têm RLS habilitado.
- Uma compra paga feita diretamente em link compartilhado, sem pedido do app, é conferida com o provedor e entra em `infinitepay_payment_reviews`. Ela exige conciliação pelo suporte, porque a documentação do aviso não oferece identidade suficiente para vincular uma conta com segurança.
- Para anúncios com liberação automática, divulgar a página do app/planos, não um checkout compartilhado direto.
- `INFINITEPAY_API_KEY` é opcional no backend para contas/configurações que a utilizem. O fluxo básico por handle foi exercitado com a API real. Nunca colocar a chave no frontend.
- O antigo segredo de header personalizado não é usado como prova de pagamento. O webhook é público e a confirmação depende da consulta ao provedor e de um pedido interno.
- Estornos, disputas e cancelamentos de cobranças não têm revogação automática implementada por este fluxo de pagamento único. Devem ser conciliados pelo suporte no provedor e no acesso do app. Não tratar o payload de estorno sem verificação como ordem para retirar acesso.
- A integração registra o direito de acesso consumido pelos leitores existentes. Esta alteração não refaz permissões de treino nem bloqueia alunos legados atendidos por profissionais.

## Verificação

- Testes de handlers: identidade forjada, alteração de preço, ausência de autenticação, link reutilizado, pagamento não aprovado, valor incorreto, aviso duplicado, outra conta, falha do provedor e URL externa.
- PostgreSQL/PGlite: 18 verificações de idempotência, prazo mensal/anual, extensão de acesso, unicidade de transação, rollback, autorização de RPC e RLS.
- Banco publicado em transação com ROLLBACK: concessão mensal, recibo duplicado e extensão anual passaram com verificação simulada. Após o rollback, zero assinaturas e zero pedidos pagos; nenhuma liberação de teste permaneceu.
- Smoke autenticado em produção, sem pagamento: geração dos dois períodos pela InfinitePay, repetição sem outro pedido, bloqueio de anônimo (401), bloqueio de outra conta (403), aviso falso rejeitado (400), pedidos pendentes e nenhuma assinatura liberada.
- O primeiro smoke detectou o formato `?lenc=` retornado pela API real; uma migração adicional e um validador compartilhado corrigiram a compatibilidade.
- Foram criados pedidos/links de teste não pagos. Não foi realizada compra, inserido cartão, enviado Pix, concedido acesso pago real ou disparada mensagem para terceiros.
- A liberação após aprovação real foi exercitada com provedor simulado e banco isolado; um pagamento real de ponta a ponta ainda não foi realizado.

Documentação: https://www.infinitepay.io/checkout-documentacao e https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado-da-infinitepay.
