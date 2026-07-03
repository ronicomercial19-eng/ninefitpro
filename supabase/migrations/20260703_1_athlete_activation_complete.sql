-- =============================================
-- MIGRATION: Complete athlete_activation schema
-- =============================================

-- 1) Confirmar estrutura completa (13 colunas)
CREATE TABLE IF NOT EXISTS public.athlete_activation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL UNIQUE REFERENCES public.athletes(id) ON DELETE CASCADE,
  
  -- Streak & Consistency
  days_active INT4 NOT NULL DEFAULT 0,           -- Dias ativos (streak)
  consistency_score INT4 NOT NULL DEFAULT 0,     -- 0-100, score de consistência
  
  -- Missions & Gamification
  missions_completed INT4 NOT NULL DEFAULT 0,    -- Total de missões completadas
  weekly_missions_completed INT4 NOT NULL DEFAULT 0, -- Missões desta semana
  monthly_missions_completed INT4 NOT NULL DEFAULT 0, -- Missões este mês
  
  -- Activity Tracking
  last_active_at TIMESTAMPTZ,                    -- Último check-in/treino
  last_streak_broken_at TIMESTAMPTZ,             -- Quando perdeu o streak
  
  -- Events & Milestones
  activation_events JSONB DEFAULT '[]'::jsonb,   -- Histórico de eventos (array)
  milestone_reached TEXT,                         -- Último milestone atingido
  
  -- Timestamps
  activated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentário descritivo
COMMENT ON TABLE public.athlete_activation IS 'Rastreia ativação, streak, missões e gamificação do atleta. Tela 8 - Missões e automações dependem desta tabela.';

-- 2) Enable RLS
ALTER TABLE public.athlete_activation ENABLE ROW LEVEL SECURITY;

-- 3) RLS Policies
DROP POLICY IF EXISTS "Athletes can view own activation" ON public.athlete_activation;
CREATE POLICY "Athletes can view own activation"
  ON public.athlete_activation
  FOR SELECT
  TO authenticated
  USING (
    athlete_id IN (
      SELECT a.id FROM athletes a WHERE a.user_id = auth.uid()
      UNION
      SELECT aal.athlete_id FROM athlete_auth_link aal WHERE aal.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Coaches can view athlete activation" ON public.athlete_activation;
CREATE POLICY "Coaches can view athlete activation"
  ON public.athlete_activation
  FOR SELECT
  TO authenticated
  USING (
    athlete_id IN (
      SELECT a.id FROM athletes a WHERE a.coach_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access" ON public.athlete_activation;
CREATE POLICY "Service role full access"
  ON public.athlete_activation
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4) Indexes para performance crítica
CREATE INDEX IF NOT EXISTS idx_athlete_activation_athlete_id 
  ON public.athlete_activation(athlete_id);

CREATE INDEX IF NOT EXISTS idx_athlete_activation_consistency_score 
  ON public.athlete_activation(consistency_score DESC);

CREATE INDEX IF NOT EXISTS idx_athlete_activation_days_active 
  ON public.athlete_activation(days_active DESC);

CREATE INDEX IF NOT EXISTS idx_athlete_activation_missions_completed 
  ON public.athlete_activation(missions_completed DESC);

CREATE INDEX IF NOT EXISTS idx_athlete_activation_last_active_at 
  ON public.athlete_activation(last_active_at DESC);

-- 5) Trigger para atualizar timestamp automático
DROP TRIGGER IF EXISTS trg_athlete_activation_updated_at ON public.athlete_activation;
CREATE TRIGGER trg_athlete_activation_updated_at
  BEFORE UPDATE ON public.athlete_activation
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_timestamp();

-- 6) Função: Incrementar missões ao completar
CREATE OR REPLACE FUNCTION public.fn_complete_mission(
  p_athlete_id UUID,
  p_mission_type TEXT DEFAULT 'default'
)
RETURNS TABLE (missions_completed INT4, weekly_count INT4, consistency_score INT4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_week_start DATE;
  v_current_month_start DATE;
BEGIN
  v_current_week_start := date_trunc('week', now())::DATE;
  v_current_month_start := date_trunc('month', now())::DATE;

  -- Ensure athlete activation exists
  INSERT INTO public.athlete_activation (athlete_id, activated_at)
  VALUES (p_athlete_id, now())
  ON CONFLICT (athlete_id) DO NOTHING;

  -- Increment counters
  UPDATE public.athlete_activation
  SET 
    missions_completed = missions_completed + 1,
    weekly_missions_completed = weekly_missions_completed + 1,
    monthly_missions_completed = monthly_missions_completed + 1,
    consistency_score = LEAST(100, consistency_score + 5),
    last_active_at = now(),
    activation_events = activation_events || 
      jsonb_build_array(
        jsonb_build_object(
          'type', 'mission_completed',
          'mission_type', p_mission_type,
          'at', now()::text
        )
      )
  WHERE athlete_id = p_athlete_id
  RETURNING 
    missions_completed, 
    weekly_missions_completed, 
    consistency_score;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_complete_mission(UUID, TEXT) TO authenticated, service_role;

-- 7) Função: Resetar contadores semanais/mensais (call via cron job)
CREATE OR REPLACE FUNCTION public.fn_reset_periodic_counters()
RETURNS TABLE (reset_count INT4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset weekly counters toda segunda-feira
  UPDATE public.athlete_activation
  SET weekly_missions_completed = 0
  WHERE EXTRACT(DOW FROM now()) = 1;

  -- Reset monthly counters no 1º do mês
  UPDATE public.athlete_activation
  SET monthly_missions_completed = 0
  WHERE EXTRACT(DAY FROM now()) = 1;

  RETURN QUERY SELECT COUNT(*)::INT4 FROM public.athlete_activation WHERE weekly_missions_completed = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_reset_periodic_counters() TO service_role;

-- 8) Função: Quebrar streak se não treinou há X dias
CREATE OR REPLACE FUNCTION public.fn_check_streak_break()
RETURNS TABLE (broken_count INT4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.athlete_activation
  SET 
    days_active = 0,
    last_streak_broken_at = now()
  WHERE 
    (last_active_at IS NULL OR last_active_at < (now() - INTERVAL '2 days'))
    AND days_active > 0;

  RETURN QUERY SELECT COUNT(*)::INT4 FROM public.athlete_activation WHERE days_active = 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_check_streak_break() TO service_role;

-- 9) Função: Incrementar streak se ativo hoje
CREATE OR REPLACE FUNCTION public.fn_increment_streak(p_athlete_id UUID)
RETURNS TABLE (new_days_active INT4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.athlete_activation
  SET 
    days_active = CASE 
      WHEN last_active_at::DATE = now()::DATE THEN days_active
      ELSE days_active + 1 
    END,
    last_active_at = now()
  WHERE athlete_id = p_athlete_id
  RETURNING days_active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_increment_streak(UUID) TO authenticated, service_role;

-- 10) Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_activation;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 11) Backfill existing athletes (sem ativação anterior)
INSERT INTO public.athlete_activation (athlete_id, activated_at)
SELECT a.id, a.created_at
FROM public.athletes a
WHERE a.id NOT IN (SELECT athlete_id FROM public.athlete_activation)
ON CONFLICT (athlete_id) DO NOTHING;
