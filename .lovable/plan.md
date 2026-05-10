# Roadmap 9FIT Sovereign — Execução em Fases

O escopo enviado é gigante (8 grandes blocos × dezenas de subtarefas). Para entregar **sem quebrar usuários ativos**, proponho fatiar em 5 fases curtas. Cada fase é entregável e testável de forma independente. Confirme a ordem e eu executo fase a fase.

## Fase 1 — Fechar pendências críticas (PRIORIDADE)

**Objetivo:** zerar a lista atual antes de qualquer expansão.

1. **Biblioteca completa via API (661 itens)**
  - `ExercisesPage.tsx`: hoje só renderiza `exercises`. Trocar para ler `library_items` (todas as tabs: Exercise, Infoproduct, Ebook, System, Audio, Video).
  - Botão "Atribuir" em todos os cards → reusar `LibraryAssignDialog` (já existe).
  - Trigger `sync-library-full` com feedback de progresso e contagem por tipo.
2. **Tabs por dia (Seg–Dom) em WorkoutOverview/Execution** — usar `training_day`.
3. **Bloco "Protocol"** acima de "Training" no `CreateWorkoutForm` (objetivo/método/observações estruturadas em JSONB).
4. **Periodização** — verificar `PeriodizationAssignDialog` salvando em `periodization_html` / `periodization_file_url`.
5. **Avaliações** — verificar `StudentAssessmentsUpload` gravando em `user_assessments`.
6. **HomeFeed dinâmico** no Hub — cards reativos a streak/XP/última atividade.
7. **Sovereign Override Panel** — finalizar UI para coach editar `override_locked`.

## Fase 2 — Navegação + OS Dashboard

- Bottom nav já tem 4 abas (OS/TRAIN/HUB/STAFF). Validar rotas.
- **OS:** ID Card holográfico flip, Tarefas Diárias com check-in obrigatório, RON sugestões diárias, XP/Streak/Nível, Hub de Lacunas (atalhos Biblioteca/Planejamento/Dieta/Staff/9Pay/Suporte).

## Fase 3 — TRAIN + HUB

- **TRAIN:** Treino do Dia (séries/cargas/reps), visão Macro/Meso/Micro, Player híbrido (Biblioteca + Healthflix iframe), suporte HTML externo, histórico, RON Notes.
- **HUB:** FitCommunity Feed, Ranking Global (KCAL+XP), RON Profile/Chat, PrimePass/Elite, 9Store iframe, links 9Foods/Flow.

## Fase 4 — STAFF (Matching + Agendamento)

- Fluxo Macro Category → Method → Professional (9HEALTH/9PERFORMANCE/9LIFESTYLE).
- Modo 9EXPRESS com prioridade por proximidade (Google Maps API — exige chave).
- Agendamento: Calendário → Solicitação → Confirmação → Consumo de crédito.
- Dual Mode (cliente/profissional) + notificações em tempo real (Supabase Realtime).

## Fase 5 — 9FIT ELITE + Inteligência

- Tela futurista Bio-Hacking (4 pilares: Genetics/Performance/Longevity/Bio-Hacking) com microestados Diagnostic→Main→Upgrading→Success.
- Tabela Free vs Elite, glow/neon/gold, holographic.
- Agentes Epsilon/Zeta silenciosos no backend (edge functions noop por enquanto, integradas a `intelligence-hub-sync`).
- Banco Supra já configurado via `SUPRA_HUB_URL`.

## Aspectos técnicos

- **Sem migrations destrutivas.** Apenas adições (`ALTER TABLE ADD COLUMN IF NOT EXISTS`, novas tabelas).
- **Design tokens:** manter Syne/DM Mono, neon orange/cyan, glass-card, glow-context.
- **Sem mocks:** todos os dados via Supabase em tempo real (regra canônica).
- **Compatibilidade:** nenhum usuário ativo perde acesso — flags de feature em vez de remover telas antigas.

## Dependências externas a confirmar

- **Google Maps API key** (Fase 4) — precisa secret `GOOGLE_MAPS_API_KEY`.
- **Healthflix/9Store URLs** já mapeados via `EcosystemFrame` SSO.
- **RON AI** — usa `LOVABLE_API_KEY` + `ai-coach` edge function (já existe).

## Execuçao  
executar todas as fases complementamente no app sem quebrar o codigo atual. 