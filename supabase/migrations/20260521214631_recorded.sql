CREATE UNIQUE INDEX IF NOT EXISTS uq_athlete_periodizations_annual_plan_id
ON public.athlete_periodizations (annual_plan_id)
WHERE annual_plan_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.auto_link_annual_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.athlete_periodizations (
    athlete_id,
    assigned_by,
    periodization_model_id,
    match_percentage,
    status,
    notes,
    annual_plan_id,
    assigned_at,
    created_at
  ) VALUES (
    NEW.athlete_id,
    NEW.coach_id,
    COALESCE(NEW.selected_chief_id, NEW.selected_model_id, 'custom'),
    COALESCE(NULLIF(NEW.scores->>'global', '')::int, 80),
    'in_progress',
    'Auto-vinculado pelo SmartPeriodizer',
    NEW.id,
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (annual_plan_id) WHERE annual_plan_id IS NOT NULL
  DO UPDATE SET
    athlete_id = EXCLUDED.athlete_id,
    assigned_by = EXCLUDED.assigned_by,
    periodization_model_id = EXCLUDED.periodization_model_id,
    match_percentage = EXCLUDED.match_percentage,
    status = CASE
      WHEN public.athlete_periodizations.status IN ('completed', 'cancelled') THEN public.athlete_periodizations.status
      ELSE EXCLUDED.status
    END,
    notes = EXCLUDED.notes,
    assigned_at = COALESCE(public.athlete_periodizations.assigned_at, EXCLUDED.assigned_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_annual_plan ON public.periodization_annual_plans;
CREATE TRIGGER trg_auto_link_annual_plan
AFTER INSERT OR UPDATE OF athlete_id, coach_id, selected_chief_id, selected_model_id, scores, status
ON public.periodization_annual_plans
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_annual_plan();

DROP POLICY IF EXISTS "Students can view own athlete periodizations" ON public.athlete_periodizations;
CREATE POLICY "Students can view own athlete periodizations"
ON public.athlete_periodizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.athletes a
    WHERE a.id = athlete_periodizations.athlete_id
      AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.athlete_auth_link aal
    WHERE aal.athlete_id = athlete_periodizations.athlete_id
      AND aal.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Linked athletes can view own annual plans" ON public.periodization_annual_plans;
CREATE POLICY "Linked athletes can view own annual plans"
ON public.periodization_annual_plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.athlete_auth_link aal
    WHERE aal.athlete_id = periodization_annual_plans.athlete_id
      AND aal.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Professors and admins can manage athlete periodizations" ON public.athlete_periodizations;
CREATE POLICY "Professors and admins can manage athlete periodizations"
ON public.athlete_periodizations
FOR ALL
TO authenticated
USING (
  assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
)
WITH CHECK (
  assigned_by = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_trainer(auth.uid())
);;
