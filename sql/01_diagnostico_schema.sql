-- sql/01_diagnostico_schema.sql
-- 9FIT PRO — Etapa 1: Diagnóstico + Mapeamento de Arquitetura
-- INSTRUÇÕES: Cole todo este arquivo no SQL Editor do Supabase em modo somente leitura.
-- Execute cada bloco individualmente e valide os resultados antes de prosseguir.

-- 1. strength_records
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'strength_records' ORDER BY ordinal_position;

-- 2. personal_records
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'personal_records' ORDER BY ordinal_position;

-- 3. workout_exercise_sets
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'workout_exercise_sets' ORDER BY ordinal_position;

-- 4. Bio tables (Radar 5D)
SELECT table_name, column_name, data_type 
FROM information_schema.columns
WHERE table_name IN ('bio_sleep_logs','bio_recovery_state','bio_heart_rate_logs','bio_hrv_logs')
ORDER BY table_name, ordinal_position;

-- 5. nutrition_logs
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'nutrition_logs' ORDER BY ordinal_position;

-- 6. View atual de planejamento (para não quebrar)
SELECT pg_get_viewdef('public.vw_athlete_periodizacao_ativa'::regclass, true);

-- Backfill helpers (não executar automaticamente em produção):
-- Mostre até 50 linhas de cada tabela para inspeção rápida
-- (descomente se quiser executar localmente / staging)
--
-- SELECT * FROM strength_records LIMIT 50;
-- SELECT * FROM personal_records LIMIT 50;
-- SELECT * FROM workout_exercise_sets LIMIT 50;
-- SELECT * FROM nutrition_logs LIMIT 50;

-- Observações:
-- - Execute esses selects em um usuário com permissão de leitura no schema public.
-- - Não execute alterações (DML/DDL) até que a Etapa 1 esteja validada.
