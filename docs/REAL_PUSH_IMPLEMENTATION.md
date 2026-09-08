# Push Real — Próxima Implementação

## Estado atual
- O frontend registra `push_subscriptions`.
- `smart-notifications` cria registros em `notifications`.
- Não há função de envio Web Push no repositório.

## Implementação necessária
Criar uma Edge Function `send-push` que:
1. receba o evento de nova notificação;
2. busque inscrições em `push_subscriptions`;
3. use VAPID privado somente via Supabase Secrets;
4. envie payload compatível com `sw.js`;
5. remova inscrições expiradas;
6. valide autorização e origem do evento.

## Pré-requisitos
- definir `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` e `VAPID_SUBJECT` nos secrets do Supabase;
- confirmar formato do payload no service worker;
- escolher disparo por webhook/database trigger ou chamada interna;
- validar rate limit e retry.

## Não fazer
- não colocar a chave privada no frontend;
- não colocar a chave privada no Git;
- não disparar push diretamente do navegador;
- não adicionar dependência de envio sem validar compatibilidade Deno/Edge Runtime.
