-- 1) Backfill: para cada periodization_annual_plans sem athlete_periodizations
INSERT INTO public.athlete_periodizations (
  athlete_id, assigned_by, periodization_model_id,
  match_percentage, status, notes, annual_plan_id, assigned_at, created_at
)
SELECT
  p.athlete_id,
  p.coach_id,
  COALESCE(p.selected_chief_id, p.selected_model_id, 'custom'),
  COALESCE((p.scores->>'global')::int, 80),
  'in_progress',
  'Backfill automatico - vinculo de plano anual',
  p.id,
  p.created_at,
  p.created_at
FROM public.periodization_annual_plans p
LEFT JOIN public.athlete_periodizations ap ON ap.annual_plan_id = p.id
WHERE ap.id IS NULL
  AND p.athlete_id IS NOT NULL;

-- 2) Trigger: ao inserir um plano anual, criar/atualizar athlete_periodizations automaticamente
CREATE OR REPLACE FUNCTION public.auto_link_annual_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- evitar duplicado se ja existir vinculo
  IF EXISTS (SELECT 1 FROM public.athlete_periodizations WHERE annual_plan_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.athlete_periodizations (
    athlete_id, assigned_by, periodization_model_id,
    match_percentage, status, notes, annual_plan_id, assigned_at, created_at
  ) VALUES (
    NEW.athlete_id,
    NEW.coach_id,
    COALESCE(NEW.selected_chief_id, NEW.selected_model_id, 'custom'),
    COALESCE((NEW.scores->>'global')::int, 80),
    'in_progress',
    'Auto-vinculado pelo trigger',
    NEW.id,
    NEW.created_at,
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_annual_plan ON public.periodization_annual_plans;
CREATE TRIGGER trg_auto_link_annual_plan
AFTER INSERT ON public.periodization_annual_plans
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_annual_plan();;
