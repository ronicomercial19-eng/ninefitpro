/**
 * Migration: Auditoria de Falhas + Sincronização Automática de Planejamento
 * 
 * Objetivo:
 * 1. Tabela periodization_generation_failures para auditoria de erros
 * 2. Função sync_fitpro_planejamento() que espelha plano anual em fitpro_smartperiodizer_periodizations
 * 3. Trigger em athlete_periodizations que chama sync ao inserir/atualizar
 */

-- 1. Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.periodization_generation_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES public.athletes(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.periodization_annual_plans(id) ON DELETE SET NULL,
  assignment_id UUID REFERENCES public.athlete_periodizations(id) ON DELETE SET NULL,
  origin TEXT NOT NULL CHECK (origin IN ('trigger', 'edge', 'manual')),
  error_reason TEXT NOT NULL,
  error_detail JSONB DEFAULT '{}'::jsonb,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_periodization_failures_athlete_id ON periodization_generation_failures(athlete_id, created_at DESC);
CREATE INDEX idx_periodization_failures_origin ON periodization_generation_failures(origin, created_at DESC);

-- RLS
ALTER TABLE public.periodization_generation_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert failures" ON periodization_generation_failures
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin can read all failures" ON periodization_generation_failures
  FOR SELECT USING (auth.role() = 'service_role' OR auth.role() = 'admin');

-- 2. Função de sincronização: athletic_periodizations → fitpro_smartperiodizer_periodizations
CREATE OR REPLACE FUNCTION public.sync_fitpro_planejamento(p_athlete_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment record;
  v_plan record;
  v_payload jsonb;
  v_mesos jsonb;
  v_ondas jsonb;
  v_result jsonb;
BEGIN
  -- Buscar atribuição ativa
  SELECT ap.id, ap.athlete_id, ap.periodization_model_id, ap.status,
         pap.id as plan_id, pap.annual_goal, pap.dominant_profile, pap.scores,
         pap.flags, pap.selected_chief_id, pap.selected_model_id,
         pap.master_rules, pap.output_json, pap.macrocycles, pap.mesocycles
  INTO v_assignment, v_plan
  FROM public.athlete_periodizations ap
  LEFT JOIN public.periodization_annual_plans pap ON ap.periodization_model_id = pap.id
  WHERE ap.athlete_id = p_athlete_id AND ap.status IN ('active', 'in_progress')
  ORDER BY ap.assigned_at DESC
  LIMIT 1;

  IF v_assignment IS NULL THEN
    RAISE EXCEPTION 'No active periodization assignment for athlete %', p_athlete_id;
  END IF;

  -- Construir payload rico
  v_mesos := COALESCE(v_plan.mesocycles, '[]'::jsonb);
  v_ondas := jsonb_agg(
    jsonb_build_object(
      'nome', (mes->>'name') || ' ' || (mes->>'phase'),
      'phase', mes->>'phase',
      'semanas', (mes->>'weeks')::int
    )
  ) FROM jsonb_array_elements(v_mesos) AS mes;

  v_payload := jsonb_build_object(
    'annual_goal', COALESCE(v_plan.annual_goal, 'hipertrofia'),
    'dominant_profile', COALESCE(v_plan.dominant_profile, '{}'::jsonb),
    'scores', COALESCE(v_plan.scores, '{}'::jsonb),
    'flags', COALESCE(v_plan.flags, '[]'::jsonb),
    'selected_chief_id', v_plan.selected_chief_id,
    'selected_model_id', v_plan.selected_model_id,
    'master_rules', COALESCE(v_plan.master_rules, '{}'::jsonb),
    'output_json', COALESCE(v_plan.output_json, '{}'::jsonb),
    'macrocycles', COALESCE(v_plan.macrocycles, '[]'::jsonb),
    'mesocycles', v_mesos,
    'ondas', COALESCE(v_ondas, '[]'::jsonb)
  );

  -- UPSERT em fitpro_smartperiodizer_periodizations
  INSERT INTO public.fitpro_smartperiodizer_periodizations (
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
    v_plan.plan_id::text,
    COALESCE(v_plan.annual_goal, 'hipertrofia'),
    COALESCE((v_plan.dominant_profile->>'level')::text, 'intermediario'),
    COALESCE((v_mesos->0->>'phase')::text, 'Base'),
    'Base',
    1,
    'active',
    v_payload,
    now()
  )
  ON CONFLICT (fitpro_student_id) WHERE status = 'active'
  DO UPDATE SET
    smartperiodizer_periodization_id = EXCLUDED.smartperiodizer_periodization_id,
    goal = EXCLUDED.goal,
    training_level = EXCLUDED.training_level,
    current_phase = EXCLUDED.current_phase,
    payload = EXCLUDED.payload,
    updated_at = now();

  v_result := jsonb_build_object(
    'ok', true,
    'athlete_id', p_athlete_id,
    'plan_id', v_plan.plan_id,
    'synced_at', now()
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.periodization_generation_failures (
    athlete_id, plan_id, origin, error_reason, error_detail
  ) VALUES (
    p_athlete_id,
    v_plan.plan_id,
    'trigger',
    SQLERRM,
    jsonb_build_object('sqlstate', SQLSTATE, 'context', 'sync_fitpro_planejamento')
  );
  RAISE EXCEPTION 'Sync failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_fitpro_planejamento(uuid) TO authenticated, service_role;

-- 3. Trigger em athlete_periodizations para sincronizar automaticamente
CREATE OR REPLACE FUNCTION public.trigger_sync_fitpro_planejamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('active', 'in_progress') THEN
    PERFORM sync_fitpro_planejamento(NEW.athlete_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.periodization_generation_failures (
    athlete_id, assignment_id, origin, error_reason, error_detail
  ) VALUES (
    NEW.athlete_id,
    NEW.id,
    'trigger',
    SQLERRM,
    jsonb_build_object('sqlstate', SQLSTATE, 'trigger', 'trigger_sync_fitpro_planejamento')
  );
  RETURN NEW;  -- Não re-raise para não bloquear a atribuição
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_fitpro_planejamento_after_insert ON athlete_periodizations;

CREATE TRIGGER trigger_sync_fitpro_planejamento_after_insert
AFTER INSERT OR UPDATE ON athlete_periodizations
FOR EACH ROW
EXECUTE FUNCTION trigger_sync_fitpro_planejamento();

-- 4. Índice único filtrado em fitpro_smartperiodizer_periodizations para viabilizar UPSERT
CREATE UNIQUE INDEX idx_fitpro_smartperiodizer_active
ON fitpro_smartperiodizer_periodizations (fitpro_student_id)
WHERE status = 'active';

-- 5. Backfill: sincronizar todos os atletas com periodização ativa/in_progress
DO $$
DECLARE
  v_athlete uuid;
BEGIN
  FOR v_athlete IN
    SELECT DISTINCT athlete_id
    FROM athlete_periodizations
    WHERE status IN ('active', 'in_progress')
  LOOP
    PERFORM sync_fitpro_planejamento(v_athlete);
  END LOOP;
END;
$$;
