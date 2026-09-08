# Validação — Central de Notificações

## Dependências de dados

`NotificationBell.tsx`:
- tabela `notifications`;
- escuta realtime via evento `postgres_changes`;
- exige filtro por usuário/atleta.

`usePushNotifications.ts`:
- tabela `push_subscriptions`;
- registra e remove inscrição de push;
- depende de permissão do navegador/dispositivo.

## Pontos de risco

- Confirmar colunas e nomes de usuário na tabela `notifications`.
- Confirmar RLS de leitura e atualização da própria notificação.
- Confirmar publicação realtime da tabela `notifications`.
- Confirmar RLS de inserção/remoção em `push_subscriptions`.
- Não ativar push sem suporte a `Notification`, `serviceWorker` e `PushManager`.
- Não expor chaves VAPID ou segredos no frontend.

## Estratégia de integração

1. Montar `NotificationBell` no header usando dados reais.
2. Validar realtime e RLS.
3. Integrar `usePushNotifications` como recurso opcional.
4. Ativar PWA/service worker somente após teste em navegador e mobile.
