CREATE OR REPLACE VIEW public.vw_athlete_periodizacao_ativa AS
 WITH unified AS (
         SELECT ap.athlete_id, 'athlete_periodizations'::text AS source, ap.id AS plan_id, ap.annual_plan_id,
            COALESCE(pm.title, 'Periodização'::text) AS plan_name, pm.macrocycle, pm.mesocycle, pm.microcycle,
            NULL::jsonb AS waves, ap.status, ap.assigned_at, ap.periodization_model_id AS external_id,
            NULL::jsonb AS output_json, pm.macrocycle AS macrocycles_arr, pm.mesocycle AS mesocycles_arr,
            NULL::text AS annual_goal, NULL::jsonb AS micro_rules
           FROM athlete_periodizations ap LEFT JOIN periodization_models pm ON pm.id = ap.periodization_model_id
          WHERE ap.status = ANY (ARRAY['active'::text, 'in_progress'::text])
        UNION ALL
         SELECT ppr.athlete_id, 'periodization_plans_remote'::text, ppr.id, NULL::uuid,
            COALESCE(ppr.plan_name, 'SmartPeriodizer'::text), NULL::jsonb, NULL::jsonb, NULL::jsonb,
            ppr.waves, ppr.status, ppr.last_synced_at, ppr.external_plan_id,
            NULL::jsonb, NULL::jsonb, NULL::jsonb, NULL::text, NULL::jsonb
           FROM periodization_plans_remote ppr WHERE ppr.status = 'active'::text OR ppr.status IS NULL
        UNION ALL
         SELECT pap.athlete_id, 'periodization_annual_plans'::text, pap.id, pap.id,
            COALESCE(NULLIF(pap.annual_goal, ''::text), 'Plano Anual SmartPeriodizer'::text),
            pap.macrocycles, pap.mesocycles, NULL::jsonb,
            ( SELECT COALESCE(jsonb_agg(jsonb_build_object('label', COALESCE(t.m ->> 'name', 'Onda ' || ((t.idx + 1)::text)), 'week', t.idx + 1, 'focus', COALESCE(t.m ->> 'type', t.m ->> 'focus'),
                  'volume', CASE WHEN t.m ? 'sets_range' THEN 'Séries ' || (t.m ->> 'sets_range') WHEN t.m ? 'sets' THEN 'Séries ' || (t.m ->> 'sets') ELSE NULL END,
                  'intensity', CASE WHEN t.m ? 'rpe_cap' THEN 'RPE ' || (t.m ->> 'rpe_cap') WHEN t.m ? 'rpe' THEN 'RPE ' || (t.m ->> 'rpe') ELSE NULL END) ORDER BY t.idx), '[]'::jsonb)
                   FROM jsonb_array_elements(COALESCE(pap.mesocycles, '[]'::jsonb)) WITH ORDINALITY t(m, idx)),
            pap.status, pap.updated_at, pap.id::text, pap.output_json, pap.macrocycles, pap.mesocycles, pap.annual_goal, pap.micro_rules
           FROM periodization_annual_plans pap WHERE pap.status = 'active'::text AND pap.athlete_id IS NOT NULL
        ), ranked AS (
         SELECT DISTINCT ON (unified.athlete_id) unified.*
           FROM unified
          ORDER BY unified.athlete_id, (CASE unified.source WHEN 'periodization_annual_plans' THEN 1 WHEN 'periodization_plans_remote' THEN 2 ELSE 3 END), unified.assigned_at DESC NULLS LAST
        ), with_snapshot AS (
         SELECT r.*, s.payload AS snap_payload, s.current_phase AS snap_phase, s.id AS snap_periodization_id
           FROM ranked r
             LEFT JOIN LATERAL ( SELECT p.id, p.payload, p.current_phase FROM fitpro_smartperiodizer_periodizations p
                  WHERE p.fitpro_student_id = r.athlete_id AND p.status = 'active' ORDER BY p.updated_at DESC LIMIT 1) s ON true
        ), with_real_waves AS (
         SELECT ws.*,
            ( SELECT jsonb_agg(jsonb_build_object('label', w.wave_label, 'week', w.wave_order, 'focus', w.focus, 'status', w.status, 'pct', w.progress_pct) ORDER BY w.wave_order)
                   FROM fitpro_smartperiodizer_waves w WHERE w.smartperiodizer_periodization_id = ws.snap_periodization_id) AS real_waves
           FROM with_snapshot ws
        ), calc AS (
         SELECT c0.*,
            (SELECT p.created_at FROM fitpro_smartperiodizer_periodizations p WHERE p.id = c0.snap_periodization_id) AS snap_started,
            COALESCE((SELECT sum(COALESCE(NULLIF(e ->> 'weeks','')::int, 4)) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c0.mesocycles_arr)='array' THEN c0.mesocycles_arr ELSE '[]'::jsonb END) e), 0)::int AS meso_weeks,
            COALESCE((SELECT sum(CASE WHEN jsonb_typeof(e)='object' THEN COALESCE(NULLIF(e ->> 'weeks','')::int, NULLIF(e ->> 'duration_weeks','')::int, 4) ELSE 4 END) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c0.macrocycle)='array' THEN c0.macrocycle ELSE '[]'::jsonb END) e), 0)::int AS macro_weeks
           FROM with_real_waves c0
        ), calc2 AS (
         SELECT c.*,
            LEAST(GREATEST(COALESCE(
               NULLIF(COALESCE(c.output_json ->> 'cycle_week', c.output_json ->> 'current_week', c.output_json ->> 'week_index'), '')::int,
               floor((current_date - c.snap_started::date) / 7.0)::int + 1), 1), GREATEST(c.macro_weeks, c.meso_weeks, 1))::int AS cw
           FROM calc c
        ), meso AS (
         SELECT c.athlete_id, e.m, e.ord, COALESCE(NULLIF(e.m ->> 'weeks','')::int, 4) AS w,
            (COALESCE(sum(COALESCE(NULLIF(e.m ->> 'weeks','')::int, 4)) OVER (PARTITION BY c.athlete_id ORDER BY e.ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) + 1)::int AS start_week
           FROM calc2 c, LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(c.mesocycles_arr)='array' THEN c.mesocycles_arr ELSE '[]'::jsonb END) WITH ORDINALITY e(m, ord)
        ), fin AS (
         SELECT c.*,
            COALESCE((SELECT mm.m FROM meso mm WHERE mm.athlete_id = c.athlete_id AND mm.start_week <= c.cw ORDER BY mm.start_week DESC LIMIT 1), c.mesocycles_arr -> 0) AS curm
           FROM calc2 c
        )
 SELECT athlete_id, source, plan_id, plan_name,
    CASE WHEN jsonb_typeof(macrocycle) = 'array' THEN ( SELECT jsonb_agg(
            CASE WHEN jsonb_typeof(x.e) = 'object' THEN x.e || jsonb_build_object('weeks', COALESCE(NULLIF(x.e ->> 'weeks','')::int, NULLIF(x.e ->> 'duration_weeks','')::int, 4))
                 ELSE jsonb_build_object('name', split_part(TRIM(BOTH FROM x.e #>> '{}'), ':', 1), 'weeks', 4, 'legacy_string', true) END ORDER BY x.o)
               FROM jsonb_array_elements(fin.macrocycle) WITH ORDINALITY x(e, o))
         ELSE macrocycle END AS macrocycle,
    mesocycle, microcycle,
    CASE WHEN COALESCE(real_waves, waves) IS NULL THEN NULL ELSE (
       SELECT jsonb_agg(x.rw || jsonb_build_object(
           'weeks', COALESCE(mm.w, NULLIF(x.rw ->> 'weeks','')::int),
           'start_week', COALESCE(mm.start_week, NULLIF(x.rw ->> 'start_week','')::int),
           'end_week', COALESCE(mm.start_week + mm.w - 1, NULLIF(x.rw ->> 'end_week','')::int),
           'volume', COALESCE(CASE WHEN mm.m ? 'sets_range' THEN 'Séries ' || (mm.m ->> 'sets_range') END, x.rw ->> 'volume'),
           'intensity', COALESCE(CASE WHEN mm.m ? 'rpe_cap' THEN 'RPE ' || (mm.m ->> 'rpe_cap') END, x.rw ->> 'intensity'),
           'status', CASE WHEN mm.w IS NULL THEN x.rw ->> 'status' WHEN fin.cw > mm.start_week + mm.w - 1 THEN 'completed' WHEN fin.cw >= mm.start_week THEN 'current' ELSE 'upcoming' END,
           'pct', CASE WHEN mm.w IS NULL THEN NULLIF(x.rw ->> 'pct','')::numeric WHEN fin.cw > mm.start_week + mm.w - 1 THEN 100 WHEN fin.cw >= mm.start_week THEN round((fin.cw - mm.start_week + 1)::numeric / mm.w * 100) ELSE 0 END
         ) ORDER BY x.o)
       FROM jsonb_array_elements(COALESCE(real_waves, waves)) WITH ORDINALITY x(rw, o)
       LEFT JOIN meso mm ON mm.athlete_id = fin.athlete_id AND mm.ord = x.o) END AS waves,
    status, assigned_at, external_id,
    COALESCE(output_json, snap_payload) AS output_json,
    cw AS current_week_index,
    curm AS current_meso,
    CASE WHEN jsonb_typeof(macrocycles_arr -> 0) = 'object' THEN macrocycles_arr -> 0
         WHEN (macrocycles_arr -> 0) IS NOT NULL THEN jsonb_build_object('name', split_part(TRIM(BOTH FROM macrocycles_arr ->> 0), ':', 1), 'weeks', 4, 'legacy_string', true)
         ELSE NULL::jsonb END AS current_macro,
    COALESCE(curm ->> 'name', curm ->> 'type', curm ->> 'focus', snap_phase) AS current_phase,
    COALESCE(fn_map_phase_category(curm ->> 'phase'), fn_map_phase_category(curm ->> 'category'), fn_map_phase_category(annual_goal), fn_map_phase_category(snap_phase), fn_map_phase_category(curm ->> 'type'), fn_map_phase_category(curm ->> 'focus'), 'geral') AS current_phase_category,
    curm ->> 'rpe_cap' AS rpe_cap, curm ->> 'reps_range' AS reps_range, curm ->> 'sets_range' AS sets_range,
    (EXISTS ( SELECT 1 FROM logs_sincronizacao ls WHERE ls.status = 'success' AND ls.created_at > (now() - '00:10:00'::interval))) AS sincronizado_recente,
    ( SELECT max(ls.created_at) FROM logs_sincronizacao ls WHERE ls.status = 'success') AS ultima_sincronizacao,
    curm ->> 'intensity_pct_1rm' AS intensity_pct_1rm,
    curm ->> 'frequencia_semanal_por_grupo' AS frequencia_semanal_grupo,
    micro_rules -> 'weekly_split' AS weekly_split,
    micro_rules -> 'detailed_microcycle' AS detailed_microcycle,
    micro_rules -> 'load_progression_rules' AS load_progression_rules,
    macro_weeks, meso_weeks
   FROM fin;;
