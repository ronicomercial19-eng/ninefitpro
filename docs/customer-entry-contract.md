# Entrada multicanal e retorno do pagamento

Rotas públicas preparadas:

- https://ninefitpro.lovable.app/9fit/entrada
- https://ninefitpro.lovable.app/9fit/entrada?intent=purchase
- https://ninefitpro.lovable.app/9fit/pagamento/retorno

O retorno é navegação, não confirmação. Não cria assinatura, não associa e-mails, não libera plano por query string. Credenciais, comprovantes e IDs de transação não são persistidos no navegador. Continuação local guarda apenas intenção permitida e horário por até 24h; não é autorização. Outro dispositivo não compartilha esse contexto: a conta continua pelo estado do servidor.

## Regras por canal

| Entrada | Comportamento |
|---|---|
| Sem conta / sem sessão | Oferece cadastro, login e Google. Preserva continuação no mesmo navegador. |
| Novo e-mail confirmado | Primeiro acesso e configuração conforme registros existentes. Não atribui assinatura. |
| Google | Não força criação de senha; continua configuração conforme ficha existente. |
| Retorno após pagar, sem sessão | Pede login/cadastro; nunca associa compra só pelo e-mail informado no URL. |
| Retorno com acesso ativo/trial registrado | Não pede nova compra; continua etapa inicial ou início se já configurado. |
| Retorno ainda sem confirmação | Mostra pendência, permite conferir novamente e continuar configuração, orienta não pagar outra vez. |
| Acesso concedido pela equipe | Se registrado como acesso válido na fonte canônica, não exige compra adicional. Não aceita uma alegação de presente como autorização. |
| Entra antes e decide comprar depois | Entrada com intent=purchase vai à oferta sem obrigar concluir ativação primeiro. |
| Conta já configurada | Não zera nem repete ativação; abre /9fit/os. |
| Conta sem ficha vinculada | Oferece criar ficha com a equipe NINE FIT (Rony), mediante clique; confirma e-mail no servidor, impede duplicação e não confirma assinatura. Se houver conflito de ficha, exige revisão. |
| Professor/admin | Mantém destino profissional /app. |
| Erro de consulta | Mostra erro e retry; nunca diz pagamento aprovado por falha de leitura. |

## Limites encontrados, ainda não resolvidos

O schema athletes exige coach_id NOT NULL. O usuário determinou vincular novos clientes à equipe NINE FIT e identificou Rony como único professor da equipe. Foi selecionado o cadastro principal 'roni', administrador que já concentra 38 alunos, por configuração privada do servidor. A migração 20261022235018_ninefit_customer_entry_provisioning.sql cria fn_ensure_ninefit_customer(): sem parâmetros de identidade/coach, só conta student ativa com e-mail confirmado, chave auth.uid(), lock por usuário, preservação de fichas existentes e rejeição de conflito por e-mail. A ficha só é criada após clique explícito com aviso do vínculo à equipe. Perfil verificado novo já tem credencial própria ou OAuth e não é obrigado a trocar senha. A função não cria assinatura ou atendimento contratado.

Teste em transação com rollback, antes e depois da aplicação: criação sob role authenticated, RLS de leitura, coach correto, repetição idempotente, nenhuma assinatura criada e bloqueio de usuário anônimo. Não ficaram dados de teste gravados. O painel do professor não foi corrigido nem declarado funcional nesta entrega.

Advisors revisados antes/depois. A configuração fica no schema private, sem grants a anon/authenticated, com RLS sem políticas (deny-all intencional; advisor informativo rls_enabled_no_policy). A RPC SECURITY DEFINER é intencional, exige conta verificada e papel student ativo; não aceita IDs do cliente. Avisos globais pré-existentes de funções privilegiadas e configuração de Auth não foram certificados como resolvidos.

O trigger legado auto_link_athlete_on_signup também precisa de revisão separada: contém atualização de proprietário por correspondência de e-mail. Não foi alterado nesta entrega; não declarar auditoria de segurança de cadastro concluída.

Usuários de e-mail com primeiro acesso pendente mantêm o fluxo de senha existente. Distinguir senha temporária de senha escolhida pelo próprio cliente exige um indicador confiável do servidor; não inferir por user_metadata.

A fonte atual de assinatura é user_subscriptions. Concessões manuais registradas somente em profiles.plan_status não são tratadas como pagamento ou assinatura: precisam de conciliação administrativa segura, sem migrar por suposição.

## InfinitePay: links preservados

- Mensal R$ 97: https://invoice.infinitepay.io/plans/ronynapoleao/kvfp4S0k42
- Anual R$ 997: https://invoice.infinitepay.io/plans/ronynapoleao/TatHaBMsUX

O link checkout.infinitepay.io/ronynapoleao/O3AYRqEglt NÃO substitui as assinaturas. Não adicionar redirect_url a links estáticos presumindo suporte: configurar no provedor quando disponível. O artigo de Checkout Integrado não é comprovação do contrato de recorrência dos links invoice.

Referência lida: https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado-da-infinitepay

Nela, redirect_url devolve receipt_url, order_nsu, slug, capture_method, transaction_nsu; esses valores não são confiáveis para autorização. payment_check é servidor, com chave privada, pedido real e verificação do pagamento/valor/identidade. Webhook deve ser autenticado conforme contrato real, idempotente e atualizar assinatura canônica. Recorrência, renovação, estorno e cancelamento continuam pendentes da configuração e teste com o provedor. CHECKOUT_READY permanece false; nenhum pagamento foi feito durante os testes.
