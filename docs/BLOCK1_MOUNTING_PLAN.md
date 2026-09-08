# Plano de Montagem — Bloco 1

## Cabeçalho global
Arquivo: `src/components/layout/AppLayout.tsx`

O ícone `Bell` estático será substituído por `NotificationBell`. A navegação, rotas e demais ações do cabeçalho permanecem inalteradas.

## Recap e compartilhamento
Ponto inicial: `Dashboard.tsx` ou `pages/9fit/Progresso.tsx`, conforme o contrato de atividade.

Hierarquia:
`WeeklyRecapPrompt` -> `AchievementShareSheet` -> `useShareEvent`

A montagem só será feita após confirmar:
- tabelas e colunas Supabase;
- políticas RLS;
- identificação do atleta;
- comportamento quando não há atividade.

## Push
`usePushNotifications` ficará desacoplado da UI. O hook será ativado somente quando:
- houver suporte do navegador/dispositivo;
- o usuário conceder permissão;
- o ambiente fornecer as configurações necessárias.

## Fora do primeiro bloco
- não alterar `src/App.tsx`;
- não substituir `Progresso.tsx`;
- não alterar migrations existentes;
- não substituir a Edge Function `smart-notifications`.

## Critérios de validação
- header renderiza sem erro;
- usuário não autenticado não recebe chamadas indevidas;
- ausência de dados exibe estado vazio;
- RLS impede acesso cruzado entre atletas;
- build e lint permanecem limpos.
