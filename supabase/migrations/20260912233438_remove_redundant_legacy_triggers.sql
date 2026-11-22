-- Remove trigger legada redundante em personal_records (duplicava
-- trg_recalc_stats_on_pr, ambas chamando recalc_athlete_stats agora).
DROP TRIGGER IF EXISTS trg_prs_recalc_stats ON public.personal_records;

-- Remove trigger em treinos_realizados (tabela morta, 0 linhas, nunca
-- mais recebe writes — não custa nada mantê-la desativada).
DROP TRIGGER IF EXISTS trg_treinos_recalc_stats ON public.treinos_realizados;;
