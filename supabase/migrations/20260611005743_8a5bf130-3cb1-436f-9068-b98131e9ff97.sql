
CREATE OR REPLACE VIEW public.vw_athlete_periodizacao_ativa
WITH (security_invoker = true) AS
WITH unified AS (
  SELECT
    ap.athlete_id,
    'athlete_periodizations'::text AS source,
    ap.id AS plan_id,
    COALESCE(pm.title, 'Periodização') AS plan_name,
    pm.macrocycle AS macrocycle,
    pm.mesocycle AS mesocycle,
    pm.microcycle AS microcycle,
    NULL::jsonb AS waves,
    ap.status,
    ap.assigned_at AS assigned_at,
    ap.periodization_model_id AS external_id
  FROM public.athlete_periodizations ap
  LEFT JOIN public.periodization_models pm ON pm.id = ap.periodization_model_id
  WHERE ap.status = 'active'

  UNION ALL

  SELECT
    ppr.athlete_id,
    'periodization_plans_remote'::text AS source,
    ppr.id AS plan_id,
    COALESCE(ppr.plan_name, 'SmartPeriodizer') AS plan_name,
    NULL::jsonb AS macrocycle,
    NULL::jsonb AS mesocycle,
    NULL::jsonb AS microcycle,
    ppr.waves,
    ppr.status,
    ppr.last_synced_at AS assigned_at,
    ppr.external_plan_id AS external_id
  FROM public.periodization_plans_remote ppr
  WHERE ppr.status = 'active' OR ppr.status IS NULL
)
SELECT DISTINCT ON (athlete_id)
  athlete_id, source, plan_id, plan_name,
  macrocycle, mesocycle, microcycle, waves,
  status, assigned_at, external_id
FROM unified
ORDER BY athlete_id, assigned_at DESC NULLS LAST;

GRANT SELECT ON public.vw_athlete_periodizacao_ativa TO authenticated, service_role;

-- Realtime: REPLICA IDENTITY FULL + add to publication
ALTER TABLE public.athlete_periodizations REPLICA IDENTITY FULL;
ALTER TABLE public.periodization_plans_remote REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_periodizations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.periodization_plans_remote;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END$$;
