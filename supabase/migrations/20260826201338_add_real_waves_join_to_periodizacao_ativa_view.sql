CREATE OR REPLACE VIEW vw_athlete_periodizacao_ativa AS
WITH unified AS (
  SELECT ap.athlete_id,
         'athlete_periodizations'::text AS source,
         ap.id AS plan_id,
         ap.annual_plan_id,
         COALESCE(pm.title, 'Periodização'::text) AS plan_name,
         pm.macrocycle,
         pm.mesocycle,
         pm.microcycle,
         NULL::jsonb AS waves,
         ap.status,
         ap.assigned_at,
         ap.periodization_model_id AS external_id,
         NULL::jsonb AS output_json,
         NULL::jsonb AS macrocycles_arr,
         NULL::jsonb AS mesocycles_arr
  FROM athlete_periodizations ap
  LEFT JOIN periodization_models pm ON pm.id = ap.periodization_model_id
  WHERE ap.status = ANY (ARRAY['active'::text, 'in_progress'::text])
  UNION ALL
  SELECT ppr.athlete_id,
         'periodization_plans_remote'::text AS source,
         ppr.id,
         NULL::uuid AS annual_plan_id,
         COALESCE(ppr.plan_name, 'SmartPeriodizer'::text) AS plan_name,
         NULL::jsonb AS macrocycle,
         NULL::jsonb AS mesocycle,
         NULL::jsonb AS microcycle,
         ppr.waves,
         ppr.status,
         ppr.last_synced_at,
         ppr.external_plan_id,
         NULL::jsonb AS output_json,
         NULL::jsonb AS macrocycles_arr,
         NULL::jsonb AS mesocycles_arr
  FROM periodization_plans_remote ppr
  WHERE ppr.status = 'active'::text OR ppr.status IS NULL
  UNION ALL
  SELECT pap.athlete_id,
         'periodization_annual_plans'::text AS source,
         pap.id,
         pap.id AS annual_plan_id,
         COALESCE(NULLIF(pap.annual_goal, ''::text), 'Plano Anual SmartPeriodizer'::text) AS plan_name,
         pap.macrocycles AS macrocycle,
         pap.mesocycles AS mesocycle,
         NULL::jsonb AS microcycle,
         ( SELECT COALESCE(jsonb_agg(jsonb_build_object('label', COALESCE(t.m ->> 'name'::text, 'Onda '::text || ((t.idx + 1)::text)), 'week', t.idx + 1, 'focus', COALESCE(t.m ->> 'type'::text, t.m ->> 'focus'::text), 'volume',
                  CASE
                      WHEN t.m ? 'sets_range'::text THEN 'Séries '::text || (t.m ->> 'sets_range'::text)
                      WHEN t.m ? 'sets'::text THEN 'Séries '::text || (t.m ->> 'sets'::text)
                      ELSE NULL::text
                  END, 'intensity',
                  CASE
                      WHEN t.m ? 'rpe_cap'::text THEN 'RPE '::text || (t.m ->> 'rpe_cap'::text)
                      WHEN t.m ? 'rpe'::text THEN 'RPE '::text || (t.m ->> 'rpe'::text)
                      ELSE NULL::text
                  END) ORDER BY t.idx), '[]'::jsonb)
          FROM jsonb_array_elements(COALESCE(pap.mesocycles, '[]'::jsonb)) WITH ORDINALITY t(m, idx)) AS waves,
         pap.status,
         pap.updated_at,
         pap.id::text AS external_id,
         pap.output_json,
         pap.macrocycles AS macrocycles_arr,
         pap.mesocycles AS mesocycles_arr
  FROM periodization_annual_plans pap
  WHERE pap.status = 'active'::text AND pap.athlete_id IS NOT NULL
), ranked AS (
  SELECT DISTINCT ON (unified.athlete_id) unified.athlete_id,
         unified.source, unified.plan_id, unified.annual_plan_id, unified.plan_name,
         unified.macrocycle, unified.mesocycle, unified.microcycle, unified.waves,
         unified.status, unified.assigned_at, unified.external_id, unified.output_json,
         unified.macrocycles_arr, unified.mesocycles_arr
  FROM unified
  ORDER BY unified.athlete_id,
    (CASE unified.source
        WHEN 'periodization_annual_plans'::text THEN 1
        WHEN 'periodization_plans_remote'::text THEN 2
        ELSE 3
     END),
    unified.assigned_at DESC NULLS LAST
), with_snapshot AS (
  SELECT r.athlete_id, r.source, r.plan_id, r.annual_plan_id, r.plan_name,
         r.macrocycle, r.mesocycle, r.microcycle, r.waves, r.status, r.assigned_at,
         r.external_id, r.output_json, r.macrocycles_arr, r.mesocycles_arr,
         s.payload AS snap_payload, s.current_phase AS snap_phase,
         NULLIF(s.current_cycle, ''::text)::integer AS snap_cycle,
         NULLIF(s.cycle_week::text, ''::text)::integer AS snap_cycle_week,
         s.id AS snap_periodization_id
  FROM ranked r
  LEFT JOIN LATERAL (
    SELECT fitpro_smartperiodizer_periodizations.id,
           fitpro_smartperiodizer_periodizations.payload,
           fitpro_smartperiodizer_periodizations.current_phase,
           fitpro_smartperiodizer_periodizations.current_cycle,
           fitpro_smartperiodizer_periodizations.cycle_week
    FROM fitpro_smartperiodizer_periodizations
    WHERE fitpro_smartperiodizer_periodizations.fitpro_student_id = r.athlete_id
      AND fitpro_smartperiodizer_periodizations.status = 'active'::text
    ORDER BY fitpro_smartperiodizer_periodizations.updated_at DESC
    LIMIT 1
  ) s ON true
), with_real_waves AS (
  SELECT ws.*,
    ( SELECT jsonb_agg(jsonb_build_object(
                'label', w.wave_label,
                'week', w.wave_order,
                'focus', w.focus,
                'status', w.status,
                'pct', w.progress_pct
             ) ORDER BY w.wave_order)
      FROM fitpro_smartperiodizer_waves w
      WHERE w.smartperiodizer_periodization_id = ws.snap_periodization_id
    ) AS real_waves
  FROM with_snapshot ws
)
SELECT athlete_id, source, plan_id, plan_name, macrocycle, mesocycle, microcycle,
    COALESCE(real_waves, waves) AS waves,
    status, assigned_at, external_id,
    COALESCE(output_json, snap_payload) AS output_json,
    COALESCE(NULLIF(COALESCE(output_json, snap_payload) ->> 'cycle_week'::text, ''::text)::integer, NULLIF(COALESCE(output_json, snap_payload) ->> 'current_week'::text, ''::text)::integer, NULLIF(COALESCE(output_json, snap_payload) ->> 'week_index'::text, ''::text)::integer, snap_cycle_week, 1) AS current_week_index,
    mesocycles_arr -> GREATEST(COALESCE(snap_cycle, 1) - 1, 0) AS current_meso,
    macrocycles_arr -> 0 AS current_macro,
    COALESCE(snap_phase, (mesocycles_arr -> 0) ->> 'type'::text, (mesocycles_arr -> 0) ->> 'focus'::text) AS current_phase,
    CASE lower(COALESCE(snap_phase, (mesocycles_arr -> 0) ->> 'type'::text, (mesocycles_arr -> 0) ->> 'focus'::text, ''::text))
        WHEN 'força'::text THEN 'strength'::text
        WHEN 'forca'::text THEN 'strength'::text
        WHEN 'strength'::text THEN 'strength'::text
        WHEN 'hipertrofia'::text THEN 'hypertrophy'::text
        WHEN 'hypertrophy'::text THEN 'hypertrophy'::text
        WHEN 'resistencia'::text THEN 'endurance'::text
        WHEN 'resistência'::text THEN 'endurance'::text
        WHEN 'endurance'::text THEN 'endurance'::text
        WHEN 'deload'::text THEN 'recovery'::text
        WHEN 'recovery'::text THEN 'recovery'::text
        ELSE 'geral'::text
    END AS current_phase_category,
    (mesocycles_arr -> 0) ->> 'rpe_cap'::text AS rpe_cap,
    (mesocycles_arr -> 0) ->> 'reps_range'::text AS reps_range,
    (mesocycles_arr -> 0) ->> 'sets_range'::text AS sets_range,
    (EXISTS ( SELECT 1 FROM logs_sincronizacao ls WHERE ls.status = 'success'::text AND ls.created_at > (now() - '00:10:00'::interval))) AS sincronizado_recente,
    ( SELECT max(ls.created_at) FROM logs_sincronizacao ls WHERE ls.status = 'success'::text) AS ultima_sincronizacao
FROM with_real_waves;;
