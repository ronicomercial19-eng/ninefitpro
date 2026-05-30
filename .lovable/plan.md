# Wave 20 — Engrenagem FitPro + Port v2 Prototype

O zip v2 (`files-cf39a26f.zip`) é uma evolução substancial do protótipo: agora inclui **OSView** (Engrenagem), **PrimePassHub** com sub-apps (ELITE/Bio/Kitchen/Recovery), **NineFitElite + Pillars**, **NineBeats**, **SmartPeriodizer embedded**, **DailyProtocol**, **CommunitySnippet**, **agentService (Squad Insights)** e nova bottom-nav com **Prime destacado**. Combinado aos docs `05/06/07/10`, define a Engrenagem do FitPro.

Vou portar para o app real, conectando ao schema existente (`athletes`, `daily_tasks`, `bio_*`, `ai_context_snapshots`, `ron_memory`, `subscription_plans`), sem novas tabelas e sem Sovereign Core.

## 1. Engrenagem (motor que roda ao abrir o app)
Novo `src/services/engrenagem/`:
- `contextLoader.ts` — ao montar o app: carrega `athletes` (xp/level/sync/streak), últimos `bio_hrv_logs`/`bio_sleep_logs`, `daily_tasks` ativas, último `ai_context_snapshots`. Resultado em store Zustand `useEngrenagem`.
- `gamificationEngine.ts` — `awardXP(action, base, multipliers)` com streak/sync/dificuldade, grava `gamification_events` e atualiza `athletes.total_xp/level`. Emite `9fit:xp_awarded` e `9fit:level_up`.
- `dataAggregator.ts` — consolida métricas dos módulos para o Hub/OS.
- `recommendationEngine.ts` (squad insights) — port de `agentService.getSquadInsights` mapeado às tabelas reais; gera 3-5 insights priorizados (recuperação, treino, nutrição, mindset, premium). Persiste em `ai_insights`.
- `orchestrationEngine.ts` — decide próximo CTA contextual (após avaliação → sugere PRIME; após treino → sugere protocolo recuperação) e dispara abertura do RON quando relevante.
- Hook `useEngrenagem()` expõe tudo.

## 2. Bottom Navigation — 5 tabs canônicas (atualizar)
Alterar `BottomNavigation.tsx` para: **Início (OS) · Train · Prime (destacado central elevado) · Hub · Perfil**. Mover Social para sub-rota do Hub. Atualizar memória `9fit-os-student-bottom-nav` (nova v5).

## 3. Novos componentes/páginas (port v2)
- `src/pages/9fit/OS.tsx` (refatorar) + componente `OSDashboard.tsx` — water tracker (`profile.waterIntake`), daily tasks de `daily_tasks` com toggle, painel **Squad Insights** com 3 cards, botão "Diagnóstico Rápido" (modal sentimento → grava `ron_memory` + XP).
- `src/components/9fit/AgentHub.tsx` — drawer lateral mostrando agentes/squads ativos (EPSILON, BETA, ZETA...) com status.
- `src/pages/9fit/Prime.tsx` (nova) + `PrimePassHub.tsx` — 4 sub-apps (9FIT ELITE, Bio, Kitchen, Recovery) com sync/recommendation/apply-protocol. Embedded ELITE View + Pillar Detail.
- `src/components/9fit/elite/NineFitEliteView.tsx` + `ElitePillarDetail.tsx` — pilares de performance.
- `src/components/9fit/SmartPeriodizerEmbedded.tsx` — abre dentro do Train.
- `src/components/9fit/NineBeats.tsx` — player de áudio/playlists (Deep Link).
- `src/components/9fit/DailyCheckInPanel.tsx` — mood/energy/sleep gravando `bio_sleep_logs` + `sync_score_logs`.
- `src/components/9fit/DailyProtocolV2.tsx` — versão refinada substitui `DailyProtocol.tsx`.
- `src/components/9fit/MissionCompleteOverlay.tsx` — overlay global (XP/level-up) escutando `9fit:xp_awarded` e `9fit:level_up`, montado no `App.tsx`.
- `src/components/9fit/MissionListPanel.tsx` — DAILY/WEEKLY/SEASON de `daily_tasks`.
- `src/components/9fit/SeasonPassTrack.tsx` + página `/9fit/season-pass`.
- `src/components/9fit/DigitalIDCard.tsx` — substitui `PersonalIDCard` com QR holográfico, classe, badges.
- `src/components/9fit/CommunitySnippet.tsx` — preview no Hub.
- `src/components/9fit/RecommendationCard.tsx` — card padrão consumido pelo recommendationEngine (Hub + OS).
- `src/components/9fit/QuickActionMenu.tsx` — FAB com ações rápidas (check-in, water+, foto, abrir RON).

## 4. Hub redesenhado (descoberta de módulos)
`src/pages/9fit/Hub.tsx`:
- Seção **Em Destaque / Recomendados** (recommendationEngine).
- **Meus Módulos** (usados nos últimos 7d via `system_events`).
- **Explorar** por categoria (Performance / Recuperação / Nutrição / Mentalidade).
- **Novidades** (cards estáticos).
- Cada card: status (Ativo/Disponível/Bloqueado), CTA, abre Embedded ou Deep Link+SSO.

## 5. Páginas refinadas
- **Train** — `ClassPlayer` cards, filtros Low/Medium/High, SmartPeriodizer embedded.
- **Profile** — `DigitalIDCard` + achievements (`user_achievements`).
- **Stats** — gráficos `bio_*` + `workout_executions` semanal.
- **Social** vira sub-rota `/9fit/hub/social`.

## 6. Eventos globais
Padrão `window.dispatchEvent`:
- `9fit:xp_awarded` `{action, xp, multiplier}`
- `9fit:level_up` `{newLevel}`
- `9fit:mission_completed` `{taskId, xp}`
- `9fit:protocol_completed`
- `9fit:module_launched` `{moduleId}`
Montar `MissionCompleteOverlay` + listener de orchestration no `App.tsx`.

## 7. Tokens visuais
`tailwind.config.ts` + `src/index.css`: garantir HSL semânticos para `neon-400` (verde), `prime-gold`, surfaces `dark-800/700` mapeadas em `--primary`/`--accent`/`--card`/`--muted`. Zero cores hardcoded em componentes.

## 8. Rotas (`App.tsx`)
Adicionar: `/9fit/prime`, `/9fit/prime/elite`, `/9fit/season-pass`, `/9fit/nine-beats`. `Social` movido sob Hub.

## 9. Memórias a atualizar
- `mem://navigation/9fit-os-student-bottom-nav-v5` — nova ordem com Prime destacado.
- `mem://architecture/fitpro-engrenagem` (nova) — descreve os 6 engines + eventos globais.
- `mem://features/primepass-hub` (nova) — 4 sub-apps + sync/apply protocol.

## Não-objetivos
- Nenhuma migration nova (usa schema existente).
- Sem Sovereign Core / NEXO / Firebase (o protótipo usa Firebase; aqui adaptamos para Supabase).
- Sem alterar auth/onboarding.

## Ordem de execução
1. Tokens + BottomNavigation v5 (Prime destacado).
2. Engrenagem services (context/gamification/recommendation/orchestration) + hook.
3. Eventos globais + MissionCompleteOverlay no App.
4. OS refatorado (OSDashboard + AgentHub + QuickActionMenu).
5. Prime (PrimePassHub + ELITE + Pillars + página).
6. Hub redesenhado (4 seções + RecommendationCard).
7. Componentes auxiliares (DailyProtocolV2, DailyCheckInPanel, MissionListPanel, DigitalIDCard, SeasonPassTrack, CommunitySnippet, NineBeats, SmartPeriodizerEmbedded).
8. Refino Train/Profile/Stats + rotas.
9. Atualizar memórias.

Aprovar para sair do plan mode e implementar?