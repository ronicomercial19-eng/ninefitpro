# Entrega Completa — Blocos A–H + Sync Engine + Guard Reverso + Ativação Unificada

## Escopo

Frontend puro sobre RPCs já existentes no Supabase. Nenhuma migration nova (Bloco H já executado). Nada de layout novo — reaproveitar tokens neon/dark existentes.

## 0. Ativação Unificada (corrigir duplicidade dos anexos 2/3)

- `**ActivationMissionCard.tsx**`: reduzir a **um único CTA "Sua Ativação"** (remover a versão duplicada "Completar perfil / Fazer avaliação / Gerar plano / Registrar agora / Abrir Hub / Ver progresso" que aparece embaixo).
- `**Hub.tsx**`: remover a segunda instância / segundo card de ativação renderizado (anexo 3). Só 1 card por página.
- `**Ativacao.tsx**`: garantir as 4 telas funcionais (Assessment → Generation → Execute → Consistency → Finished) já usando `useActivationFlow` — validar handlers.
- **Guard reverso** em `NineFitLayout.tsx`: se `athlete_activation.finished_at != null` e usuário em `/9fit/ativacao` → redirect `/9fit/os` (já existe parcial — confirmar).
- **Remover do grid** o item pedido no anexo 1 (identificar no `EcosystemGrid` / `ModuleGrid` o card duplicado de ativação e remover).

## 1. BLOCO E — useAthleteScores (correção de chave)

sync_score_logs usa user_id, NÃO athlete_id. Ajustar o realtime subscribe:

  const { data: { user } } = await supabase.auth.getUser();

  [supabase.channel](http://supabase.channel)('sync-score')

    .on('postgres_changes', {

      event: 'INSERT', schema: 'public', table: 'sync_score_logs',

      filter: `user_id=eq.${user.id}`

    }, refresh)

    .subscribe();

Nota: sync_score_logs parece ser o check-in qualitativo diário (feedback_text,

inferred_state), diferente do score calculado em athletes.sync_score

(calcular_sync_score_real). Confirmar com Rony qual das duas fontes alimenta

o Radar 5D visual antes de escolher uma sozinho.

## 2. Daily Protocol + Propagação

- `DailyProtocol.tsx`: 4 perguntas (sono/energia/dor/humor), upsert em `ninefit_checkins` (colunas existentes), chama `refresh()` do `useAthleteScores` após cada resposta.
- Estado `syncScore === 0` → renderiza `<DailyProtocolCTA>` no Hub em vez de "0" alarmante.

## 3. BLOCO A — Treino Rápido

`QuickTrainModal.tsx` (já existe) + nova página `src/pages/9fit/TreinoRapido.tsx` se necessário:

- 3 perguntas (objetivo / tempo / equipamento) → `rpc('fn_treino_rapido', {...})`.
- Ao iniciar: `insert workout_executions { phase_name:'quick', status:'in_progress' }`.
- Ao concluir: `update` para `completed` + `rpc('fn_award_xp', { p_amount: 50, p_source:'quick_workout' })` + `refresh()`.

## 4. BLOCO C — Treinos da Semana

`WeeklyTrainingView.tsx`:

- `rpc('fn_get_week_workouts', { p_athlete_id })` → grid D1-D7 com `phase_status` e `match_percentage`.
- Não renderizar `rpe_cap` / `phase_category`.
- Ao concluir dia: `insert workout_executions completed` + `fn_award_xp 100` + `refresh()`.

## 5. BLOCO D — Ajuste de Treino

`AjusteTreino.tsx`:

- Substituir `aplicar_ajuste_treino_dia` por `rpc('fn_ajustar_treino_dia', { p_athlete_id, p_data, p_changes: arrayDeAlteracoes })`.
- Atualizar UI imediatamente com `data.exercises[]` retornado.
- Manter realtime `daily_workouts` já implementado.

## 6. BLOCO G — Completar Perfil + Prime Reward

- `CompleteProfileFlow.tsx` (ou nova `CompletarPerfil.tsx`): `rpc('fn_check_onboarding_progress')` → checklist com 7 campos.
- Quando `sete_dias === true` → `rpc('fn_activate_prime_reward')` (1x, com guard local para não duplicar).

## 7. BLOCO F — HealthFlix

- `HealthFlix.tsx`: reconectar cliente existente (`healthflix-proxy` edge function) e listar conteúdo livre. Sem migration.

## 8. BLOCO H — BLOCO H — Collections / Share Viral

Nova página src/pages/9fit/Collections.tsx + rota:

- Buscar benchmarks reais: carga via strength_records (NÃO registros_carga —

  foi consolidada/desativada), streak via athlete_activation.consistency_days,

  treinos concluídos via workout_executions, metas via metas_aluno se aplicável.

- Montar cards com foto do atleta + dado + marca d'água "9FIT PRO" (canto inf. dir.).

- html2canvas (checar se já está no bundle — se não, bun add html2canvas) →

  screenshot → navigator.share ou download.

Registrar carga (ao concluir treino ou registro manual):

  await supabase.from('strength_records').insert({

    user_id: [user.id](http://user.id),

    exercise_name: exerciseName,

    weight_kg: weight,

    reps: reps,

    sets: sets,

    workout_execution_id: workoutExecutionId,

    origem: 'app',

    recorded_at: new Date()

  });

Registrar compartilhamento (formato real da tabela — NÃO usar dado_exibido,

essa coluna não existe):

  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('share_events').insert({

    user_id: [user.id](http://user.id),

    athlete_id: athleteId,

    channel: 'native_share', // ou 'download' no fallback desktop

    content_type: contentType,

    content_id: templateSlug,

    reward_xp: 20,

    shared_at: new Date()

  });

Templates: social_share_templates já tem 11 seeds ativos — usar direto,

sem criar novo.

## 9. Propagação obrigatória

Após cada evento abaixo → chamar `useAthleteScores().refresh()`:

- resposta Daily Protocol, conclusão de treino, `fn_award_xp`, abertura do app.

## 10. Guard reverso

Confirmar em `NineFitLayout.tsx` o bloco `if (finished && onAtivacao) → /9fit/os` (já presente — validar).

## 11. Validação Playwright

Roteiro em `/tmp/browser/validation.py` cobrindo:

- A: 3 perguntas → treino gerado → start/complete → XP+50.
- C: semana carrega D1-D7 → concluir dia → XP+100.
- D: enviar ajuste → UI atualiza sem reload.
- E: score varia após treino concluído.
- G: 7 dias → prime ativado (`user_plans` criado).
- H: share_events registrado.
- Engine: syncScore=0 → CTA aparece.
- Guard reverso: usuário finished acessa /ativacao → redirect /os.

## Arquivos afetados (aprox.)

**Editar:** `src/hooks/useAthleteScores.ts`, `src/components/9fit/DailyProtocol.tsx`, `src/components/9fit/QuickTrainModal.tsx`, `src/components/9fit/WeeklyTrainingView.tsx`, `src/pages/9fit/AjusteTreino.tsx`, `src/components/9fit/CompleteProfileFlow.tsx`, `src/pages/9fit/HealthFlix.tsx`, `src/components/9fit/ActivationMissionCard.tsx`, `src/pages/9fit/Hub.tsx`, `src/components/9fit/EcosystemGrid.tsx`, `src/components/9fit/NineFitLayout.tsx`, `src/components/9fit/SyncScoreRing.tsx`, `src/components/9fit/WeeklyRadar3D.tsx`, `src/components/9fit/HubFloatingMetrics.tsx`, `src/components/9fit/OSDashboard.tsx`, `src/App.tsx` (rota Collections).
**Criar:** `src/pages/9fit/Collections.tsx`, `src/pages/9fit/TreinoRapido.tsx` (se preciso), `src/components/9fit/DailyProtocolCTA.tsx`.

## Fora de escopo

Migrations novas, mudanças de layout/tokens, refatorar edge functions, PATCH 7 não-ativação (Radar externo, PrimePass, multitenant).

## Riscos

- RPCs assumidas existentes (`fn_treino_rapido`, `fn_get_week_workouts`, `fn_ajustar_treino_dia`, `fn_get_athlete_scores`, `fn_check_onboarding_progress`, `fn_activate_prime_reward`, `fn_award_xp`). Se alguma não existir no schema, reportar antes de implementar.
- `html2canvas` pode precisar ser instalado.