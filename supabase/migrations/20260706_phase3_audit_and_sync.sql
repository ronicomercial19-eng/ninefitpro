-- Phase 3: Auditoria de falhas + Sync automático de Planejamento
-- Este arquivo contém:
-- 1. Tabela periodization_generation_failures (auditoria)
-- 2. Tabela fitpro_smartperiodizer_periodizations (snapshot para FitPro)
-- 3. Função sync_fitpro_planejamento (espelha plano do backend para FitPro)
-- 4. Trigger em athlete_periodizations para chamar sync
-- 5. Índices necessários

-- ============================================================================
-- 1. TABELA DE AUDITORIA DE FALHAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.periodization_generation_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NULL REFERENCES public.athletes(id) ON DELETE SET NULL,
  plan_id uuid NULL REFERENCES public.periodization_annual_plans(id) ON DELETE SET NULL,
  assignment_id uuid NULL REFERENCES public.athlete_periodizations(id) ON DELETE SET NULL,
  origin text NOT NULL CHECK (origin IN ('trigger', 'edge', 'manual')),
  error_reason text NOT NULL,
  error_detail jsonb DEFAULT '{}'::jsonb,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_error_origin CHECK (origin IN ('trigger', 'edge', 'manual'))
);

-- Índices
CREATE INDEX idx_periodization_failures_athlete_created 
  ON public.periodization_generation_failures(athlete_id, created_at DESC);
CREATE INDEX idx_periodization_failures_origin_created 
  ON public.periodization_generation_failures(origin, created_at DESC);
CREATE INDEX idx_periodization_failures_plan_id 
  ON public.periodization_generation_failures(plan_id);

-- RLS
ALTER TABLE public.periodization_generation_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" 
  ON public.periodization_generation_failures
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admin_can_read_all" 
  ON public.periodization_generation_failures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users u 
      WHERE u.id = auth.uid() AND u.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "athlete_can_read_own" 
  ON public.periodization_generation_failures
  FOR SELECT USING (
    athlete_id IN (
      SELECT aal.athlete_id FROM public.athlete_auth_link aal 
      WHERE aal.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 2. TABELA SNAPSHOT FITPRO (fonte canônica para FitPro)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fitpro_smartperiodizer_periodizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fitpro_student_id uuid NOT NULL,
  smartperiodizer_periodization_id text NULL,
  goal text NULL,
  training_level text NULL,
  current_phase text NULL,
  current_cycle integer NULL,
  cycle_week integer DEFAULT 1,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'inactive')),
  payload jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_active_periodization UNIQUE (fitpro_student_id) WHERE status = 'active'
);

-- Índices
CREATE INDEX idx_fitpro_periodizations_student 
  ON public.fitpro_smartperiodizer_periodizations(fitpro_student_id, status);
CREATE INDEX idx_fitpro_periodizations_status 
  ON public.fitpro_smartperiodizer_periodizations(status);

-- RLS
ALTER TABLE public.fitpro_smartperiodizer_periodizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access" 
  ON public.fitpro_smartperiodizer_periodizations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 3. FUNÇÃO: sync_fitpro_planejamento
-- Sincroniza periodização anual para snapshot do FitPro
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_fitpro_planejamento(p_athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_active_assignment record;
  v_plan record;
  v_mesos jsonb;
  v_ondas jsonb;
  v_current_week integer;
  v_week_index integer;
BEGIN
  -- 1. Buscar atribuição ativa (in_progress ou active)
  SELECT ap.id, ap.annual_plan_id, ap.athlete_id
    INTO v_active_assignment
    FROM athlete_periodizations ap
   WHERE ap.athlete_id = p_athlete_id
     AND ap.status IN ('active', 'in_progress')
   ORDER BY ap.created_at DESC
   LIMIT 1;

  IF v_active_assignment IS NULL THEN
    -- Não há atribuição ativa; deixar status anterior (ou não fazer nada)
    RETURN;
  END IF;

  -- 2. Buscar plan detalhes
  SELECT id, athlete_id, annual_goal, dominant_profile, scores, flags,
         selected_chief_id, selected_model_id, master_rules, macrocycles,
         mesocycles, micro_rules, output_json, assessment_snapshot
    INTO v_plan
    FROM periodization_annual_plans
   WHERE id = v_active_assignment.annual_plan_id;

  IF v_plan IS NULL THEN
    INSERT INTO periodization_generation_failures (
      athlete_id, plan_id, assignment_id, origin, error_reason, error_detail
    ) VALUES (
      p_athlete_id, v_active_assignment.annual_plan_id, v_active_assignment.id,
      'trigger', 'Plan not found during sync_fitpro_planejamento',
      jsonb_build_object('step', 'fetch_plan')
    );
    RETURN;
  END IF;

  -- 3. Derivar semana atual e ondas
  v_current_week := COALESCE((v_plan.mesocycles->>0)::integer, 1);
  v_week_index := 1;

  -- Construir array de ondas a partir dos mesocycles
  v_ondas := COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'nome', COALESCE(meso->>'name', meso->>'phase', 'Onda ' || (row_number() OVER (ORDER BY idx))::text),
        'phase', meso->>'phase',
        'weeks', (meso->>'weeks')::integer,
        'status', CASE
          WHEN (row_number() OVER (ORDER BY idx))::integer < v_current_week THEN 'done'
          WHEN (row_number() OVER (ORDER BY idx))::integer = v_current_week THEN 'in_progress'
          ELSE 'pending'
        END
      )
      ORDER BY idx
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(COALESCE(v_plan.mesocycles, '[]'::jsonb)) WITH ORDINALITY AS t(meso, idx);

  -- 4. UPSERT em fitpro_smartperiodizer_periodizations
  INSERT INTO fitpro_smartperiodizer_periodizations (
    fitpro_student_id,
    smartperiodizer_periodization_id,
    goal,
    training_level,
    current_phase,
    current_cycle,
    cycle_week,
    status,
    payload,
    updated_at
  ) VALUES (
    p_athlete_id,
    v_plan.id::text,
    v_plan.annual_goal,
    v_plan.dominant_profile->>'level',
    v_plan.master_rules->>'current_phase',
    (v_plan.master_rules->>'current_cycle')::integer,
    v_current_week,
    'active',
    jsonb_build_object(
      'macrocycles', COALESCE(v_plan.macrocycles, '[]'::jsonb),
      'mesocycles', COALESCE(v_plan.mesocycles, '[]'::jsonb),
      'ondas', v_ondas,
      'master_rules', COALESCE(v_plan.master_rules, '{}'::jsonb),
      'output_json', COALESCE(v_plan.output_json, '{}'::jsonb),
      'annual_goal', v_plan.annual_goal,
      'dominant_profile', COALESCE(v_plan.dominant_profile, '{}'::jsonb),
      'scores', COALESCE(v_plan.scores, '{}'::jsonb),
      'flags', COALESCE(v_plan.flags, '[]'::jsonb),
      'selected_chief_id', v_plan.selected_chief_id,
      'selected_model_id', v_plan.selected_model_id
    ),
    now()
  )
  ON CONFLICT (fitpro_student_id) WHERE status = 'active'
  DO UPDATE SET
    smartperiodizer_periodization_id = EXCLUDED.smartperiodizer_periodization_id,
    goal = EXCLUDED.goal,
    training_level = EXCLUDED.training_level,
    current_phase = EXCLUDED.current_phase,
    current_cycle = EXCLUDED.current_cycle,
    cycle_week = EXCLUDED.cycle_week,
    payload = EXCLUDED.payload,
    updated_at = now();

  -- Log de sucesso opcional (comentado por default)
  -- RAISE NOTICE 'sync_fitpro_planejamento: athlete_id=%, plan_id=%, status=success', p_athlete_id, v_plan.id;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO periodization_generation_failures (
    athlete_id, plan_id, origin, error_reason, error_detail
  ) VALUES (
    p_athlete_id, COALESCE(v_plan.id, NULL),
    'trigger', SQLERRM,
    jsonb_build_object(
      'sqlstate', SQLSTATE,
      'step', 'sync_fitpro_planejamento_exception'
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_fitpro_planejamento(uuid) TO service_role;

-- ============================================================================
-- 4. TRIGGER: Chamar sync após atribuição de periodização
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_athlete_periodization_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('active', 'in_progress') THEN
    -- Desativar qualquer outra periodização para este atleta
    UPDATE athlete_periodizations
       SET status = 'archived'
     WHERE athlete_id = NEW.athlete_id
       AND id != NEW.id
       AND status IN ('active', 'in_progress');

    -- Chamar sync para FitPro
    PERFORM public.sync_fitpro_planejamento(NEW.athlete_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_athlete_periodization_change 
  ON athlete_periodizations;

CREATE TRIGGER trigger_athlete_periodization_change
  AFTER INSERT OR UPDATE ON athlete_periodizations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_athlete_periodization_change();

-- ============================================================================
-- 5. TRIGGER ENRIQUECIDO: Captura de erro em plano_treino_gerado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ensure_plano_treino_gerado_with_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  BEGIN
    -- Lógica original: inserir em planos_de_treino_gerados
    INSERT INTO planos_de_treino_gerados (
      athlete_id,
      annual_plan_id,
      assignment_id,
      status,
      data_geracao
    ) VALUES (
      NEW.athlete_id,
      NEW.annual_plan_id,
      NEW.id,
      'active',
      now()
    )
    ON CONFLICT (assignment_id) DO UPDATE
       SET status = 'active', data_geracao = now();

    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    -- Registrar falha de auditoria
    INSERT INTO periodization_generation_failures (
      athlete_id,
      plan_id,
      assignment_id,
      origin,
      error_reason,
      error_detail,
      payload
    ) VALUES (
      NEW.athlete_id,
      NEW.annual_plan_id,
      NEW.id,
      'trigger',
      SQLERRM,
      jsonb_build_object('sqlstate', SQLSTATE),
      to_jsonb(NEW)
    );

    -- NÃO re-raise: permitir que a atribuição prossiga
    RETURN NEW;
  END;
END;
$$;

DROP TRIGGER IF EXISTS trigger_ensure_plano_treino_gerado 
  ON athlete_periodizations;

CREATE TRIGGER trigger_ensure_plano_treino_gerado
  AFTER INSERT OR UPDATE ON athlete_periodizations
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_plano_treino_gerado_with_audit();

-- ============================================================================
-- 6. BACKFILL: Sincronizar todos os atletas com periodização ativa
-- ============================================================================

DO $$
DECLARE
  v_athlete_id uuid;
BEGIN
  FOR v_athlete_id IN
    SELECT DISTINCT ap.athlete_id
      FROM athlete_periodizations ap
     WHERE ap.status IN ('active', 'in_progress')
  LOOP
    PERFORM public.sync_fitpro_planejamento(v_athlete_id);
  END LOOP;
END;
$$;

-- ============================================================================
-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON TABLE public.periodization_generation_failures IS
'Auditoria de falhas ao gerar/sincronizar planejamentos. Registro de erro, origem (trigger/edge/manual), payload e stacktrace.';

COMMENT ON FUNCTION public.sync_fitpro_planejamento(uuid) IS
'Sincroniza periodização anual do atleta para snapshot em fitpro_smartperiodizer_periodizations, alimentando a aba Planejamento do FitPro. Chamada automaticamente via trigger ou manualmente via RPC na edge function.';
