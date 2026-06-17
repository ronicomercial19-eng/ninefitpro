# FitPro — Plano de Execução

Ordem solicitada: **PROMPT 4 → 2 → 1 → 3**, seguido de motor de viralização, PrimePass real, refator PDI nas edge functions, fixes pendentes e design global.

---

## SQLs prévios (1 migration única)
Pré-requisitos do `fitpro_finalizacao.md`:
- `ALTER PUBLICATION supabase_realtime` para `workout_executions`, `planos_de_treino_gerados`, `ninefit_checkins`, `nutrition_logs` (+ `REPLICA IDENTITY FULL`).
- `ninefit_checkins.athlete_id` (coluna + backfill via `athlete_auth_link`).
- Limpeza de mocks (`workout_executions` notes ~ mock/test/fake; `planos_de_treino_gerados` vazios; `athlete_planning_history` vazios).
- Confirmar/criar `vw_hub_status` (com `treinos_semana`, `nutri_semana`, `minutos_semana`, missões 1/3/7).
- Criar `share_events` se inexistente (já existe — verificar colunas `content_type`, `shared_at`, `athlete_id`).
- Função `prescrever_treino_rapido(p_athlete_id, p_objetivo, p_tempo_min, p_equipamento)` retornando `{ modelos, exercises }` a partir de `workout_models` + `exercises`.

---

## PROMPT 4 — SyncScore Neon + Design tokens
- `SyncScoreRing.tsx`: refator do conic-gradient e drop-shadow conforme faixas (0-29 sem glow / 30-59 #E8571A 6px / 60-79 #F2C94C 10px / 80-100 #27AE60 14px). Estado "CALIBRANDO" pulsante quando `score === 0` ou perfil sem PDI. `transition: all 0.6s ease`.
- `WeeklyRadar.tsx` (5D): cada eixo lê `avaliacoes_unificadas` (forca/resistencia/core/cardio/mobilidade) e aplica `drop-shadow` proporcional.
- `index.css` / `tailwind.config.ts`: tokens canônicos `--background:#090909`, `--accent:#E8571A`, `--foreground:#F2F0EC`, fontes Syne 800 (display) e DM Mono (label/mono). Sem alterar estrutura — só cores/fontes fora do padrão em Hub, Train, Perfil, Planejamento.

## PROMPT 2 — Train (Treino Rápido + Semana)
- `QuickTrainModal.tsx`: manter criativo `monetization_offers` como primeira tela; após "Agora não" → 3 perguntas → chamar `supabase.rpc('prescrever_treino_rapido', { p_athlete_id, p_objetivo, p_tempo_min, p_equipamento })`. Renderizar `data.exercises` (id, name, video_url, gif_url, target_muscles, sets, reps_range, rest_seconds) na execução guiada. Ao concluir: `INSERT workout_executions(athlete_id, phase_name='quick', ...)` + `fn_award_xp(athleteId, 50, 'quick_workout')`.
- `Train.tsx` / `WeeklyTrainingView.tsx`: ao abrir aba Semana, se não houver `workout_executions` para hoje, chamar `prescrever_treino(p_aluno_id, today)`. Montar grid D1–D7 combinando retorno + `vw_athlete_periodizacao_ativa`. Só o dia atual clicável. Nunca renderizar `planos_de_treino_gerados` cru.
- Remover botões duplicados na tela Train (existem dois iguais).
- `AITrainingPage.tsx`: usar `prescrever_treino` (mesma rota do SmartTreino).

## PROMPT 1 — Hub dados reais + roteamento
- `Hub.tsx` + `HubWeeklyCounters.tsx` + `HubMissionsCard.tsx`: consumir `vw_hub_status` por `athlete_id`. Mapear treinos/nutri/move e 5 missões. Zero → CTA acionável ("Registrar agora", "Gerar plano").
- Grid ecossistema (`physio_modules` / `EcosystemGrid.tsx`): rotas Planejamento → `/9fit/planejamento`, Ajuste → `/9fit/ajuste-treino`, Progresso → `/9fit/progresso`, Foods → `/9fit/foods`. STAFF mantém.
- Helper `resolveAthleteId()` via `athlete_auth_link`.

## PROMPT 3 — Armazenamento individual + Foods + Histórico real
- `CompleteProfileFlow`: ao salvar → `INSERT athlete_profile_snapshots(source='profile_complete')`.
- `PDIWizard`: ao salvar → `INSERT athlete_pdi_history(pdi_data, computed_thresholds)` + `UPDATE athletes.preferences`.
- `Planejamento.tsx` sync: `INSERT athlete_planning_history`.
- `QuickCheckIn`: `INSERT ninefit_checkins(aluno_id, athlete_id)`.
- Workout complete: `INSERT workout_executions(athlete_id NOT NULL)` + `athlete_profile_snapshots(source='workout_complete')`.
- `Progresso.tsx`, `Planejamento.tsx`, `AjusteTreino.tsx`: filtrar por `athlete_id` + `status != 'pending'`. Remover mocks.
- `Foods.tsx`: substituir conteúdo por `<iframe src="https://ninefoodss.lovable.app" />` em viewport cheio sob navbar.

---

## Bloco F — Motor de Viralização
Componente `ShareableCard` + hook `useShareEvent(contentType)`:
- `html2canvas` em conquista → PNG → `navigator.share` (fallback download).
- `INSERT share_events(athlete_id, content_type, shared_at)`.
- Template visual via `social_share_templates` (content_type).
- Gatilhos: workout_completed, first_workout, id_card_upgrade, goal_achieved, level_up, streak_7.
- Logo 9FIT discreta, foco na conquista.

## PrimePass operação real
- `PrimePass.tsx` / `PrimePassHub.tsx`: CTA assinatura → `https://buy.stripe.com/test_4gMfZg0NK3gn2NMahkgbm03`.
- Página de retorno (`CheckoutSuccess.tsx`): atualizar `user_plans(plan_type='prime', expires_at=now()+30d)` e `athletes.metadata.id_card_tier='gold'` quando aplicável; liberar todo o app.
- Recompensa automática 7 dias consistência: mesma operação via trigger frontend.

## Refator Edge Functions (PDI helper)
- `ai-coach`, `training-ai-adjust`, `smart-notifications`: importar `_shared/pdi.ts` (`classifyScore`, `adjustForPDI`) e usar `fn_compute_user_thresholds` antes de qualquer decisão de intensidade. Remover constantes fixas.

## UX global
- `<BackButton />` fixo no topo de cada tela (esquerda), navigate(-1). Aplicar em todas pages `/9fit/*` e admin via layout.
- Remover botões duplicados (Train e qualquer outro identificado).

---

## Arquivos a criar
- `src/components/9fit/BackButton.tsx`
- `src/components/9fit/ShareableCard.tsx`
- `src/hooks/useShareEvent.ts`
- `src/hooks/useResolveAthleteId.ts` (centraliza padrão)
- Migration única com SQLs 1–5 + `prescrever_treino_rapido` + `share_events` (se faltar).

## Arquivos a editar (principais)
- `src/components/9fit/SyncScoreRing.tsx`, `WeeklyRadar.tsx`, `QuickTrainModal.tsx`, `WeeklyTrainingView.tsx`, `HubWeeklyCounters.tsx`, `HubMissionsCard.tsx`, `EcosystemGrid.tsx`, `CompleteProfileFlow.tsx`, `PDIWizard.tsx`, `QuickCheckIn.tsx`, `NineFitLayout.tsx`.
- `src/pages/9fit/Hub.tsx`, `Train.tsx`, `Foods.tsx`, `Planejamento.tsx`, `Progresso.tsx`, `AjusteTreino.tsx`, `PrimePass.tsx`, `Prime.tsx`, `Profile.tsx`, `CheckoutSuccess.tsx`.
- `src/pages/AITrainingPage.tsx`.
- `src/index.css`, `tailwind.config.ts`.
- `supabase/functions/ai-coach/index.ts`, `training-ai-adjust/index.ts`, `smart-notifications/index.ts`.

## Validação
1. Migration executada sem erro; `vw_hub_status` retorna linhas.
2. Hub mostra dados reais para athlete logado.
3. Treino Rápido entrega sessão via `prescrever_treino_rapido` com vídeos.
4. Semana mostra dia atual clicável; demais bloqueados.
5. SyncScoreRing acende com glow proporcional; "CALIBRANDO" quando score=0.
6. Foods carrega iframe ninefoodss.
7. Botão voltar presente em todas telas; sem botões duplicados em Train.
8. Compartilhar conquista gera PNG e grava em `share_events`.
9. PrimePass CTA leva ao Stripe test e libera plano após retorno.

---

**Custo estimado:** ~4 créditos (4 prompts) + 1 migration + viralização/PrimePass/PDI edge functions. Pode chegar a 6 créditos no total dependendo do volume de edits.

Confirmar para iniciar pela migration + PROMPT 4.