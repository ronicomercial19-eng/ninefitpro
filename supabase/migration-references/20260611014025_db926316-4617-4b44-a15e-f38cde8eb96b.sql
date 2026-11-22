-- Extend vw_athlete_periodizacao_ativa to include periodization_annual_plans (SmartPeriodizer admin output)
-- and add it to realtime publication so the student app reflects updates instantly.

CREATE OR REPLACE VIEW public.vw_athlete_periodizacao_ativa
WITH (security_invoker=on) AS
WITH unified AS (
  SELECT ap.athlete_id,
         'athlete_periodizations'::text AS source,
         ap.id AS plan_id,
         COALESCE(pm.title, 'Periodização') AS plan_name,
         pm.macrocycle,
         pm.mesocycle,
         pm.microcycle,
         NULL::jsonb AS waves,
         ap.status,
         ap.assigned_at,
         ap.periodization_model_id::text AS external_id
  FROM athlete_periodizations ap
  LEFT JOIN periodization_models pm ON pm.id = ap.periodization_model_id
  WHERE ap.status = 'active'

  UNION ALL
  SELECT ppr.athlete_id,
         'periodization_plans_remote',
         ppr.id,
         COALESCE(ppr.plan_name, 'SmartPeriodizer'),
         NULL::jsonb, NULL::jsonb, NULL::jsonb,
         ppr.waves,
         ppr.status,
         ppr.last_synced_at,
         ppr.external_plan_id
  FROM periodization_plans_remote ppr
  WHERE ppr.status = 'active' OR ppr.status IS NULL

  UNION ALL
  -- SmartPeriodizer admin output (canonical source when professor publishes a plan)
  SELECT pap.athlete_id,
         'periodization_annual_plans',
         pap.id,
         COALESCE(NULLIF(pap.annual_goal, ''), 'Plano Anual SmartPeriodizer'),
         pap.macrocycles AS macrocycle,
         pap.mesocycles AS mesocycle,
         NULL::jsonb,
         -- Map mesocycles -> waves shape consumed by Planejamento.tsx
         (
           SELECT COALESCE(jsonb_agg(
             jsonb_build_object(
               'label', COALESCE(m->>'name', 'Onda ' || (idx + 1)::text),
               'week', idx + 1,
               'focus', COALESCE(m->>'type', m->>'focus'),
               'volume', CASE WHEN m ? 'sets_range' THEN 'Séries ' || (m->>'sets_range')
                              WHEN m ? 'sets' THEN 'Séries ' || (m->>'sets')
                              ELSE NULL END,
               'intensity', CASE WHEN m ? 'rpe_cap' THEN 'RPE ' || (m->>'rpe_cap')
                                 WHEN m ? 'rpe' THEN 'RPE ' || (m->>'rpe')
                                 ELSE NULL END,
               'pct', 0,
               'status', NULL
             )
             ORDER BY idx
           ), '[]'::jsonb)
           FROM jsonb_array_elements(COALESCE(pap.mesocycles, '[]'::jsonb)) WITH ORDINALITY AS t(m, idx)
         ) AS waves,
         pap.status,
         pap.updated_at AS assigned_at,
         pap.id::text
  FROM periodization_annual_plans pap
  WHERE pap.status = 'active' AND pap.athlete_id IS NOT NULL
)
SELECT DISTINCT ON (athlete_id)
  athlete_id, source, plan_id, plan_name,
  macrocycle, mesocycle, microcycle, waves,
  status, assigned_at, external_id
FROM unified
-- Prefer SmartPeriodizer admin > remote > internal model
ORDER BY athlete_id,
  CASE source
    WHEN 'periodization_annual_plans' THEN 1
    WHEN 'periodization_plans_remote' THEN 2
    ELSE 3
  END,
  assigned_at DESC NULLS LAST;

-- Realtime: ensure SmartPeriodizer admin updates are pushed to the student app
ALTER TABLE public.periodization_annual_plans REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='periodization_annual_plans'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.periodization_annual_plans';
  END IF;
END $$;