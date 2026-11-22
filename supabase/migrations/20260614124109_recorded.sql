
DROP VIEW IF EXISTS public.vw_athlete_periodizacao_ativa CASCADE;

CREATE VIEW public.vw_athlete_periodizacao_ativa AS
WITH unified AS (
  SELECT ap.athlete_id,
    'athlete_periodizations'::text AS source,
    ap.id AS plan_id, ap.annual_plan_id,
    COALESCE(pm.title, 'Periodização'::text) AS plan_name,
    pm.macrocycle, pm.mesocycle, pm.microcycle,
    NULL::jsonb AS waves, ap.status, ap.assigned_at,
    ap.periodization_model_id AS external_id,
    NULL::jsonb AS output_json, NULL::jsonb AS macrocycles_arr, NULL::jsonb AS mesocycles_arr
  FROM athlete_periodizations ap
  LEFT JOIN periodization_models pm ON pm.id = ap.periodization_model_id
  WHERE ap.status IN ('active','in_progress')
  UNION ALL
  SELECT ppr.athlete_id, 'periodization_plans_remote', ppr.id, NULL::uuid,
    COALESCE(ppr.plan_name, 'SmartPeriodizer'),
    NULL::jsonb, NULL::jsonb, NULL::jsonb,
    ppr.waves, ppr.status, ppr.last_synced_at, ppr.external_plan_id,
    NULL::jsonb, NULL::jsonb, NULL::jsonb
  FROM periodization_plans_remote ppr
  WHERE ppr.status = 'active' OR ppr.status IS NULL
  UNION ALL
  SELECT pap.athlete_id, 'periodization_annual_plans', pap.id, pap.id,
    COALESCE(NULLIF(pap.annual_goal,''), 'Plano Anual SmartPeriodizer'),
    pap.macrocycles, pap.mesocycles, NULL::jsonb,
    (SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'label', COALESCE(t.m->>'name','Onda '||((t.idx+1)::text)),
        'week', t.idx+1,
        'focus', COALESCE(t.m->>'type', t.m->>'focus'),
        'volume', CASE WHEN t.m ? 'sets_range' THEN 'Séries '||(t.m->>'sets_range')
                       WHEN t.m ? 'sets' THEN 'Séries '||(t.m->>'sets') END,
        'intensity', CASE WHEN t.m ? 'rpe_cap' THEN 'RPE '||(t.m->>'rpe_cap')
                          WHEN t.m ? 'rpe' THEN 'RPE '||(t.m->>'rpe') END
      ) ORDER BY t.idx), '[]'::jsonb)
     FROM jsonb_array_elements(COALESCE(pap.mesocycles,'[]'::jsonb)) WITH ORDINALITY t(m,idx)),
    pap.status, pap.updated_at, pap.id::text,
    pap.output_json, pap.macrocycles, pap.mesocycles
  FROM periodization_annual_plans pap
  WHERE pap.status = 'active' AND pap.athlete_id IS NOT NULL
),
ranked AS (
  SELECT DISTINCT ON (athlete_id) *
  FROM unified
  ORDER BY athlete_id,
    CASE source WHEN 'periodization_annual_plans' THEN 1 WHEN 'periodization_plans_remote' THEN 2 ELSE 3 END,
    assigned_at DESC NULLS LAST
),
with_snapshot AS (
  SELECT r.*,
    s.payload AS snap_payload,
    s.current_phase::text AS snap_phase,
    NULLIF(s.current_cycle::text,'')::int AS snap_cycle,
    NULLIF(s.cycle_week::text,'')::int AS snap_cycle_week
  FROM ranked r
  LEFT JOIN LATERAL (
    SELECT payload, current_phase, current_cycle, cycle_week
    FROM public.fitpro_smartperiodizer_periodizations
    WHERE fitpro_student_id = r.athlete_id AND status = 'active'
    ORDER BY updated_at DESC LIMIT 1
  ) s ON true
)
SELECT
  athlete_id, source, plan_id, plan_name,
  macrocycle, mesocycle, microcycle, waves, status, assigned_at, external_id,
  COALESCE(output_json, snap_payload) AS output_json,
  COALESCE(
    NULLIF(COALESCE(output_json, snap_payload)->>'cycle_week','')::int,
    NULLIF(COALESCE(output_json, snap_payload)->>'current_week','')::int,
    NULLIF(COALESCE(output_json, snap_payload)->>'week_index','')::int,
    snap_cycle_week, 1
  ) AS current_week_index,
  (mesocycles_arr -> GREATEST(COALESCE(snap_cycle,1) - 1, 0)) AS current_meso,
  (macrocycles_arr -> 0) AS current_macro,
  COALESCE(snap_phase,
           mesocycles_arr -> 0 ->> 'type',
           mesocycles_arr -> 0 ->> 'focus') AS current_phase,
  CASE lower(COALESCE(snap_phase, mesocycles_arr->0->>'type', mesocycles_arr->0->>'focus',''))
    WHEN 'força' THEN 'strength' WHEN 'forca' THEN 'strength' WHEN 'strength' THEN 'strength'
    WHEN 'hipertrofia' THEN 'hypertrophy' WHEN 'hypertrophy' THEN 'hypertrophy'
    WHEN 'resistencia' THEN 'endurance' WHEN 'resistência' THEN 'endurance' WHEN 'endurance' THEN 'endurance'
    WHEN 'deload' THEN 'recovery' WHEN 'recovery' THEN 'recovery'
    ELSE 'geral'
  END AS current_phase_category,
  (mesocycles_arr -> 0 ->> 'rpe_cap') AS rpe_cap,
  (mesocycles_arr -> 0 ->> 'reps_range') AS reps_range,
  (mesocycles_arr -> 0 ->> 'sets_range') AS sets_range
FROM with_snapshot;

GRANT SELECT ON public.vw_athlete_periodizacao_ativa TO authenticated, anon, service_role;

ALTER TABLE public.athlete_periodizations REPLICA IDENTITY FULL;
ALTER TABLE public.periodization_annual_plans REPLICA IDENTITY FULL;
ALTER TABLE public.fitpro_smartperiodizer_periodizations REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.athlete_periodizations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.periodization_annual_plans; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.fitpro_smartperiodizer_periodizations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
;
