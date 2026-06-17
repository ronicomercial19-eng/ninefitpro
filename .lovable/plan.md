# 9FIT — Plano de execução

## Status

- ✅ Blocos 0, 1, 2, 3, 4, 6, 7, 8, 9, 10 — concluídos
- ❌ Bloco 5 (paywall) — descartado

## Bloco 8 — PDI (Perfil Dinâmico Individual)

**Migração `20260617151627`:**
- `user_parameters` (1:1 com user_id) + enums (recovery_rate, peak_window, goal, discomfort) + RLS `auth.uid()=user_id` + trigger updated_at.
- `fn_compute_user_thresholds(user_id)` retorna `{low, mid, high, mode, n}` via percentis 33/66 dos últimos 30 dias de `sync_score_logs` — **sem valores fixos**.
- Trigger `tg_refresh_consistency_30d` em `ninefit_checkins` mantém `consistency_30d` automaticamente.

**Edge helper:** `supabase/functions/_shared/pdi.ts` com `loadUserParameters`, `loadThresholds`, `classifyScore`, `adjustForPDI`. Todas as edge functions devem chamar `classifyScore(userId, score)` ao invés de `if (score < 50)`.

**Frontend:**
- `useUserParameters` hook + `PDIWizard` (11 perguntas) acessível em Perfil → "Calibrar IA".

## Outras correções desta rodada

- **Treino com IA (admin):** `AITrainingPage` agora chama `fitpro-deliver-workout` (rota oficial do SmartTreino) em vez de `ai-coach`. Erro real é logado/exibido.
- **QuickTrainModal:** oferta de infoproduto exibida **antes** do treino; "Agora não" libera o treino do dia.
- **SyncScoreRing:** conic-gradient neon proporcional ao sync; cor escala laranja→amarelo→verde; estado calibrando pulsa laranja.
- **WeeklyRadar (5D):** `drop-shadow` neon com intensidade proporcional à média dos 5 eixos.
- **CompleteProfileFlow:** wizard 5 etapas (dados+foto / plano / 1º treino / consultoria (3d) / recompensa 7d → PrimePass+ID Gold).
- **Hub Grid:** rotas já corretas (Staff/Planejamento/Ajuste/Progresso == rotas do Perfil).

## Próximo (não nesta rodada)

- Motor de viralização (`fitpro_viralizacao_prompt.html`) — mecanismos 1/2/3.
- Refatorar `ai-coach`, `training-ai-adjust`, `smart-notifications` para chamar `classifyScore()` do `_shared/pdi.ts`.
