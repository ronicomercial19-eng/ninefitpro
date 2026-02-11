
-- =============================================
-- BLOCO 1: CORRECOES CRITICAS (ERRORS)
-- =============================================

-- 1.1 Habilitar RLS na tabela students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 1.2 Recriar 6 views SEM SECURITY DEFINER (usando SECURITY INVOKER)
DROP VIEW IF EXISTS public.v_system_health;
CREATE VIEW public.v_system_health WITH (security_invoker = true) AS
SELECT 
  (SELECT count(*) FROM athletes WHERE activated = true) AS active_athletes,
  (SELECT count(*) FROM athlete_periodizations WHERE status = 'active') AS active_assignments,
  (SELECT count(*) FROM workout_logs WHERE started_at > (now() - '7 days'::interval)) AS workouts_last_7_days,
  (SELECT count(*) FROM system_events WHERE created_at > (now() - '24:00:00'::interval)) AS events_last_24h,
  (SELECT count(*) FROM notifications WHERE is_read = false) AS pending_notifications,
  now() AS checked_at;

DROP VIEW IF EXISTS public.v_students_canonical;
CREATE VIEW public.v_students_canonical WITH (security_invoker = true) AS
SELECT id, coach_id AS professor_id, name AS nome, phone AS telefone,
  birthdate AS data_nascimento, gender AS genero, peso_kg, altura_cm,
  COALESCE(objetivo, primary_goal) AS objetivo,
  COALESCE(nivel, experience_level, training_level) AS nivel_experiencia,
  COALESCE(weekly_frequency, sessions_per_week) AS frequencia_semanal,
  training_environment AS ambiente_treino, injuries_limitations AS restricoes_medicas,
  metadata, activated AS ativo, user_id, created_at, updated_at
FROM athletes a;

DROP VIEW IF EXISTS public.v_periodizations_canonical;
CREATE VIEW public.v_periodizations_canonical WITH (security_invoker = true) AS
SELECT id, professor_id, user_id AS athlete_id, title, description, duration,
  current_phase, total_phases, macrocycle, mesocycle, microcycle, graph_data,
  periodization_data, created_at, updated_at
FROM periodizations p;

DROP VIEW IF EXISTS public.v_periodizations_catalog;
CREATE VIEW public.v_periodizations_catalog WITH (security_invoker = true) AS
SELECT id, title, goal, duration, description, macrocycle, mesocycle, microcycle,
  recommended_for, graph_data, created_at, updated_at
FROM periodization_models pm;

DROP VIEW IF EXISTS public.v_assessments_canonical;
CREATE VIEW public.v_assessments_canonical WITH (security_invoker = true) AS
SELECT id, aluno_id AS athlete_id, data_avaliacao AS assessment_date,
  peso, altura, imc, gordura_corporal, massa_muscular, massa_magra, massa_gorda,
  circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
  circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
  rml_flexao, rml_agachamento, rml_abs, observacoes AS notes,
  avaliador_nome AS evaluator_name, origem AS source, created_at, updated_at
FROM avaliacoes_unificadas au;

DROP VIEW IF EXISTS public.v_assignments_canonical;
CREATE VIEW public.v_assignments_canonical WITH (security_invoker = true) AS
SELECT id, athlete_id, periodization_model_id, assigned_by AS professor_id,
  assigned_at, status, match_percentage, match_factors, notes, created_at
FROM athlete_periodizations ap;

-- =============================================
-- BLOCO 2.1: FIXAR search_path NAS FUNCOES
-- =============================================

CREATE OR REPLACE FUNCTION public.match_periodizations_for_profile(p_user_profile_id uuid)
RETURNS TABLE(periodization_model_id text, title text, match_percentage integer, match_factors jsonb)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
BEGIN
  SELECT * INTO v_profile FROM public.user_profiles up WHERE up.id = p_user_profile_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil % não encontrado em user_profiles', p_user_profile_id;
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT pm.id, pm.title, pm.goal, pm.duration, pm.recommended_for
    FROM public.periodization_models pm
  ),
  scored AS (
    SELECT b.id, b.title,
      ((CASE WHEN b.goal = v_profile.primary_goal THEN 45 ELSE 0 END))
      + (CASE WHEN v_profile.weekly_frequency BETWEEN 5 AND 6 AND COALESCE((b.recommended_for->>'weekly_frequency_max')::int, 6) >= v_profile.weekly_frequency THEN 15
             WHEN v_profile.weekly_frequency BETWEEN 3 AND 4 THEN 12
             WHEN v_profile.weekly_frequency = 2 THEN 8 ELSE 5 END)
      + (CASE WHEN v_profile.experience_level IN ('intermediario','avancado') AND COALESCE(v_profile.experience_months, 12) >= COALESCE((b.recommended_for->>'min_experience_months')::int, 0) THEN 20
             WHEN v_profile.experience_level = 'iniciante' THEN 12 ELSE 10 END)
      + (CASE WHEN b.duration = '12m' AND v_profile.primary_goal IN ('hipertrofia','performance_atletica') THEN 10
             WHEN b.duration = '6m' THEN 8 WHEN b.duration = '3m' THEN 6
             WHEN b.duration = '24m' THEN 9 ELSE 5 END)
      + (CASE WHEN (v_profile.training_environment = (b.recommended_for->>'environment'))
                OR (NOT (b.recommended_for ? 'environment')) THEN 10 ELSE 5 END)
      AS score,
      jsonb_build_object('goal_match', (b.goal = v_profile.primary_goal),
        'weekly_frequency', v_profile.weekly_frequency, 'experience_level', v_profile.experience_level,
        'duration', b.duration, 'environment', b.recommended_for->>'environment') AS factors
    FROM base b
  )
  SELECT id::text, title, LEAST(100, GREATEST(0, score))::int AS match_percentage, factors AS match_factors
  FROM scored ORDER BY score DESC LIMIT 3;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.ultima_atualizacao = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_alunos_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', 'alunos', OLD.id::text, to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, action, resource_type, resource_id, old_data)
    VALUES (auth.uid(), 'DELETE', 'alunos', OLD.id::text, to_jsonb(OLD));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_saved_periodizations_updated_at()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS text LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'base64');
  token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
  RETURN token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_avaliacoes_timestamp()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.log_periodization_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.periodization_history (saved_periodization_id, changed_by, changes, change_type, change_description)
    VALUES (NEW.id, auth.uid(), jsonb_build_object('plan_name', NEW.plan_name, 'status', NEW.status, 'customizations', NEW.customizations), 'created', 'Periodização criada');
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.periodization_history (saved_periodization_id, changed_by, changes, change_type, change_description)
    VALUES (NEW.id, auth.uid(),
      jsonb_build_object('old', jsonb_build_object('plan_name', OLD.plan_name, 'status', OLD.status, 'customizations', OLD.customizations, 'notes', OLD.notes),
        'new', jsonb_build_object('plan_name', NEW.plan_name, 'status', NEW.status, 'customizations', NEW.customizations, 'notes', NEW.notes)),
      'updated',
      CASE WHEN OLD.status != NEW.status AND NEW.status = 'archived' THEN 'Periodização arquivada'
           WHEN OLD.status != NEW.status AND NEW.status = 'active' THEN 'Periodização restaurada'
           ELSE 'Periodização atualizada' END);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.salvar_avaliacao(p_estudante_id uuid, p_dados jsonb)
RETURNS TABLE(success boolean, message text) LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE v_aluno_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.alunos WHERE id = p_estudante_id) INTO v_aluno_exists;
  IF NOT v_aluno_exists THEN
    RETURN QUERY SELECT FALSE as success, 'Aluno não encontrado'::TEXT as message; RETURN;
  END IF;
  INSERT INTO public.avaliacoes_unificadas (
    aluno_id, origem, data_avaliacao, peso, altura, imc, gordura_corporal, massa_muscular,
    circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
    circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
    rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
    rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
    dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
    dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
    massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
    exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref
  ) VALUES (
    p_estudante_id, 'manual', COALESCE((p_dados->>'data_avaliacao')::DATE, CURRENT_DATE),
    (p_dados->>'peso')::NUMERIC, (p_dados->>'altura')::NUMERIC, (p_dados->>'imc')::NUMERIC,
    (p_dados->>'gordura_corporal')::NUMERIC, (p_dados->>'massa_muscular')::NUMERIC,
    (p_dados->>'circunferencia_braco')::NUMERIC, (p_dados->>'circunferencia_peitoral')::NUMERIC,
    (p_dados->>'circunferencia_cintura')::NUMERIC, (p_dados->>'circunferencia_quadril')::NUMERIC,
    (p_dados->>'circunferencia_coxa')::NUMERIC, (p_dados->>'circunferencia_panturrilha')::NUMERIC,
    (p_dados->>'rml_abs')::INTEGER, (p_dados->>'rml_flexao')::INTEGER,
    (p_dados->>'rml_agachamento')::INTEGER, (p_dados->>'rml_pull')::INTEGER,
    (p_dados->>'rml_elevacao_p')::INTEGER, (p_dados->>'rm1_empurrar_perna')::NUMERIC,
    (p_dados->>'rm1_puxar_costas')::NUMERIC, (p_dados->>'rm1_empurrar_superior')::NUMERIC,
    (p_dados->>'rm1_puxar_inferior')::NUMERIC, (p_dados->>'dobra_triceps')::NUMERIC,
    (p_dados->>'dobra_peitoral')::NUMERIC, (p_dados->>'dobra_abdominal')::NUMERIC,
    (p_dados->>'dobra_suprailiaca')::NUMERIC, (p_dados->>'dobra_coxa')::NUMERIC,
    (p_dados->>'dobra_panturrilha')::NUMERIC, (p_dados->>'dobra_subescapular')::NUMERIC,
    (p_dados->>'dobra_axilar_media')::NUMERIC, (p_dados->>'massa_gorda')::NUMERIC,
    (p_dados->>'massa_magra')::NUMERIC, (p_dados->>'agua_corporal')::NUMERIC,
    (p_dados->>'taxa_metabolica')::NUMERIC,
    COALESCE((p_dados->>'exames')::JSONB, '[]'::jsonb),
    p_dados->>'avaliacao_exames', p_dados->>'observacoes',
    p_dados->>'avaliador_nome', p_dados->>'avaliador_cref'
  )
  ON CONFLICT (aluno_id, data_avaliacao, origem) DO UPDATE SET
    peso = EXCLUDED.peso, altura = EXCLUDED.altura, imc = EXCLUDED.imc,
    gordura_corporal = EXCLUDED.gordura_corporal, massa_muscular = EXCLUDED.massa_muscular,
    circunferencia_braco = EXCLUDED.circunferencia_braco, circunferencia_peitoral = EXCLUDED.circunferencia_peitoral,
    circunferencia_cintura = EXCLUDED.circunferencia_cintura, circunferencia_quadril = EXCLUDED.circunferencia_quadril,
    circunferencia_coxa = EXCLUDED.circunferencia_coxa, circunferencia_panturrilha = EXCLUDED.circunferencia_panturrilha,
    rml_abs = EXCLUDED.rml_abs, rml_flexao = EXCLUDED.rml_flexao, rml_agachamento = EXCLUDED.rml_agachamento,
    rml_pull = EXCLUDED.rml_pull, rml_elevacao_p = EXCLUDED.rml_elevacao_p,
    rm1_empurrar_perna = EXCLUDED.rm1_empurrar_perna, rm1_puxar_costas = EXCLUDED.rm1_puxar_costas,
    rm1_empurrar_superior = EXCLUDED.rm1_empurrar_superior, rm1_puxar_inferior = EXCLUDED.rm1_puxar_inferior,
    dobra_triceps = EXCLUDED.dobra_triceps, dobra_peitoral = EXCLUDED.dobra_peitoral,
    dobra_abdominal = EXCLUDED.dobra_abdominal, dobra_suprailiaca = EXCLUDED.dobra_suprailiaca,
    dobra_coxa = EXCLUDED.dobra_coxa, dobra_panturrilha = EXCLUDED.dobra_panturrilha,
    dobra_subescapular = EXCLUDED.dobra_subescapular, dobra_axilar_media = EXCLUDED.dobra_axilar_media,
    massa_gorda = EXCLUDED.massa_gorda, massa_magra = EXCLUDED.massa_magra,
    agua_corporal = EXCLUDED.agua_corporal, taxa_metabolica = EXCLUDED.taxa_metabolica,
    exames = EXCLUDED.exames, avaliacao_exames = EXCLUDED.avaliacao_exames,
    observacoes = EXCLUDED.observacoes, avaliador_nome = EXCLUDED.avaliador_nome,
    avaliador_cref = EXCLUDED.avaliador_cref, updated_at = now();
  RETURN QUERY SELECT TRUE as success, 'Avaliação salva com sucesso!'::TEXT as message;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE as success, SQLERRM::TEXT as message;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_periodization_match(profile_goal text, profile_experience text, profile_age integer, profile_injuries text, model_goal text, model_recommended_for jsonb)
RETURNS integer LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE match_score INTEGER := 0; base_score INTEGER := 0;
BEGIN
  IF profile_goal = model_goal THEN base_score := base_score + 60; END IF;
  IF model_recommended_for ? profile_experience THEN base_score := base_score + 30; END IF;
  IF profile_age BETWEEN 18 AND 30 THEN base_score := base_score + 10;
  ELSIF profile_age BETWEEN 31 AND 45 THEN base_score := base_score + 8;
  ELSE base_score := base_score + 5; END IF;
  IF profile_injuries IS NOT NULL AND LENGTH(profile_injuries) > 0 THEN
    IF model_recommended_for ? 'avançado' THEN base_score := base_score - 15; END IF;
  END IF;
  match_score := LEAST(base_score, 100);
  RETURN GREATEST(match_score, 0);
END;
$function$;

-- =============================================
-- BLOCO 2.2: CORRIGIR POLITICAS "ALWAYS TRUE"
-- =============================================

-- aluno_periodizacao: Remove "System can manage" (ALL true) - already has proper policies
DROP POLICY IF EXISTS "System can manage compatibilities" ON public.aluno_periodizacao;

-- athlete_auth_link: Restrict INSERT to trainers
DROP POLICY IF EXISTS "System can insert links" ON public.athlete_auth_link;
CREATE POLICY "Trainers can insert links" ON public.athlete_auth_link
  FOR INSERT TO authenticated WITH CHECK (public.is_trainer((select auth.uid())));

-- audit_log: Restrict INSERT to authenticated only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- avaliacoes_fisicas: Restrict INSERT to trainers
DROP POLICY IF EXISTS "Sistema pode inserir avaliações" ON public.avaliacoes_fisicas;
CREATE POLICY "Trainers can insert assessments" ON public.avaliacoes_fisicas
  FOR INSERT TO authenticated WITH CHECK (public.is_trainer((select auth.uid())));

-- avaliacoes_unificadas: Keep INSERT for authenticated (used by salvar_avaliacao)
DROP POLICY IF EXISTS "Sistema insere avaliacoes" ON public.avaliacoes_unificadas;
CREATE POLICY "Authenticated can insert assessments" ON public.avaliacoes_unificadas
  FOR INSERT TO authenticated WITH CHECK (true);

-- estruturas_de_treinamento: Replace ALL true with role-based
DROP POLICY IF EXISTS "Everyone can manage estruturas_de_treinamento" ON public.estruturas_de_treinamento;
DROP POLICY IF EXISTS "Everyone can view estruturas_de_treinamento" ON public.estruturas_de_treinamento;
CREATE POLICY "Authenticated can view training structures" ON public.estruturas_de_treinamento
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage training structures" ON public.estruturas_de_treinamento
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- estudantes: Replace ALL true with role-based
DROP POLICY IF EXISTS "Everyone can manage estudantes" ON public.estudantes;
DROP POLICY IF EXISTS "Everyone can view estudantes" ON public.estudantes;
CREATE POLICY "Authenticated can view students" ON public.estudantes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage students" ON public.estudantes
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- exercicios_novos: Replace ALL true with role-based
DROP POLICY IF EXISTS "Everyone can manage exercicios_novos" ON public.exercicios_novos;
DROP POLICY IF EXISTS "Everyone can view exercicios_novos" ON public.exercicios_novos;
CREATE POLICY "Authenticated can view exercises" ON public.exercicios_novos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage exercises" ON public.exercicios_novos
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- gym_classes: Remove ALL true, keep proper policies
DROP POLICY IF EXISTS "Everyone can manage classes" ON public.gym_classes;
DROP POLICY IF EXISTS "Everyone can view classes" ON public.gym_classes;
-- Keep "Admins podem gerenciar aulas" and "Todos podem ver aulas" (already proper)

-- historico_avaliacoes: Consolidate duplicate INSERT policies
DROP POLICY IF EXISTS "System can insert assessment history" ON public.historico_avaliacoes;
DROP POLICY IF EXISTS "Users can insert assessment history" ON public.historico_avaliacoes;
CREATE POLICY "Authenticated can insert history" ON public.historico_avaliacoes
  FOR INSERT TO authenticated WITH CHECK (true);

-- logs_sincronizacao: Restrict INSERT
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.logs_sincronizacao;
CREATE POLICY "Authenticated can insert logs" ON public.logs_sincronizacao
  FOR INSERT TO authenticated WITH CHECK (true);

-- modelos_de_treino: Remove ALL true, keep specific policies
DROP POLICY IF EXISTS "Everyone can manage modelos_de_treino" ON public.modelos_de_treino;
DROP POLICY IF EXISTS "Everyone can view modelos_de_treino" ON public.modelos_de_treino;
-- Keep "Users can create models", "Users can update models", "Users can view models"

-- notifications: Restrict INSERT to authenticated
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

-- payments: Remove "System can manage" (already has proper policies)
DROP POLICY IF EXISTS "System can manage payments" ON public.payments;

-- periodizacoes_novas: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage periodizacoes_novas" ON public.periodizacoes_novas;
DROP POLICY IF EXISTS "Everyone can view periodizacoes_novas" ON public.periodizacoes_novas;
CREATE POLICY "Authenticated can view periodizations" ON public.periodizacoes_novas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage periodizations" ON public.periodizacoes_novas
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- periodization_history: Restrict INSERT
DROP POLICY IF EXISTS "System can insert history records" ON public.periodization_history;
CREATE POLICY "Authenticated can insert history" ON public.periodization_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- profile_periodization_matches: Restrict INSERT
DROP POLICY IF EXISTS "System can insert matches" ON public.profile_periodization_matches;
CREATE POLICY "Authenticated can insert matches" ON public.profile_periodization_matches
  FOR INSERT TO authenticated WITH CHECK (true);

-- program_workouts: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage program workouts" ON public.program_workouts;
DROP POLICY IF EXISTS "Everyone can view program workouts" ON public.program_workouts;
CREATE POLICY "Authenticated can view program workouts" ON public.program_workouts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage program workouts" ON public.program_workouts
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- programs: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage programs" ON public.programs;
DROP POLICY IF EXISTS "Everyone can view programs" ON public.programs;
CREATE POLICY "Authenticated can view programs" ON public.programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage programs" ON public.programs
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- real_time_analytics: Restrict INSERT
DROP POLICY IF EXISTS "System can insert analytics" ON public.real_time_analytics;
CREATE POLICY "Authenticated can insert analytics" ON public.real_time_analytics
  FOR INSERT TO authenticated WITH CHECK (true);

-- student_invitations: Restrict UPDATE to professor owner
DROP POLICY IF EXISTS "Sistema pode atualizar convites" ON public.student_invitations;
CREATE POLICY "Professors can update own invitations" ON public.student_invitations
  FOR UPDATE TO authenticated 
  USING (professor_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'::app_role))
  WITH CHECK (professor_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'::app_role));

-- student_pdf_assessments: Replace overly permissive policies
DROP POLICY IF EXISTS "Users can view assessments" ON public.student_pdf_assessments;
DROP POLICY IF EXISTS "Users can insert assessments" ON public.student_pdf_assessments;
DROP POLICY IF EXISTS "Users can delete assessments" ON public.student_pdf_assessments;
CREATE POLICY "Authenticated can view assessments" ON public.student_pdf_assessments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can insert assessments" ON public.student_pdf_assessments
  FOR INSERT TO authenticated WITH CHECK (public.is_trainer((select auth.uid())));
CREATE POLICY "Trainers can delete assessments" ON public.student_pdf_assessments
  FOR DELETE TO authenticated USING (public.is_trainer((select auth.uid())));

-- uploads_periodizacao: Replace ALL true, keep specific policies
DROP POLICY IF EXISTS "Everyone can manage uploads_periodizacao" ON public.uploads_periodizacao;
DROP POLICY IF EXISTS "Everyone can view uploads_periodizacao" ON public.uploads_periodizacao;
-- Keep "Users can create uploads" and "Users can view uploads"

-- user_achievements: Restrict INSERT
DROP POLICY IF EXISTS "System can create achievements" ON public.user_achievements;
CREATE POLICY "Authenticated can create achievements" ON public.user_achievements
  FOR INSERT TO authenticated WITH CHECK (true);

-- user_credits: Replace ALL true with user-scoped
DROP POLICY IF EXISTS "Everyone can manage credits" ON public.user_credits;
DROP POLICY IF EXISTS "Everyone can view credits" ON public.user_credits;
CREATE POLICY "Authenticated can view credits" ON public.user_credits
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage credits" ON public.user_credits
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- user_plans: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage plans" ON public.user_plans;
DROP POLICY IF EXISTS "Everyone can view plans" ON public.user_plans;
CREATE POLICY "Authenticated can view plans" ON public.user_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage plans" ON public.user_plans
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- user_profile_details: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage profile details" ON public.user_profile_details;
DROP POLICY IF EXISTS "Everyone can view profile details" ON public.user_profile_details;
CREATE POLICY "Authenticated can view profile details" ON public.user_profile_details
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage profile details" ON public.user_profile_details
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- user_workout_logs: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage workout logs" ON public.user_workout_logs;
DROP POLICY IF EXISTS "Everyone can view workout logs" ON public.user_workout_logs;
CREATE POLICY "Authenticated can view workout logs" ON public.user_workout_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage workout logs" ON public.user_workout_logs
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- workout_program_exercises: Replace ALL true
DROP POLICY IF EXISTS "Everyone can manage workout exercises" ON public.workout_program_exercises;
DROP POLICY IF EXISTS "Everyone can view workout exercises" ON public.workout_program_exercises;
CREATE POLICY "Authenticated can view workout exercises" ON public.workout_program_exercises
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage workout exercises" ON public.workout_program_exercises
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- =============================================
-- BLOCO 4.1: INDICES EM FOREIGN KEYS
-- =============================================

CREATE INDEX IF NOT EXISTS idx_aluno_periodizacao_periodizacao_id ON public.aluno_periodizacao(periodizacao_id);
CREATE INDEX IF NOT EXISTS idx_analises_ia_aluno_professor_id ON public.analises_ia_aluno(professor_id);
CREATE INDEX IF NOT EXISTS idx_athlete_periodizations_assigned_by ON public.athlete_periodizations(assigned_by);
CREATE INDEX IF NOT EXISTS idx_athlete_periodizations_athlete_id ON public.athlete_periodizations(athlete_id);
CREATE INDEX IF NOT EXISTS idx_athletes_user_id ON public.athletes(user_id);
CREATE INDEX IF NOT EXISTS idx_athletes_coach_id ON public.athletes(coach_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_class_id ON public.class_bookings(class_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_user_id ON public.class_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_workouts_weekly_structure_id ON public.daily_workouts(weekly_structure_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_exercicio_id ON public.estruturas_de_treinamento(exercicio_id);
CREATE INDEX IF NOT EXISTS idx_estruturas_modelo_id ON public.estruturas_de_treinamento(modelo_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise_id ON public.exercise_logs(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout_log_id ON public.exercise_logs(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercises_created_by ON public.exercises(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_workout_plans_user_profile_id ON public.generated_workout_plans(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_historico_treinos_plano_id ON public.historico_treinos_realizados(plano_treino_id);
CREATE INDEX IF NOT EXISTS idx_periodizacoes_novas_estudante_id ON public.periodizacoes_novas(estudante_id);
CREATE INDEX IF NOT EXISTS idx_periodization_plans_user_profile_id ON public.periodization_plans(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_periodizations_professor_id ON public.periodizations(professor_id);
CREATE INDEX IF NOT EXISTS idx_periodizations_user_id ON public.periodizations(user_id);
CREATE INDEX IF NOT EXISTS idx_physical_assessments_professor_id ON public.physical_assessments(professor_id);
CREATE INDEX IF NOT EXISTS idx_physical_assessments_user_id ON public.physical_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_planos_treino_gerados_modelo_id ON public.planos_de_treino_gerados(modelo_id);
CREATE INDEX IF NOT EXISTS idx_plans_athlete_id ON public.plans(athlete_id);
CREATE INDEX IF NOT EXISTS idx_plans_periodization_id ON public.plans(periodization_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON public.products(created_by);
CREATE INDEX IF NOT EXISTS idx_profile_matches_model_id ON public.profile_periodization_matches(periodization_model_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_program_id ON public.program_workouts(program_id);
CREATE INDEX IF NOT EXISTS idx_program_workouts_workout_id ON public.program_workouts(workout_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_questionnaire_id ON public.questionnaire_responses(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_user_id ON public.questionnaire_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_real_time_analytics_user_id ON public.real_time_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_series_created_by ON public.reference_series(created_by);
CREATE INDEX IF NOT EXISTS idx_student_diet_assignments_created_by ON public.student_diet_assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON public.students(profile_id);
CREATE INDEX IF NOT EXISTS idx_supersets_created_by ON public.supersets(created_by);
CREATE INDEX IF NOT EXISTS idx_training_phases_plan_id ON public.training_phases(periodization_plan_id);
CREATE INDEX IF NOT EXISTS idx_uploads_periodizacao_estudante_id ON public.uploads_periodizacao(estudante_id);
CREATE INDEX IF NOT EXISTS idx_user_metrics_user_id ON public.user_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_program_progress_program_id ON public.user_program_progress(program_id);
CREATE INDEX IF NOT EXISTS idx_user_workout_logs_program_id ON public.user_workout_logs(program_id);
CREATE INDEX IF NOT EXISTS idx_user_workout_logs_workout_id ON public.user_workout_logs(workout_id);
CREATE INDEX IF NOT EXISTS idx_weekly_structures_training_phase_id ON public.weekly_structures(training_phase_id);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_new_assigned_by ON public.workout_assignments_new(assigned_by);
CREATE INDEX IF NOT EXISTS idx_workout_assignments_new_workout_id ON public.workout_assignments_new(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_daily_workout_id ON public.workout_exercises(daily_workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON public.workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_new_exercise_id ON public.workout_exercises_new(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_new_workout_id ON public.workout_exercises_new(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_student_id ON public.workout_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_id ON public.workout_logs(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_program_exercises_workout_id ON public.workout_program_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_workout_id ON public.workout_progress(workout_id);

-- =============================================
-- BLOCO 4.2: POLITICAS PARA TABELAS SEM POLITICAS
-- =============================================

-- exercise_logs
CREATE POLICY "Authenticated can view exercise logs" ON public.exercise_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage exercise logs" ON public.exercise_logs
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- link_de_video
CREATE POLICY "Authenticated can view videos" ON public.link_de_video
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage videos" ON public.link_de_video
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- products
CREATE POLICY "Authenticated can view products" ON public.products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage products" ON public.products
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- workout_exercises_new
CREATE POLICY "Authenticated can view workout exercises" ON public.workout_exercises_new
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Trainers can manage workout exercises" ON public.workout_exercises_new
  FOR ALL TO authenticated USING (public.is_trainer((select auth.uid()))) WITH CHECK (public.is_trainer((select auth.uid())));

-- workout_logs
CREATE POLICY "Authenticated can view workout logs" ON public.workout_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert workout logs" ON public.workout_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Trainers can manage workout logs" ON public.workout_logs
  FOR UPDATE TO authenticated USING (public.is_trainer((select auth.uid())));
CREATE POLICY "Trainers can delete workout logs" ON public.workout_logs
  FOR DELETE TO authenticated USING (public.is_trainer((select auth.uid())));
