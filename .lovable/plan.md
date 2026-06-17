# 9FIT — Plano de execução

## Status

- ✅ Blocos 0, 1, 2, 3, 4, 6, 7, 9, 10 — concluídos
- ⏳ Bloco 8 (MVP prof/aluno) — próxima rodada
- ❌ Bloco 5 (paywall) — descartado

## Esta rodada

**Migração** (`20260617132612`):
- `daily_workouts`: +`athlete_id`, `workout_date`, `override_locked`, `changes_json`, `updated_at` + índice `(athlete_id, workout_date)`.
- `athletes.preferences` jsonb.
- RPC `aplicar_ajuste_treino_dia(athlete, data, changes)` SECURITY DEFINER — única porta de ajuste do dia.
- Tabela `social_share_templates` + seed 5 templates (workout_done, new_pr, streak, level_up, check_in).
- Seed `monetization_offers` "audience_49" (R$49/mês, public=true).

**Frontend:**
- `QuickTrainModal`: "Iniciar agora" insere `workout_progress` (source=quick_workout) + `fn_award_xp(50)`.
- `AjusteTreino`: `onSave` chama `aplicar_ajuste_treino_dia` (não toca `planos_de_treino_gerados`).
- `WeeklyTrainingView` novo: grid D1-D7 com fase atual, vídeos via `library_items` + fallback `exercises.video_url`, execução só no dia atual, preferências salvas em `athletes.preferences`, realtime em `planos_de_treino_gerados`.
- `Train.tsx`: nova sub-tab "Semana".
- `Onboarding`: tela final com CTA "Ver oferta R$49" + botão secundário "Continuar para o Hub".
- `ShareButton`: consulta `social_share_templates` por `content_type`, anexa slug ao `p_source` do `fn_award_xp`.
- `index.css`: tokens semânticos `--neon-orange/green/cyan`, `--surface-1/2/3`, `--text-primary/muted`, `--font-display/body` + utilitários `.text-neon-*`, `.bg-surface-*`, `.font-display-italic`.

## Próximo (Bloco 8)

MVP prof↔aluno: tela professor com lista de alunos (vw_athlete_status), envio de treino HTML/link, atribuição de periodização, mensagens diretas via `notifications`.
