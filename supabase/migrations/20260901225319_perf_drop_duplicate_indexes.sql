-- Índices duplicados: mesma coluna, dois nomes. Custam escrita extra em todo INSERT/UPDATE sem
-- ganho nenhum de leitura. Mantendo sempre o mais antigo/mais usado pelo nome, dropando o gêmeo.
DROP INDEX IF EXISTS public.idx_alunos_professor_id;
DROP INDEX IF EXISTS public.uq_athlete_periodizations_annual_plan_id;
DROP INDEX IF EXISTS public.idx_audit_log_created;
DROP INDEX IF EXISTS public.idx_audit_user_id;
DROP INDEX IF EXISTS public.idx_avaliacoes_estudante_id;
DROP INDEX IF EXISTS public.idx_avaliacoes_fisicas_aluno_id;
DROP INDEX IF EXISTS public.idx_avaliacoes_unificadas_aluno;
DROP INDEX IF EXISTS public.idx_avaliacoes_unificadas_athlete_id;
DROP INDEX IF EXISTS public.idx_planos_aluno_id;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_role;
DROP INDEX IF EXISTS public.idx_workout_assignments_student_id;;
