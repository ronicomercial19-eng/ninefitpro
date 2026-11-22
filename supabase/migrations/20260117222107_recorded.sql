-- =====================================================
-- FASE 1: CONTRATO CANÔNICO DE DADOS (Correção)
-- =====================================================

-- 1. ENUMS PADRONIZADOS
-- =====================================================

-- Status universal para entidades
DO $$ BEGIN
  CREATE TYPE public.entity_status AS ENUM ('active', 'inactive', 'pending', 'archived', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de atribuição/assignment
DO $$ BEGIN
  CREATE TYPE public.assignment_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de execução/workout
DO $$ BEGIN
  CREATE TYPE public.execution_status AS ENUM ('not_started', 'in_progress', 'paused', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de evento para auditoria
DO $$ BEGIN
  CREATE TYPE public.event_type AS ENUM (
    'created', 'updated', 'deleted', 'assigned', 'started', 
    'completed', 'approved', 'rejected', 'notified', 'viewed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABELA DE EVENTOS CANÔNICA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type event_type NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_events_entity ON public.system_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_system_events_actor ON public.system_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON public.system_events(created_at DESC);

-- RLS
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can view all events"
    ON public.system_events FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Professors can view their events"
    ON public.system_events FOR SELECT
    TO authenticated
    USING (
      actor_id = auth.uid() OR 
      target_id = auth.uid() OR
      public.has_role(auth.uid(), 'professor')
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert events"
    ON public.system_events FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. VIEWS CANÔNICAS (Consolidação de duplicidades)
-- =====================================================

-- VIEW: Alunos Canônico (consolida athletes, alunos, estudantes)
CREATE OR REPLACE VIEW public.v_students_canonical AS
SELECT 
  a.id,
  a.coach_id AS professor_id,
  a.name AS nome,
  a.phone AS telefone,
  a.birthdate AS data_nascimento,
  a.gender AS genero,
  a.peso_kg,
  a.altura_cm,
  COALESCE(a.objetivo, a.primary_goal) AS objetivo,
  COALESCE(a.nivel, a.experience_level, a.training_level) AS nivel_experiencia,
  COALESCE(a.weekly_frequency, a.sessions_per_week) AS frequencia_semanal,
  a.training_environment AS ambiente_treino,
  a.injuries_limitations AS restricoes_medicas,
  a.metadata,
  a.activated AS ativo,
  a.user_id,
  a.created_at,
  a.updated_at
FROM public.athletes a;

-- VIEW: Avaliações Canônica (consolida avaliacoes, avaliacoes_fisicas, physical_assessments)
CREATE OR REPLACE VIEW public.v_assessments_canonical AS
SELECT 
  au.id,
  au.aluno_id AS athlete_id,
  au.data_avaliacao AS assessment_date,
  au.peso,
  au.altura,
  au.imc,
  au.gordura_corporal,
  au.massa_muscular,
  au.massa_magra,
  au.massa_gorda,
  au.circunferencia_braco,
  au.circunferencia_peitoral,
  au.circunferencia_cintura,
  au.circunferencia_quadril,
  au.circunferencia_coxa,
  au.circunferencia_panturrilha,
  au.rml_flexao,
  au.rml_agachamento,
  au.rml_abs,
  au.observacoes AS notes,
  au.avaliador_nome AS evaluator_name,
  au.origem AS source,
  au.created_at,
  au.updated_at
FROM public.avaliacoes_unificadas au;

-- VIEW: Periodizações Canônica
CREATE OR REPLACE VIEW public.v_periodizations_canonical AS
SELECT 
  p.id,
  p.professor_id,
  p.user_id AS athlete_id,
  p.title,
  p.description,
  p.duration,
  p.current_phase,
  p.total_phases,
  p.macrocycle,
  p.mesocycle,
  p.microcycle,
  p.graph_data,
  p.periodization_data,
  p.created_at,
  p.updated_at
FROM public.periodizations p;

-- VIEW: Atribuições Canônica
CREATE OR REPLACE VIEW public.v_assignments_canonical AS
SELECT 
  ap.id,
  ap.athlete_id,
  ap.periodization_model_id,
  ap.assigned_by AS professor_id,
  ap.assigned_at,
  ap.status,
  ap.match_percentage,
  ap.match_factors,
  ap.notes,
  ap.created_at
FROM public.athlete_periodizations ap;

-- 4. FUNÇÃO PARA REGISTRAR EVENTOS
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_event(
  p_event_type event_type,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_target_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.system_events (event_type, entity_type, entity_id, actor_id, target_id, metadata)
  VALUES (p_event_type, p_entity_type, p_entity_id, auth.uid(), p_target_id, p_metadata)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- 5. TRIGGER PARA EVENTOS AUTOMÁTICOS EM ATHLETES
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_athlete_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_event('created', 'athlete', NEW.id, NEW.coach_id, jsonb_build_object('name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.activated = false AND NEW.activated = true THEN
      PERFORM public.log_event('approved', 'athlete', NEW.id, NEW.coach_id, jsonb_build_object('name', NEW.name));
    ELSE
      PERFORM public.log_event('updated', 'athlete', NEW.id, NULL, jsonb_build_object('name', NEW.name));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_event('deleted', 'athlete', OLD.id, OLD.coach_id, jsonb_build_object('name', OLD.name));
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_athlete_events ON public.athletes;
CREATE TRIGGER tr_athlete_events
  AFTER INSERT OR UPDATE OR DELETE ON public.athletes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_athlete_events();

-- 6. TRIGGER PARA EVENTOS EM ATRIBUIÇÕES
-- =====================================================
CREATE OR REPLACE FUNCTION public.trigger_assignment_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_event('assigned', 'periodization', NEW.id::UUID, NEW.athlete_id, 
      jsonb_build_object('model_id', NEW.periodization_model_id, 'match', NEW.match_percentage));
      
    -- Criar notificação para o aluno
    INSERT INTO public.notifications (user_id, title, message, type, action_url)
    SELECT 
      a.user_id,
      'Nova Periodização Atribuída',
      'Seu professor atribuiu uma nova periodização de treino para você!',
      'info',
      '/student-dashboard'
    FROM public.athletes a
    WHERE a.id = NEW.athlete_id AND a.user_id IS NOT NULL;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.log_event(
        CASE NEW.status 
          WHEN 'completed' THEN 'completed'::event_type
          WHEN 'in_progress' THEN 'started'::event_type
          ELSE 'updated'::event_type
        END,
        'assignment', NEW.id::UUID, NEW.athlete_id,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS tr_assignment_events ON public.athlete_periodizations;
CREATE TRIGGER tr_assignment_events
  AFTER INSERT OR UPDATE ON public.athlete_periodizations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_assignment_events();

-- 7. COMENTÁRIOS MARCANDO TABELAS DEPRECATED
-- =====================================================
COMMENT ON TABLE public.alunos IS 'DEPRECATED: Use athletes table instead. Mantida para compatibilidade.';
COMMENT ON TABLE public.estudantes IS 'DEPRECATED: Use athletes table instead. Mantida para compatibilidade.';
COMMENT ON TABLE public.avaliacoes IS 'DEPRECATED: Use avaliacoes_unificadas instead.';
COMMENT ON TABLE public.avaliacoes_fisicas IS 'DEPRECATED: Use avaliacoes_unificadas instead.';
COMMENT ON TABLE public.historico_avaliacoes IS 'DEPRECATED: Use avaliacoes_unificadas instead.';
COMMENT ON TABLE public.aluno_periodizacao IS 'DEPRECATED: Use athlete_periodizations instead.';
COMMENT ON TABLE public.exercicios_novos IS 'DEPRECATED: Use exercises instead.';

-- 8. VIEW DE SAÚDE DO SISTEMA (usando colunas corretas)
-- =====================================================
CREATE OR REPLACE VIEW public.v_system_health AS
SELECT
  (SELECT COUNT(*) FROM public.athletes WHERE activated = true) AS active_athletes,
  (SELECT COUNT(*) FROM public.athlete_periodizations WHERE status = 'active') AS active_assignments,
  (SELECT COUNT(*) FROM public.workout_logs WHERE started_at > NOW() - INTERVAL '7 days') AS workouts_last_7_days,
  (SELECT COUNT(*) FROM public.system_events WHERE created_at > NOW() - INTERVAL '24 hours') AS events_last_24h,
  (SELECT COUNT(*) FROM public.notifications WHERE is_read = false) AS pending_notifications,
  NOW() AS checked_at;;
