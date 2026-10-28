# Acesso pago e conferência automática

## Fonte de verdade

O banco decide acesso por `fn_fitpro_access_status`: perfil desativado é recusado; equipe ativa mantém área profissional; assinatura ativa precisa estar dentro da validade; concessão explícita da consultoria é uma origem separada de acesso. O relógio usado é do servidor. Parâmetros de URL, metadados editáveis do usuário, onboarding e recibo visual não liberam assinatura.

A migração preservou uma fotografia de 34 contas existentes vinculadas à consultoria, sem assinatura cadastrada. Novos cadastros e novas atribuições a professor não criam concessão. Uma conta já compradora não recebe cortesia retroativa. Nenhuma assinatura paga existia no projeto no momento da aplicação; não houve cobrança real de teste.

O frontend interrompe os módulos pagos quando vence a validade e consulta novamente ao retornar ao foco, após pagamento e periodicamente. Conta, renovação, suporte, histórico e serviços de aulas/créditos independentes continuam acessíveis. Acesso à tela não substitui autorização: RLS, triggers e guardas em RPCs protegem leitura de prescrição e escrita de treinos; as APIs de IA/conteúdo validam usuário, acesso e identificadores de destino antes do processamento.

## APIs

22 funções foram atualizadas a partir das versões efetivamente implantadas, preservando corpo e dependências existentes. Identificadores de aluno/usuário em payloads comuns e query são conferidos; aluno pago não pode usar essa autorização para direcionar outro aluno. Profissional segue restrito à própria carteira, e administrador segue seu papel canônico. Requisições internas com chave de serviço continuam possíveis.

Proteção de frequência por conta/minuto: IA 10 (equipe 60); conteúdo 60 (equipe 180). Contadores atômicos guardam uma linha por conta/categoria, sem crescer por minuto histórico. Isso é proteção de frequência, não teto financeiro diário nem promessa de uso ilimitado. Resposta 429 informa `Retry-After`. Limites de entrada: 64 KiB normalmente e 12 MiB para imagem/vídeo/scan. Preflight inclui os cabeçalhos do cliente atual.

## Conferência de pagamentos

- Checkout e webhook continuam exigindo consulta server-to-server à InfinitePay, com valor e identidade do pedido vinculados no banco.
- Recibos pagos são revistos a cada seis horas enquanto houver período de acesso a preservar. Trabalho limitado a 10 recibos/minuto mais 10 candidatos pendentes/minuto, quatro consultas simultâneas por execução e lease contra processamento concorrente. Essa capacidade cobre 3.000 recibos/6h.
- Falha/indisponibilidade da InfinitePay registra erro e tenta mais tarde; não transforma falha de rede em inadimplência nem estende validade.
- Resposta explícita `success=true, paid=false` suspende a assinatura correspondente. Nova confirmação restaura o mesmo período; não adiciona mês/ano novamente.
- Pedido já pago não fica em cache para sempre: callbacks antigos são rechecados. Duplicata recente é idempotente. Um segundo pagamento genuíno distinto permanece para revisão, sem concessão em dobro.
- Vencimento é aplicado no acesso em tempo real; não depende do cron. Cron também organiza estados/histórico e informa saúde da execução.
- Referências de callback/retorno de um pedido real são persistidas antes da primeira consulta ao provedor. O cron retoma até 10 candidatos/minuto sem depender de o aluno voltar à página. Referência não é prova e não libera acesso. Duplicatas preservam o backoff; lease evita trabalho duplicado; máximo de 16 referências por pedido, 60 tentativas ou 30 dias antes da revisão manual. Confirmação conclui a referência correspondente na mesma transação, evitando backlog de compras já aprovadas. Checkout abandonado sem transaction_nsu/slug recebido continua sem prova a consultar.
- Links recorrentes antigos não foram habilitados como integração automática. A consulta `payment_check` não substitui um contrato documentado de eventos de recorrência/estorno/chargeback.

## Monitor e validação

Administrador: `/app/monetizacao`, monitor paginado de contas, origem/validade, revisões manuais e última execução dos jobs. Token do cron fica somente em tabela privada. Não há dados de token no frontend.

Migração aplicada: `20261028102751_automatic_paid_access_lifecycle.sql`. Há 35 verificações isoladas de banco, testes de limites/expiração/API/cron e rechecagem de recibo, além da suíte existente. Produção foi validada sob papel `authenticated`, com mudanças revertidas por `ROLLBACK`: consultoria preservada, vencimento bloqueado, writer SECURITY DEFINER bloqueado, simulação confiável da confirmação libera, resposta negativa bloqueia e rechecagem não estende o período.

Os jobs já registraram execução real com zero recibos a conferir e zero erros. Testes públicos sem autenticação não invocam provedores de IA nem cobram valores.

## Recuperação após indisponibilidade inicial

Migrações `20261028171719_durable_payment_confirmation_queue.sql` e `20261028172029_complete_verified_payment_candidates.sql` aplicadas. Fila privada sem acesso do cliente; apenas serviço pode registrar, reservar ou concluir tentativas. Monitor administrativo mostra contagens e até 25 pedidos, priorizando casos para revisão. Banco real verificou idempotência, lease e recusa de escrita pelo aluno com ROLLBACK; nenhum candidato de teste permaneceu.

Quando INFINITEPAY_API_KEY está configurada, novos links usam o objeto webhook com eventos paid/refunded e single_payment documentados na [documentação oficial](https://ajuda.infinitepay.io/pt-BR/articles/10766888-como-usar-o-checkout-integrado-da-infinitepay). Sem chave, preserva o webhook_url da integração anterior. Eventos recebidos nunca substituem a conferência server-to-server. Não há expiração artificial do link sem um fluxo correspondente de regeneração. O limite de 16 KiB do callback é aplicado durante a leitura do stream.
