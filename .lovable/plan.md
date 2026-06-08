Plano para deixar **operacionais**: Grid (Hub/Perfil), Chat (9ZAP), HealthFlix, SmartPeriodizer, SmartTreino e Progress Tracker. Assume que as integrações/tabelas já estão no banco (smart_treino, smart_periodizer, progress_tracker, etc).

## 0. Princípios

- Não criar dados mock — tudo lê do banco / APIs reais já provisionadas.
- Sem alterar fluxo de login/auth.
- Edge functions atrás de proxy nosso (JWT do aluno em todas; secrets server-side).
- Vídeos sempre externos. RLS `(select auth.uid())`.

## 1. Grid nativo (Hub + Perfil)

Arquivo: `src/components/9fit/ModuleGrid.tsx` e `src/pages/9fit/Profile.tsx`.

- Reorganizar os módulos para apontar para as rotas reais (não páginas placeholder):
  - SmartTreino → `/9fit/train` (já existe)
  - SmartPeriodizer → `**/9fit/planejamento**` (página nativa, não a admin placeholder)
  - Progress Tracker → `/9fit/progresso` (página nativa) — **apagar** `src/pages/Progresso.tsx` antiga e qualquer rota duplicada `/progress`
  - HealthFlix → `/9fit/healthflix`
  - Chat (9ZAP) → `/9fit/mensagens`
  - Ajuste de Treino → `/9fit/ajuste-treino`
- Mesma grid renderizada no **Perfil** (já é o ponto canônico). Cada card mostra status real (badge verde quando há dados, "configurar" quando vazio) lendo do hook `useEcosystemStatus` (novo).
- `useEcosystemStatus` faz 1 query agregada: count em `student_training_assignments`, `periodization_plans_remote`, `progress_metrics`, `zap_threads`, `content_progress`.

## 2. Chat 9ZAP (substitui mensagens internas)

Spec: `9ZAP_FITPRO_INTEGRATION.md`. Source of truth = 9ZAP; FitPro renderiza.

### Backend

- Secrets: `FITPRO_API_TOKEN`, `FITPRO_WEBHOOK_SECRET`, `ZAP_TENANT_SLUG`, `ZAP_BASE_URL` (default `https://project--77259b3e-…/api/public/zap`).
- Edge function `zap-proxy` (verify_jwt=false, valida JWT manualmente). Rotas:
  - `POST /threads/upsert` → 9ZAP `/threads`
  - `GET /threads` → list por aluno/trainer
  - `GET /threads/:id/messages`
  - `POST /threads/:id/messages` (com `client_message_id` idempotente)
  - `POST /threads/:id/read`
  - `POST /threads/:id/typing`
  - `POST /auth/exchange` (para realtime)
- Edge function `zap-webhook` (verify_jwt=false): valida `x-9zap-signature` (HMAC SHA256), dedupe por `x-9zap-event-id` em tabela `zap_webhook_events(event_id pk, payload, processed_at)`. Despacha:
  - `zap.message.created` → realtime broadcast no canal `zap:thread:<id>` + emite `9fit:zap-message` para UI
  - `zap.ai.alert` → insere em `system_events`
  - `zap.offer.proposed` → insere em `recommendations` para o aluno aprovar

### Frontend

- SDK leve `src/sdk/zap-sdk.ts` (sem npm — wrappers fetch chamando `zap-proxy`).
- Hook `useZapThread(threadId)` usando Supabase Realtime no canal `zap:thread:<id>` + fallback polling 10s.
- Refatorar `src/pages/9fit/Mensagens.tsx` para listar threads do aluno (chamadas a `zap-proxy`) e abrir uma thread inline (textarea + lista AI Elements opcional, mas mantendo o estilo dark/neon atual).
- Lado professor: nova aba "Mensagens" em `StudentDetailedView.tsx` que abre a mesma thread `external_key = fitpro:trainer:<id>:student:<id>`.

## 3. HealthFlix oficial (substitui proxy parcial)

Zip recebido confirma endpoints `fitpro-*`. Refatorar `supabase/functions/healthflix-proxy/index.ts`:

- Rotas internas mapeadas 1:1: `health`, `connect`, `sync`, `student-context`, `content`, `content-assign`, `student-progress`, `events`.
- Auto-sync: antes do primeiro `student-context`, chamar `fitpro-sync` com `{users:[{fitpro_user_id, role, email, full_name, professor_fitpro_id}]}`.
- Webhook `healthflix-webhook` confere `HEALTHFLIX_WEBHOOK_SECRET` e grava em `content_progress` + `integration_events_log` (já existem).

UI:

- `src/pages/9fit/HealthFlix.tsx` (aluno): listar via `/content`, clique → `/student-context` retorna `embed_url` → iframe full-screen com `sandbox="allow-scripts allow-forms allow-popups allow-presentation"` e `allow="autoplay; fullscreen"`. Token expira 15min → ao fechar limpar; reabrir gera novo.
- `src/pages/9fit/Train.tsx` card "Streaming" → mesma rota.
- `src/pages/admin/HealthFlixAdminPage.tsx`: aba "Catálogo" lista `/content`, botão "Atribuir" → `/content-assign` (dropdown alunos). Aba "Painel professor" → iframe `student-context({role:'professor'})`.

## 4. SmartPeriodizer (planejamento operacional)

Tabela `periodization_plans_remote` já existe + edge `smartperiodizer-sync`.

- Aluno: `src/pages/9fit/Planejamento.tsx` lê real-time (Supabase channel) de `periodization_plans_remote where athlete_id=me`. Renderiza Ondas 1–7, semana atual destacada, RPE/volume previstos. Empty-state com botão "Solicitar plano".
- Professor: na `StudentDetailedView` aba "Planejamento" → botão "Sincronizar agora" chama `smartperiodizer-sync({athlete_id})` e mostra histórico de sync. Reusa `analyze-periodization` (zip recebido) para gerar análise IA ao clicar em "Analisar".
- Conectar com HealthFlix: ao salvar onda, opção "Atribuir conteúdo HealthFlix" usa `/content-assign`.

## 5. SmartTreino (já no banco)

Hoje `Train.tsx` puxa `student_training_assignments`. Garantir:

- Realtime: subscribe a `student_training_assignments`, `workout_logs`, `exercise_logs`, `strength_records` no `Train.tsx` e `WorkoutExecution.tsx` (sem refresh manual).
- Botão "Solicitar treino IA" chama `training-ai-adjust` com contexto (último RPE, fadiga).
- Ao finalizar treino → grava `workout_logs` + emite `9fit:workout-complete` (já existe) e dispara `progress-sync` (recalcula métricas).

## 6. Progress Tracker

Tabelas `progress_metrics` / `progress_snapshots` (assumidas no banco). 

- `src/pages/9fit/Progresso.tsx`: dashboard com `predictiveEngine` (já existe) — peso, força, volume semanal, sync score, RPE médio. Real-time via Supabase channel.
- Hook `useProgress(athleteId)` que agrega: últimas 12 semanas de `workout_logs` + `assessments` + `nutrition_logs`.
- Lado professor: aba "Progress" em `StudentDetailedView` mesmo componente, com filtros de janela (7/30/90 dias).

## 7. Edge functions adicionais a registrar

Adicionar em `supabase/config.toml`:

```toml
[functions.zap-proxy]
verify_jwt = false
[functions.zap-webhook]
verify_jwt = false
[functions.create-athlete-user]
verify_jwt = false
[functions.api-assessments]
verify_jwt = false
[functions.analyze-periodization]
verify_jwt = false
```

Implantar `create-athlete-user`, `api-assessments`, `analyze-periodization` a partir dos zips fornecidos (revisar para usar `auth.getClaims` e CORS).

## 8. Migração SQL

```sql
-- dedupe webhooks 9ZAP
create table public.zap_webhook_events(
  event_id text primary key,
  event_type text, payload jsonb,
  received_at timestamptz default now(),
  processed_at timestamptz
);
grant select,insert on public.zap_webhook_events to service_role;
alter table public.zap_webhook_events enable row level security;
create policy "service only" on public.zap_webhook_events
  for all to service_role using (true) with check (true);
```

## 9. Ordem de execução e entregar todo plano nesta onda de atualizaçao e funcional. 

1. Migração SQL (`zap_webhook_events`).
2. Secrets (`FITPRO_API_TOKEN`, `FITPRO_WEBHOOK_SECRET`, `ZAP_TENANT_SLUG`, `ZAP_BASE_URL`, confirmar `HEALTHFLIX_API_KEY`/`HEALTHFLIX_WEBHOOK_SECRET`).
3. Edge functions: `zap-proxy`, `zap-webhook`, refator `healthflix-proxy`, deploy `create-athlete-user`, `api-assessments`, `analyze-periodization`.
4. Frontend: `useEcosystemStatus`, refator `ModuleGrid`/`Profile`, `Mensagens` (9ZAP), `HealthFlix`, `Planejamento`, `Progresso`, realtime nos componentes de Train.
5. Apagar `src/pages/Progresso.tsx` (antiga) e rota `/progress` duplicada.
6. QA: criar thread aluno↔prof, enviar mensagem, conferir webhook; abrir HealthFlix embed; sincronizar plano; ver Progresso atualizar real-time após treino.

## 10. Perguntas antes de implementar

1. **Tenant slug** real para 9ZAP (`ZAP_TENANT_SLUG`) e `FITPRO_API_TOKEN`/`FITPRO_WEBHOOK_SECRET` — posso pedir via `add_secret` agora? nao, deixe o ambiente preparado para implementar e habilitar no painel do professor. 
2. Os zips `create-athlete-user`, `api-assessments`, `analyze-periodization` substituem versões existentes ou são novas funções? (Se substituem, mantenho o nome e sobrescrevo o `index.ts`.)  elas atualizam , refina, organzia, torna real e funcional, sem criar nada novo. 
3. Confirma deletar `src/pages/Progresso.tsx` (antiga) e migrar tudo para `src/pages/9fit/Progresso.tsx`? se for a tela nova que acesso atraves do perfil sim, quero manter essa.   

4. implemente tambem seguindo a ordem . 
  Plano de execução consolidado. Mantém Lovable Cloud (mfrydtrzjxscbkaiwfnw) e a arquitetura existente (`/api/v1`, RLS `(select auth.uid())`, JWT manual, vídeos sempre externos). Nenhuma alteração de login/auth.
  ## Bloco A — Correção crítica do Hub (Perfil + Onboarding)
  1. **Botão "Completar perfil" leva à tela branca**
    - Causa: rota apontando para `/9fit/onboarding` sem proteção/parâmetros corretos.
    - Corrigir em `OSDashboard.tsx` / `ActivationMissionCard.tsx`: navegar para `/9fit/onboarding?step=profile&return=/9fit/hub` e garantir que `Onboarding.tsx` aceita `step` e renderiza a etapa de Perfil completo + foto.
    - Após salvar: marcar `onboarding_progress.profile_completed=true`, emitir `9fit:mission-complete` e voltar para `/9fit/hub`.
  2. **Daily Sync recalibra a calibração**
    - Após `EmojiCalibrationQuiz`/`QuickMoodInput` salvar, chamar `calibrationEngine.recalibrate(athleteId)` e atualizar Hub via evento `9fit:sync-updated`. `HeroSyncSection`/`SyncScoreRing` escutam e reanimam (sai de "CALIBRANDO" para score real).
  3. **Grid nativo do Perfil = rota canônica**
    - Em `Profile.tsx` o grid "Planejamento / Ajuste de Treino / Progresso / Biblioteca / HealthFlix / Avaliação / Postura Pro / Store" passa a usar rotas reais do app nativo.
    - **Excluir** `src/pages/Progresso.tsx` antigo e qualquer rota duplicada `/progress`; o card "Progresso" do Perfil aponta para `/9fit/progresso` (página nativa já existente em `src/pages/9fit/Progresso.tsx`).
    - Mesma normalização para Planejamento (`/9fit/planejamento`) e Ajuste (`/9fit/ajuste-treino`).
  ## Bloco B — Embeds dos ecossistemas (9PRIME, 9KITCHEN, 9RECOVERY)
  Componente reutilizável `src/components/9fit/EcoEmbed.tsx` (iframe full-screen com header "Fechar", `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"`, `allow="autoplay; fullscreen"`).
  - **9PRIME Bio**: `src/pages/9fit/EliteBioHacking.tsx` recebe botão "Abrir LongeVita" → iframe `https://longevita.lovable.app` (URL configurável via secret/admin).
  - **9KITCHEN**: nova `src/pages/9fit/Kitchen.tsx` → iframe `https://9foods.lovable.app`. Card no grid Perfil + rota `/9fit/kitchen`.
  - **9RECOVERY**: nova `src/pages/9fit/Recovery.tsx` → iframe do parceiro de recovery (URL via admin). Card "Recovery" no grid.
  - Dica em **Foods/Dieta**: adicionar bloco "Dica do dia" usando `recommendationEngine` + dados de `nutrition_logs` na `Dieta.tsx`.
  ## Bloco C — HealthFlix oficial (SDK v1)
  Substituir o proxy atual pela integração documentada:
  1. Criar `src/sdk/healthflix-sdk.ts` (cópia literal do SDK fornecido).
  2. Refatorar `supabase/functions/healthflix-proxy/index.ts` para usar o SDK e expor as ações: `health`, `connect`, `sync`, `studentContext`, `content`, `assign`, `progress`, `events`. Mantém validação JWT (`auth.getClaims`).
  3. Atualizar `HealthFlix.tsx` (aluno) e `Train.tsx` streaming: chamar `studentContext` e abrir `embed_url` em iframe full-screen.
  4. `HealthFlixAdminPage.tsx`: aba "Catálogo" lista via `listContent()`, botão "Atribuir" usa `assignContent`. Painel professor abre via `studentContext({role:'professor'})`.
  5. Webhook `healthflix-webhook` permanece; alinhar payload com novos `event_type` do SDK.
  6. Garantir secret `HEALTHFLIX_API_KEY` (já existe) — adicionar `HEALTHFLIX_WEBHOOK_SECRET` se ausente.
  ## Bloco D — Postura Pro
  - Edge function `postura-pro-scan` já existe; estender para 2 modos:
    - **Professor**: acesso total (CRUD avaliações, ver fila de análises pendentes) em `PosturaProPage.tsx` (admin).
    - **Aluno**: nova `src/pages/9fit/PosturaPro.tsx` → exibe relatórios/alongamentos/análise (read-only) baseado em `postura_pro_reports` (criar tabela se faltar). Card no grid Perfil.
  - RLS: aluno vê apenas `athlete_id = (select auth.uid via athletes)`; staff vê tudo via `has_role`.
  ## Bloco E — APIs Externas (Store / 9Pay / 9Zap)
  ### E1. 9Store (`9store-api`)
  - Criar `src/sdk/ninestore-sdk.ts` (literal do fornecido) + edge function proxy `ninestore-proxy` (JWT do aluno; usa secret `NINESTORE_API_KEY`).
  - Nova página `src/pages/9fit/Store.tsx` (catálogo, carrinho, checkout) + card no Perfil/Market.
  - Admin: tab "9Store" em Monetização para listar pedidos.
  ### E2. 9Pay / NineFitConnect
  - Migration: `ninefitconnect_connections`, `ninefitconnect_payments`, `ninefitconnect_events` + função `hash_api_key` (pgcrypto). GRANTs `service_role` ALL, `authenticated` SELECT, RLS `has_role('admin')`.
  - Edge functions: `ninefitconnect-api` (público, `verify_jwt=false`, valida `x-api-key`) e `ninefitconnect-admin` (JWT admin para gerar/rotacionar/revogar chaves).
  - Admin: novo módulo `IntegrationsModule.tsx` em `AdminLayout` (item `integrations`) com card "NineFitConnect Payments ↔ FitPro": endpoint, status, last_sync, gerar/rotacionar/revogar key (modal one-time), tabela de eventos.
  - **Aluno**: página `src/pages/9fit/Pagamentos.tsx` com planos e checkout via `payments/create-intent` (init_point do MP). Card "Plano" no Perfil.
  - Limpar: remover `src/pages/PaymentSimulation.tsx`, edge `simulate-payment`, botões "simular" em `TransactionsModule`/`SubscriptionsModule`. Manter seletor sandbox/produção (secrets MP).
  - Acréscimo em `payment-webhook/index.ts`: ao confirmar pagamento, se houver `ninefitconnect_payments.checkout_session_id`, atualizar status e emitir `payment_succeeded|failed|refunded` em `ninefitconnect_events` + `system_events`.
  ### E3. 9Zap
  - Edge function `zap-api-proxy`: assina HMAC duplo conforme spec:
    ```
    inner = HMAC_SHA256(SERVICE_ROLE_KEY, "zap-api:hmac-v1")
    sig   = HMAC_SHA256(inner, `${ts}.${body}`)
    ```
  - Cabeçalhos `x-zap-ts`, `x-zap-sig`. Usada por `coach-notification-system` (substitui webhook WhatsApp atual).
  ## Bloco F — IA + Loops (Bloco 3 original)
  1. `AITrainingPage` **e** `AIAnalysisPage`: botão "Enviar ao aluno" → seleciona athlete, cria `student_training_assignments` (treino) ou `student_notes` (análise) + notificação via 9Zap.
  2. **AI Coach**: confirmar que `daily-sync` chama `ai-coach` em modo `analyze` após recalibração, salvando recomendação em `recommendations`.
  3. **Streaks/Squads**: ativar `recommendationEngine` para alimentar `RecommendationCard` no Hub.
  ## Bloco G — Painel (Bloco 4 original)
  1. **Skills**: em `SkillManagerPage`, botão "Instalar todas (19)" → loop em `skillRuntime.installAll()` com progresso.
  2. **Monetização**: `MonetizacaoPage` mostra KPIs detalhados — MRR, ARR, Churn 30d, ARPU, LTV — derivados de `ninefitconnect_payments` + `subscriptions`.
  3. **Settings → Integrações & APIs**: nova aba lista todos os connectors (`HealthFlix`, `NineFitConnect`, `9Store`, `9Zap`, `Postura Pro`, `SmartPeriodizer`, `Library Full`) com status + botão "+ Adicionar nova API" (genérico via `api_connectors` table).
  ## Bloco H — Realtime
  - Habilitar `supabase.channel()` em `WorkoutExecution`, `Train`, `Hub` para `workout_logs`, `exercise_logs`, `strength_records`, `workout_assignments_new`. Atualização instantânea sem refresh.
  ## Detalhes técnicos / Migrations necessárias
  ```sql
  -- ninefitconnect (3 tables + função hash_api_key)
  -- postura_pro_reports (athlete_id, report_html, exercises jsonb, created_by)
  -- api_connectors (key, label, endpoint, api_key_hash, status, owner_role)
  -- onboarding_progress: garantir coluna profile_completed boolean default false
  ```
  Secrets a adicionar (via `secrets--add_secret`):
  - `NINESTORE_API_KEY`
  - `NINEFITCONNECT_API_KEY` (chave de saída quando FitPro for cliente do gateway 9Pay) — opcional
  - `HEALTHFLIX_WEBHOOK_SECRET` se ainda não existir
  - URLs de embed (`PRIME_EMBED_URL`, `KITCHEN_EMBED_URL`, `RECOVERY_EMBED_URL`) — ou armazenar em `api_connectors`.
  ## Ordem de execução apos finalizar todo plano e me entregar nesta onda. 
  1. Bloco A (desbloqueia UX imediata) → 2. Bloco C (HealthFlix funcional) → 3. Bloco B (embeds) → 4. Bloco D (Postura Pro aluno) → 5. Bloco E (Store, 9Pay, 9Zap + migration) → 6. Bloco F+G → 7. Bloco H realtime → 8. QA.
  ## Perguntas para confirmar antes de implementar
  1. **URLs reais** de embed para 9PRIME Bio (LongeVita), 9KITCHEN (9Foods) e 9RECOVERY parceiro? Posso usar placeholders `https://longevita.lovable.app` e `https://9foods.lovable.app` e deixar configurável no admin? sim!! 
  2. Confirma que posso **deletar** `PaymentSimulation.tsx` + `simulate-payment` e botões fake? sim!! 
  3. Posso criar agora os secrets `NINESTORE_API_KEY`, `HEALTHFLIX_WEBHOOK_SECRET` (e `PRIME/KITCHEN/RECOVERY_EMBED_URL` se preferir secret a tabela)?sim e me entrega funcional pincipalmente da heathflix. 
  4. CORS do `ninefitconnect-api`: `*` por enquanto, ok? ok