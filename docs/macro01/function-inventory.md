# Macro 01 — inventário de funções

Snapshot de catálogo em 05/10/2026, após a migração Macro 01.

Correspondências em código/SQL são candidatas. Comentários e wrappers exigem revisão; ausência no repositório não prova ausência em parceiros externos.

| Assinatura | SECURITY DEFINER | Anon / autenticado | Referências no repositório | Chamadores SQL candidatos |
|---|---|---|---|---|
| `activation_advance(uuid,text,jsonb)` | True | False / True | `src/hooks/useActivationFlow.ts:27`<br>`src/hooks/useActivationFlow.ts:59`<br>`src/hooks/useActivationFlow.ts:65` | `Nenhum candidato localizado` |
| `activation_finish(uuid)` | True | False / True | `src/hooks/useActivationFlow.ts:27`<br>`src/hooks/useActivationFlow.ts:84` | `Nenhum candidato localizado` |
| `ajustar_exercicio_por_dor(uuid,uuid,text,date)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `aplicar_ajuste_treino_dia(uuid,date,jsonb)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `calcular_sync_score_real(uuid)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `complete_first_access()` | True | False / True | `src/hooks/useFirstAccess.ts:65`<br>`src/pages/9fit/FirstAccess.tsx:72` | `Nenhum candidato localizado` |
| `deprecated_prescrever_treino_rapido(uuid,text,integer,text)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `ensure_plano_treino_gerado(uuid)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_activate_prime_reward(uuid)` | True | False / False | `src/hooks/useOnboardingCheck.ts:47` | `Nenhum candidato localizado` |
| `fn_add_credits(uuid,integer,text)` | True | False / False | `src/hooks/useCredits.ts:64` | `Nenhum candidato localizado` |
| `fn_ajustar_treino_dia(uuid,date,jsonb)` | True | False / True | `src/pages/9fit/AjusteTreino.tsx:114`<br>`src/pages/9fit/AjusteTreino.tsx:140` | `Nenhum candidato localizado` |
| `fn_ajustar_treino_real(uuid,uuid)` | False | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_aplicar_nine_lima(uuid,date)` | True | False / True | `src/pages/9fit/Protocolo.tsx:52`<br>`src/pages/9fit/Protocolo.tsx:58` | `Nenhum candidato localizado` |
| `fn_aplicar_protocolo_9x9x9(uuid,text,date)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_award_workout_xp(uuid,integer)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_award_xp(uuid,integer,text,jsonb)` | True | False / True | `src/services/engrenagem/gamificationEngine.ts:84`<br>`src/pages/9fit/Ativacao.tsx:107`<br>`src/components/9fit/CompleteProfileFlow.tsx:117`<br>`src/components/9fit/PostWorkoutModal.tsx:136`<br>`src/components/9fit/PostWorkoutModal.tsx:142`<br>`src/components/9fit/QuickCheckIn.tsx:80` | `fn_award_workout_xp(uuid,integer)`<br>`fn_reward_share(uuid,text,text,integer)`<br>`trg_share_events_reward()`<br>`trg_workout_xp_and_score()` |
| `fn_award_xp_on_workout_completion()` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_check_onboarding_progress(uuid)` | True | False / True | `src/hooks/useOnboardingCheck.ts:31` | `Nenhum candidato localizado` |
| `fn_complete_mission(uuid,text)` | True | False / True | `src/hooks/useAthleteActivation.ts:106` | `Nenhum candidato localizado` |
| `fn_complete_workout_execution(uuid,integer)` | True | False / True | `src/components/9fit/WorkoutExecution.tsx:563` | `Nenhum candidato localizado` |
| `fn_compute_user_thresholds(uuid)` | True | False / True | `src/hooks/useUserParameters.ts:36`<br>`supabase/functions/_shared/pdi.ts:3`<br>`supabase/functions/_shared/pdi.ts:36` | `Nenhum candidato localizado` |
| `fn_consume_credit(uuid,integer,text)` | True | False / True | `src/hooks/useCredits.ts:53` | `Nenhum candidato localizado` |
| `fn_core_os_workout_completed()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_core_os_workout_skipped()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_create_staff_appointment(uuid,uuid,text,timestamp with time zone,integer,text,text,text,text,uuid)` | True | False / True | `src/pages/9fit/AulasCreditos.tsx:200` | `Nenhum candidato localizado` |
| `fn_current_athlete_id()` | True | False / True | `src/hooks/useAthleteId.ts:17`<br>`src/services/engrenagem/recommendationEngine.ts:40`<br>`src/services/skills/skillRuntime.ts:40`<br>`src/components/9fit/CompleteProfileFlow.tsx:30`<br>`supabase/functions/ai-coach/index.ts:119` | `Nenhum candidato localizado` |
| `fn_fitpro_daily_checkin(text,date,text)` | False | False / True | `src/components/9fit/DailyGoalCheckins.tsx:34` | `Nenhum candidato localizado` |
| `fn_gerar_treino_semana(uuid,text,integer)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_get_athlete_timeline(uuid,integer)` | True | False / True | `src/pages/AIAnalysisPage.tsx:64`<br>`src/pages/9fit/Progresso.tsx:520`<br>`src/components/9fit/HistoricoCompletoModal.tsx:45`<br>`src/components/9fit/HistoricoCompletoModal.tsx:63`<br>`src/components/9fit/HistoricoCompletoModal.tsx:69` | `Nenhum candidato localizado` |
| `fn_get_hub_snapshot()` | False | False / True | `src/hooks/useAthleteScores.ts:144`<br>`src/hooks/useAthleteScores.ts:220` | `Nenhum candidato localizado` |
| `fn_get_leaderboard(integer)` | True | False / True | `src/pages/9fit/Social.tsx:28`<br>`src/pages/9fit/Social.tsx:31`<br>`src/components/9fit/OSDashboard.tsx:72`<br>`src/components/9fit/OSDashboard.tsx:74` | `Nenhum candidato localizado` |
| `fn_get_protocolo_arquivos(uuid)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_get_ron_progresso_screen(uuid)` | True | False / True | `src/pages/AIAnalysisPage.tsx:63`<br>`src/pages/9fit/Progresso.tsx:18`<br>`src/pages/9fit/Progresso.tsx:69`<br>`src/pages/9fit/Progresso.tsx:74`<br>`src/pages/9fit/Progresso.tsx:132`<br>`src/components/9fit/CheckinCorporalCard.tsx:15`<br>`src/components/9fit/RecordesSection.tsx:47` | `Nenhum candidato localizado` |
| `fn_get_treino_dia(uuid,date)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_get_week_workouts(uuid,date)` | True | False / True | `src/pages/9fit/Train.tsx:181`<br>`src/components/9fit/WeeklyTrainingView.tsx:51`<br>`src/components/9fit/WeeklyTrainingView.tsx:68`<br>`src/components/9fit/WeeklyTrainingView.tsx:95`<br>`src/components/9fit/WeeklyTrainingView.tsx:113` | `Nenhum candidato localizado` |
| `fn_interceptar_e_gerar_treino_fitpro()` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_notify_coach_workout_adjusted()` | True | True / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_notify_workout_completed()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_notify_workout_updated()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_on_workout_completed()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_on_xp_awarded()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_publicar_treino_smartreino(uuid,date,integer,text,text[],text,integer,jsonb,text)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_registrar_peso_avulso(uuid,numeric,date,numeric)` | True | False / True | `src/components/9fit/CheckinCorporalCard.tsx:11`<br>`src/components/9fit/CheckinCorporalCard.tsx:49`<br>`src/components/9fit/CheckinCorporalCard.tsx:58` | `Nenhum candidato localizado` |
| `fn_registrar_recorde(uuid,text,text,numeric,text)` | True | False / True | `src/components/9fit/RecordesSection.tsx:76` | `Nenhum candidato localizado` |
| `fn_review_ninefit_template(uuid,text)` | True | False / True | `src/pages/admin/NineFitTemplateLibraryPage.tsx:52` | `Nenhum candidato localizado` |
| `fn_reward_share(uuid,text,text,integer)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_salvar_avaliacao_guiada(uuid,numeric,numeric,numeric,numeric,numeric,numeric,date)` | True | False / True | `src/pages/9fit/AvaliacaoGuiada.tsx:36` | `Nenhum candidato localizado` |
| `fn_save_workout_set(uuid,text,integer,integer,boolean,integer,numeric,text,integer,text)` | True | False / True | `src/components/9fit/WorkoutExecution.tsx:485` | `Nenhum candidato localizado` |
| `fn_start_daily_workout_execution(uuid)` | True | False / True | `src/components/9fit/QuickTrainModal.tsx:105`<br>`src/components/9fit/WorkoutExecution.tsx:354` | `Nenhum candidato localizado` |
| `fn_start_workout_execution(uuid)` | True | False / True | `src/components/9fit/WorkoutExecution.tsx:357` | `Nenhum candidato localizado` |
| `fn_sugerir_protocolo_por_perfil(uuid)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_sync_macro_rules_from_periodization(uuid)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_sync_personal_records_ids()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `fn_treino_rapido(uuid,integer,text,text)` | True | False / True | `src/pages/9fit/Ativacao.tsx:142`<br>`src/pages/9fit/Ativacao.tsx:163`<br>`src/components/9fit/QuickTrainModal.tsx:91` | `Nenhum candidato localizado` |
| `fn_treino_rapido(uuid,text,integer,text)` | True | False / True | `src/pages/9fit/Ativacao.tsx:142`<br>`src/pages/9fit/Ativacao.tsx:163`<br>`src/components/9fit/QuickTrainModal.tsx:91` | `Nenhum candidato localizado` |
| `gerar_blocos_protocolo_dia(uuid,date)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `gerar_modelo_treino(uuid,text,text,jsonb)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `get_aluno_context_smarttreino(text)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `get_week_workouts(uuid)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `get_workout_of_day(uuid,date)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `prescrever_treino(uuid,date)` | True | False / True | `src/pages/AITrainingPage.tsx:63`<br>`src/pages/AITrainingPage.tsx:66`<br>`src/pages/AITrainingPage.tsx:71`<br>`src/pages/AITrainingPage.tsx:114`<br>`src/components/9fit/WorkoutExecution.tsx:80`<br>`src/components/9fit/WorkoutExecution.tsx:144`<br>`src/components/9fit/WorkoutExecution.tsx:149`<br>`src/components/9fit/WorkoutExecution.tsx:174`<br>`src/components/9fit/WorkoutExecution.tsx:209`<br>`src/components/9fit/WorkoutExecution.tsx:438` | `prescrever_treino_html(uuid,date)`<br>`prescrever_treino_partner(uuid,date)`<br>`regenerar_dia_evitando_regiao(uuid,text,date)` |
| `prescrever_treino_html(uuid,date)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `prescrever_treino_partner(uuid,date)` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `reconcile_appointments_for_user()` | True | False / True | `src/pages/9fit/AulasCreditos.tsx:104` | `Nenhum candidato localizado` |
| `regenerar_dia_evitando_regiao(uuid,text,date)` | True | False / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `sync_community_cheer_count()` | True | True / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `sync_fitpro_planejamento(uuid,text)` | True | False / True | `supabase/functions/fitpro-api/index.ts:258`<br>`supabase/functions/fitpro-api/index.ts:267`<br>`supabase/functions/fitpro-api/index.ts:317` | `Nenhum candidato localizado` |
| `sync_fitpro_snapshot()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `sync_subapp_from_plan()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_ensure_plano_treino_gerado()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_fn_send_xp_event_to_supra()` | False | True / True | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_pdi_questionnaire_complete()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_pdi_snapshot()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_recalc_stats_on_treino()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_share_events_reward()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trg_workout_xp_and_score()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
| `trigger_workout_completion()` | True | False / False | Nenhuma referência localizada | `Nenhum candidato localizado` |
