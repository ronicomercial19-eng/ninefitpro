
-- 1) daily_checkins
CREATE TABLE IF NOT EXISTS public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sono INT4 CHECK (sono BETWEEN 1 AND 5),
  energia INT4 CHECK (energia BETWEEN 1 AND 5),
  alimentacao INT4 CHECK (alimentacao BETWEEN 1 AND 5),
  dor INT4 CHECK (dor BETWEEN 1 AND 5),
  dor_local TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (athlete_id, checkin_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Athlete manages own daily checkin" ON public.daily_checkins;
CREATE POLICY "Athlete manages own daily checkin"
  ON public.daily_checkins FOR ALL
  TO authenticated
  USING (athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
         OR athlete_id IN (SELECT athlete_id FROM athlete_auth_link WHERE user_id = auth.uid()))
  WITH CHECK (athlete_id IN (SELECT id FROM athletes WHERE user_id = auth.uid())
              OR athlete_id IN (SELECT athlete_id FROM athlete_auth_link WHERE user_id = auth.uid()));

-- Enable realtime
ALTER TABLE public.daily_checkins REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_checkins;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.fn_salvar_checkin_diario(
  p_athlete_id UUID, p_sono INT4, p_energia INT4, p_alimentacao INT4, p_dor INT4, p_dor_local TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.daily_checkins (athlete_id, checkin_date, sono, energia, alimentacao, dor, dor_local)
  VALUES (p_athlete_id, CURRENT_DATE, p_sono, p_energia, p_alimentacao, p_dor, p_dor_local)
  ON CONFLICT (athlete_id, checkin_date) DO UPDATE SET
    sono = EXCLUDED.sono, energia = EXCLUDED.energia,
    alimentacao = EXCLUDED.alimentacao, dor = EXCLUDED.dor, dor_local = EXCLUDED.dor_local;

  PERFORM public.fn_complete_mission(p_athlete_id, 'daily_checkin');
  RETURN json_build_object('success', true, 'checkin_date', CURRENT_DATE);
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_salvar_checkin_diario(UUID, INT4, INT4, INT4, INT4, TEXT) TO authenticated, service_role;

-- 2) profile_reminder_dismissed + fn_dispensar_lembrete_perfil
ALTER TABLE public.athlete_activation
  ADD COLUMN IF NOT EXISTS profile_reminder_dismissed BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.fn_dispensar_lembrete_perfil(p_athlete_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.athlete_activation (athlete_id, profile_reminder_dismissed)
  VALUES (p_athlete_id, true)
  ON CONFLICT (athlete_id) DO UPDATE SET profile_reminder_dismissed = true;
  RETURN json_build_object('success', true);
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_dispensar_lembrete_perfil(UUID) TO authenticated, service_role;

-- 3) fn_check_onboarding_progress atualizada (mesma assinatura)
CREATE OR REPLACE FUNCTION public.fn_check_onboarding_progress(p_athlete_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_athlete RECORD; v_activation RECORD; v_treinos INT4; v_tem_plano BOOLEAN; v_prime BOOLEAN;
BEGIN
  SELECT name, age, peso_kg, altura_cm, avatar_url INTO v_athlete
  FROM public.athletes WHERE id = p_athlete_id;

  SELECT consistency_days, first_workout_at, profile_reminder_dismissed INTO v_activation
  FROM public.athlete_activation WHERE athlete_id = p_athlete_id;

  SELECT COUNT(*) INTO v_treinos FROM public.workout_executions
  WHERE athlete_id = p_athlete_id AND status = 'completed';

  SELECT EXISTS(SELECT 1 FROM public.daily_workouts WHERE athlete_id = p_athlete_id) INTO v_tem_plano;
  SELECT EXISTS(
    SELECT 1 FROM public.user_plans WHERE athlete_id = p_athlete_id AND is_active = true AND plan_type = 'prime'
  ) INTO v_prime;

  RETURN json_build_object(
    'perfil_completo', (v_athlete.name IS NOT NULL AND v_athlete.age IS NOT NULL
                         AND v_athlete.peso_kg IS NOT NULL AND v_athlete.altura_cm IS NOT NULL),
    'tem_foto', (v_athlete.avatar_url IS NOT NULL),
    'primeiro_treino', (v_treinos > 0),
    'tres_dias', (COALESCE(v_activation.consistency_days, 0) >= 3),
    'sete_dias', (COALESCE(v_activation.consistency_days, 0) >= 7),
    'tem_plano', v_tem_plano,
    'prime_ativo', COALESCE(v_prime, false),
    'mostrar_lembrete_perfil', (
      NOT (v_athlete.name IS NOT NULL AND v_athlete.age IS NOT NULL
           AND v_athlete.peso_kg IS NOT NULL AND v_athlete.altura_cm IS NOT NULL)
      AND NOT COALESCE(v_activation.profile_reminder_dismissed, false)
    )
  );
END; $$;

-- 4) fn_sugerir_protocolo_por_perfil
CREATE OR REPLACE FUNCTION public.fn_sugerir_protocolo_por_perfil(p_athlete_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_athlete RECORD; v_pillar TEXT; v_sugestao RECORD;
BEGIN
  SELECT primary_goal, experience_level INTO v_athlete
  FROM public.athletes WHERE id = p_athlete_id;

  v_pillar := CASE
    WHEN v_athlete.primary_goal ILIKE '%hipertrofia%' OR v_athlete.primary_goal ILIKE '%força%'
      OR v_athlete.primary_goal ILIKE '%estetica%' OR v_athlete.primary_goal ILIKE '%estética%' THEN 'estrutural'
    WHEN v_athlete.primary_goal ILIKE '%longevidade%' OR v_athlete.primary_goal ILIKE '%saude%'
      OR v_athlete.primary_goal ILIKE '%saúde%' OR v_athlete.primary_goal ILIKE '%bem-estar%' THEN 'longevidade'
    ELSE 'performance'
  END;

  SELECT id, protocol_name, pillar, variation_name, rpe_range INTO v_sugestao
  FROM public.smart_treino_protocols
  WHERE pillar = v_pillar
    AND (v_athlete.experience_level IS NULL OR recommended_for @> ARRAY[v_athlete.experience_level] OR recommended_for IS NULL)
  ORDER BY random() LIMIT 1;

  IF v_sugestao IS NULL THEN
    SELECT id, protocol_name, pillar, variation_name, rpe_range INTO v_sugestao
    FROM public.smart_treino_protocols WHERE pillar = v_pillar ORDER BY random() LIMIT 1;
  END IF;

  RETURN json_build_object(
    'has_suggestion', v_sugestao.id IS NOT NULL,
    'protocol_id', v_sugestao.id,
    'protocol_name', v_sugestao.protocol_name,
    'pillar', v_sugestao.pillar,
    'variation_name', v_sugestao.variation_name,
    'rpe_range', v_sugestao.rpe_range
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.fn_sugerir_protocolo_por_perfil(UUID) TO authenticated, service_role;
;
