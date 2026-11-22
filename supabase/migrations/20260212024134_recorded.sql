
-- =============================================
-- FIX 1: Replace overly permissive INSERT policies with proper checks
-- =============================================

-- Fix avaliacoes_unificadas: Replace WITH CHECK(true) INSERT
DROP POLICY IF EXISTS "Authenticated can insert assessments" ON public.avaliacoes_unificadas;
CREATE POLICY "Professors can insert assessments for their students" 
ON public.avaliacoes_unificadas 
FOR INSERT 
TO authenticated
WITH CHECK (
  aluno_id IN (SELECT id FROM public.alunos WHERE professor_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix historico_avaliacoes: Replace WITH CHECK(true) INSERT
DROP POLICY IF EXISTS "Authenticated can insert history" ON public.historico_avaliacoes;
CREATE POLICY "Professors can insert assessment history" 
ON public.historico_avaliacoes 
FOR INSERT 
TO authenticated
WITH CHECK (
  estudante_id IN (SELECT id FROM public.alunos WHERE professor_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix logs_sincronizacao: Replace WITH CHECK(true) INSERT (keep admin-only)
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.logs_sincronizacao;
CREATE POLICY "Admins can insert sync logs" 
ON public.logs_sincronizacao 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fix audit_log: Replace WITH CHECK(true) INSERT
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_log;
CREATE POLICY "System can insert audit logs" 
ON public.audit_log 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix notifications: Replace WITH CHECK(true) INSERT
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users create notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_trainer(auth.uid())
);

-- Fix periodization_history: Replace WITH CHECK(true) INSERT
DROP POLICY IF EXISTS "Authenticated can insert history" ON public.periodization_history;
CREATE POLICY "Users can insert periodization history" 
ON public.periodization_history 
FOR INSERT 
TO authenticated
WITH CHECK (
  changed_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- =============================================
-- FIX 2: Convert SECURITY DEFINER views to SECURITY INVOKER
-- =============================================

-- Recreate views with security_invoker = true
CREATE OR REPLACE VIEW public.v_system_health WITH (security_invoker = true) AS
SELECT 
  (SELECT count(*) FROM athletes WHERE activated = true) AS active_athletes,
  (SELECT count(*) FROM athlete_periodizations WHERE status = 'active') AS active_assignments,
  (SELECT count(*) FROM workout_logs WHERE started_at > (now() - '7 days'::interval)) AS workouts_last_7_days,
  (SELECT count(*) FROM system_events WHERE created_at > (now() - '24:00:00'::interval)) AS events_last_24h,
  (SELECT count(*) FROM notifications WHERE is_read = false) AS pending_notifications,
  now() AS checked_at;

CREATE OR REPLACE VIEW public.v_students_canonical WITH (security_invoker = true) AS
SELECT 
  id, coach_id AS professor_id, name AS nome, phone AS telefone,
  birthdate AS data_nascimento, gender AS genero, peso_kg, altura_cm,
  COALESCE(objetivo, primary_goal) AS objetivo,
  COALESCE(nivel, experience_level, training_level) AS nivel_experiencia,
  COALESCE(weekly_frequency, sessions_per_week) AS frequencia_semanal,
  training_environment AS ambiente_treino,
  injuries_limitations AS restricoes_medicas,
  metadata, activated AS ativo, user_id, created_at, updated_at
FROM athletes a;

CREATE OR REPLACE VIEW public.v_periodizations_canonical WITH (security_invoker = true) AS
SELECT 
  id, professor_id, user_id AS athlete_id, title, description, duration,
  current_phase, total_phases, macrocycle, mesocycle, microcycle,
  graph_data, periodization_data, created_at, updated_at
FROM periodizations p;

CREATE OR REPLACE VIEW public.v_periodizations_catalog WITH (security_invoker = true) AS
SELECT 
  id, title, goal, duration, description, macrocycle, mesocycle,
  microcycle, recommended_for, graph_data, created_at, updated_at
FROM periodization_models pm;

CREATE OR REPLACE VIEW public.v_assessments_canonical WITH (security_invoker = true) AS
SELECT 
  id, aluno_id AS athlete_id, data_avaliacao AS assessment_date,
  peso, altura, imc, gordura_corporal, massa_muscular, massa_magra, massa_gorda,
  circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
  circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
  rml_flexao, rml_agachamento, rml_abs,
  observacoes AS notes, avaliador_nome AS evaluator_name,
  origem AS source, created_at, updated_at
FROM avaliacoes_unificadas au;

CREATE OR REPLACE VIEW public.v_assignments_canonical WITH (security_invoker = true) AS
SELECT 
  id, athlete_id, periodization_model_id,
  assigned_by AS professor_id, assigned_at, status,
  match_percentage, match_factors, notes, created_at
FROM athlete_periodizations ap;
;
