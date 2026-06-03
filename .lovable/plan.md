# Plano de Execução — Ondas 2–7 + Ajustes Funcionais

Trabalho dividido em **2 blocos**: primeiro fecho as Ondas restantes do roadmap (2 a 7), depois executo os **7 ajustes** específicos pedidos.

---

## BLOCO A — Ondas 2 a 7 (finalização do roadmap)

### Onda 2 — Train & Engrenagem (pendências)

- `Train.tsx`: hero "PROTOCOLO SMART TRAINING" com anel de progresso real (workout do dia via `useWorkoutOfTheDay`), card "INTERVENÇÕES" puxando do `recommendationEngine`, mini-chart "MÉTRICAS" usando últimas 7 execuções.
- `DailyProtocol.tsx`: garantir que cada linha vira CTA para a skill correspondente.

### Onda 3 — Hub OS+ refinement

- `EcosystemGrid.tsx`: indicador online/% por módulo (Staff: 4 online; Ron: 88%; etc.) usando dados reais quando existirem, fallback estático.
- Header "All modules • N active" calculado em runtime.

### Onda 4 — Progresso analytics real

- `Progresso.tsx`: trocar dados estáticos por queries a `physical_assessments` (bodyfat), `workout_exercise_sets` (força), `engrenagem_xp_logs` (histórico). Insights via `recommendationEngine.generateInsights()`.

### Onda 5 — Skills professor (fechamento)

- `SkillManagerPage`: aba **Biblioteca** com botão "Instalar todas (19)" e busca; aba **Aluno** ligando skill→athlete via `student_skill_activations`.
- `StudentDetailedView`: nova aba "Skills" com toggles.

### Onda 6 — Monetização

- `MonetizacaoPage.tsx`: KPIs (MRR/Churn/Prime conv.) a partir de `transactions` + `subscriptions`. Tabela de últimas 20 transações. CTA "Criar oferta dinâmica" → `dynamic_offers`.

### Onda 7 — Staff check-in flow

- `QuickCheckIn` → após registro, sheet "Staff online agora" → CTA "Falar agora" → `/9fit/staff?from=checkin`.

---

## BLOCO B — Ajustes funcionais (7 itens)

### 1. APIs Conectoras (HealthFlix etc.) validando de verdade

- `ApiConnectorCard.tsx`: ao salvar endpoint+key, fazer **probe real** (`GET <endpoint>/health` ou `/ping`) via edge function `api-connector-proxy` e gravar `status: "connected"` + `last_sync_at`.
- `HealthFlixAdminPage`: exibir badge **CONECTADO** (verde) + contagem de itens sincronizados puxando da tabela do módulo.
- Job de sync (botão "Sincronizar agora") chama `intelligence-hub-sync` com `module: "healthflix"`.

### 2. Fluxo de Ativação do Perfil funcional

- `Ativacao.tsx`: integrar **5 telas reais** do onboarding em sequência dentro do stepper (Conexão wearable, Perfil base, Anamnese curta, Protocolo, Prime).
- Cada step persiste em `user_preferences` + `athletes` e só avança com dados válidos.
- Step "Conexão" usa `WearableConnectBox`; "Perfil" reusa `OnboardingStepper` campos chave.

### 3. Streaming HealthFlix no app

- **Aluno** (`HealthFlix.tsx`): renderizar grid completo de vídeos vindos da API (tabela `healthflix_videos` sincronizada). Player embed.
- **Professor** (`HealthFlixAdminPage`): tela com toda a biblioteca da API + filtros + reatribuir/destacar.

### 4. Quiz de 5 perguntas emoji → calibra sistema

- Novo componente `EmojiCalibrationQuiz.tsx`: 5 perguntas sequenciais (Sono / Energia / Humor / Dor / Motivação), cada uma com 5 emojis. Avança ao tocar. Persiste em `bio_recovery_state` + atualiza `sync_score`.
- Substitui a faixa "como você acordou" promessa-only no OS por este quiz interativo (1 vez/dia).

### 5. Radar 5D dinâmico

- `WeeklyRadar.tsx`: ler em tempo real de `engrenagem_xp_logs`, `workout_executions`, `daily_sync_logs`, `student_skill_activations`. Recompor 5 eixos (Força, Recovery, Consistência, Nutrição, Mente) a cada montagem + subscription `useRealtimeTable`.

### 6. Perfil → "Abrir sistema nativo" (embed Fitness Place)

- Nova rota `/9fit/native-system` que monta `<iframe src="https://fitnessplace.lovable.app" />` em fullscreen com header de retorno.
- Card no `Profile.tsx` aponta para essa rota.

### 7. Train → "Treino Rápido" (quiz 3 perguntas + entrega)

- Novo `QuickTrainModal`: 3 perguntas (Objetivo / Tempo disponível / Equipamento).
- Resolver: se houver match em `exercises` (biblioteca) → monta treino nativo com vídeos; senão → busca em `infoproducts` e abre `/9fit/checkout/:id`.
- Após pagamento confirmado → libera infoproduto (`user_unlocks`).

### 8. Edge Function `staff-api`

- Criar `supabase/functions/staff-api/index.ts` com o código exato fornecido pelo usuário.
- Adicionar `[functions.staff-api] verify_jwt = false` em `supabase/config.toml`.
- No painel Professor `/app/staff`: fluxo de seleção de profissionais que consome `staff-api/professionals` e `staff-api/match`. Card libera no front-end do cliente via `staff-api/booking`.  
  
9.  AJUSTES DE FUNCIONALIDADES DA NAVBAR DO PROFESSOR   
- TREINO COM IA -> ESCOLHER ALUNO -> ONBOARDING DE PREFERENCIAS -> ENTREGAR TREINO COMPLETO PARA O ALUNO COM O VIDEO NO PERFIL DO FITPRO /   
-  ASSISTENTE DE IA -> EXECUTAR AÇOES DIRETA, EX: AJUSTAR PERIODIZAÇAO NO SMART TREINO / CRIAR TREINO NOVO PARA ALUNO X NO SMART TREINO  / COMANDOS DE AÇOES OPERACIONAIS DENTRO DO PAINEL   
ANALISE COM IA -> APOS ANALISE -> OPÇAO PARA ENVIAR PRO ALUNO NO FITPRO -> APRESENTAR COM MENSAGEM NOVA NA OS   
  
10-  SKILLS E AGENTES   
- PERMTIIR UPLOAD DE ARQUIVOS QUE CORRESPONDEM A ESSA FUNÇAO PARA EXTRAIR OS DADOS E CRIAR NOVAS SKILLS,AGENTES DENTRO DO SISTEMA 

---

## Ordem de Execução

1. Bloco A — Ondas 2 → 7 (commits incrementais).
2. Bloco B — Itens 1 → 8 (na ordem listada; itens 1 e 3 são interdependentes).
3. QA visual final (screenshots 390x844 mobile + 1280 desktop).

## Critérios de Aceite

- Nenhum dado mockado nas telas finais; tudo lê de Supabase.
- Quiz emoji altera `sync_score` visível no OS.
- Radar 5D muda após completar 1 protocolo de teste.
- HealthFlix mostra itens reais após sync.
- `staff-api` responde 200 em `/methods`, `/hubs`, `/professionals`.

## Tabelas necessárias (migrations)

- `daily_sync_logs` (user_id, sleep, energy, mood, pain, motivation, score, created_at) — se ausente.
- `infoproducts` + `user_unlocks` — se ausentes.
- `healthflix_videos` — se ausente.
- Todas com RLS + GRANTs adequados.

Confirmar para iniciar a execução.