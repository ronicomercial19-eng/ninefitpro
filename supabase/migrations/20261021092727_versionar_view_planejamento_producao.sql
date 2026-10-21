-- Snapshot of the normalized production view, captured on 2026-10-21.
-- Includes date-based current week, current mesocycle, normalized weeks,
-- interval-based waves and current-wave progress capped at 99.
-- No remote DDL or student data changes were performed for this export.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
CREATE OR REPLACE VIEW public.vw_athlete_periodizacao_ativa
WITH (security_invoker = true)
AS
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
            pm.macrocycle AS macrocycles_arr,
            pm.mesocycle AS mesocycles_arr,
            NULL::text AS annual_goal,
            NULL::jsonb AS micro_rules
           FROM athlete_periodizations ap
             LEFT JOIN periodization_models pm ON pm.id = ap.periodization_model_id
          WHERE ap.status = ANY (ARRAY['active'::text, 'in_progress'::text])
        UNION ALL
         SELECT ppr.athlete_id,
            'periodization_plans_remote'::text AS text,
            ppr.id,
            NULL::uuid AS uuid,
            COALESCE(ppr.plan_name, 'SmartPeriodizer'::text) AS "coalesce",
            NULL::jsonb AS jsonb,
            NULL::jsonb AS jsonb,
            NULL::jsonb AS jsonb,
            ppr.waves,
            ppr.status,
            ppr.last_synced_at,
            ppr.external_plan_id,
            NULL::jsonb AS jsonb,
            NULL::jsonb AS jsonb,
            NULL::jsonb AS jsonb,
            NULL::text AS text,
            NULL::jsonb AS jsonb
           FROM periodization_plans_remote ppr
          WHERE ppr.status = 'active'::text OR ppr.status IS NULL
        UNION ALL
         SELECT pap.athlete_id,
            'periodization_annual_plans'::text AS text,
            pap.id,
            pap.id,
            COALESCE(NULLIF(pap.annual_goal, ''::text), 'Plano Anual SmartPeriodizer'::text) AS "coalesce",
            pap.macrocycles,
            pap.mesocycles,
            NULL::jsonb AS jsonb,
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
                        END) ORDER BY t.idx), '[]'::jsonb) AS "coalesce"
                   FROM jsonb_array_elements(COALESCE(pap.mesocycles, '[]'::jsonb)) WITH ORDINALITY t(m, idx)) AS "coalesce",
            pap.status,
            pap.updated_at,
            pap.id::text AS id,
            pap.output_json,
            pap.macrocycles,
            pap.mesocycles,
            pap.annual_goal,
            pap.micro_rules
           FROM periodization_annual_plans pap
          WHERE pap.status = 'active'::text AND pap.athlete_id IS NOT NULL
        ), ranked AS (
         SELECT DISTINCT ON (unified.athlete_id) unified.athlete_id,
            unified.source,
            unified.plan_id,
            unified.annual_plan_id,
            unified.plan_name,
            unified.macrocycle,
            unified.mesocycle,
            unified.microcycle,
            unified.waves,
            unified.status,
            unified.assigned_at,
            unified.external_id,
            unified.output_json,
            unified.macrocycles_arr,
            unified.mesocycles_arr,
            unified.annual_goal,
            unified.micro_rules
           FROM unified
          ORDER BY unified.athlete_id, (
                CASE unified.source
                    WHEN 'periodization_annual_plans'::text THEN 1
                    WHEN 'periodization_plans_remote'::text THEN 2
                    ELSE 3
                END), unified.assigned_at DESC NULLS LAST
        ), with_snapshot AS (
         SELECT r.athlete_id,
            r.source,
            r.plan_id,
            r.annual_plan_id,
            r.plan_name,
            r.macrocycle,
            r.mesocycle,
            r.microcycle,
            r.waves,
            r.status,
            r.assigned_at,
            r.external_id,
            r.output_json,
            r.macrocycles_arr,
            r.mesocycles_arr,
            r.annual_goal,
            r.micro_rules,
            s.payload AS snap_payload,
            s.current_phase AS snap_phase,
            s.id AS snap_periodization_id
           FROM ranked r
             LEFT JOIN LATERAL ( SELECT p.id,
                    p.payload,
                    p.current_phase
                   FROM fitpro_smartperiodizer_periodizations p
                  WHERE p.fitpro_student_id = r.athlete_id AND p.status = 'active'::text
                  ORDER BY p.updated_at DESC
                 LIMIT 1) s ON true
        ), with_real_waves AS (
         SELECT ws.athlete_id,
            ws.source,
            ws.plan_id,
            ws.annual_plan_id,
            ws.plan_name,
            ws.macrocycle,
            ws.mesocycle,
            ws.microcycle,
            ws.waves,
            ws.status,
            ws.assigned_at,
            ws.external_id,
            ws.output_json,
            ws.macrocycles_arr,
            ws.mesocycles_arr,
            ws.annual_goal,
            ws.micro_rules,
            ws.snap_payload,
            ws.snap_phase,
            ws.snap_periodization_id,
            ( SELECT jsonb_agg(jsonb_build_object('label', w.wave_label, 'week', w.wave_order, 'focus', w.focus, 'status', w.status, 'pct', w.progress_pct) ORDER BY w.wave_order) AS jsonb_agg
                   FROM fitpro_smartperiodizer_waves w
                  WHERE w.smartperiodizer_periodization_id = ws.snap_periodization_id) AS real_waves
           FROM with_snapshot ws
        ), calc AS (
         SELECT c0.athlete_id,
            c0.source,
            c0.plan_id,
            c0.annual_plan_id,
            c0.plan_name,
            c0.macrocycle,
            c0.mesocycle,
            c0.microcycle,
            c0.waves,
            c0.status,
            c0.assigned_at,
            c0.external_id,
            c0.output_json,
            c0.macrocycles_arr,
            c0.mesocycles_arr,
            c0.annual_goal,
            c0.micro_rules,
            c0.snap_payload,
            c0.snap_phase,
            c0.snap_periodization_id,
            c0.real_waves,
            ( SELECT p.created_at
                   FROM fitpro_smartperiodizer_periodizations p
                  WHERE p.id = c0.snap_periodization_id) AS snap_started,
            COALESCE(( SELECT sum(COALESCE(NULLIF(e.value ->> 'weeks'::text, ''::text)::integer, 4)) AS sum
                   FROM jsonb_array_elements(
                        CASE
                            WHEN jsonb_typeof(c0.mesocycles_arr) = 'array'::text THEN c0.mesocycles_arr
                            ELSE '[]'::jsonb
                        END) e(value)), 0::bigint)::integer AS meso_weeks,
            COALESCE(( SELECT sum(
                        CASE
                            WHEN jsonb_typeof(e.value) = 'object'::text THEN COALESCE(NULLIF(e.value ->> 'weeks'::text, ''::text)::integer, NULLIF(e.value ->> 'duration_weeks'::text, ''::text)::integer, 4)
                            ELSE 4
                        END) AS sum
                   FROM jsonb_array_elements(
                        CASE
                            WHEN jsonb_typeof(c0.macrocycle) = 'array'::text THEN c0.macrocycle
                            ELSE '[]'::jsonb
                        END) e(value)), 0::bigint)::integer AS macro_weeks
           FROM with_real_waves c0
        ), calc2 AS (
         SELECT c.athlete_id,
            c.source,
            c.plan_id,
            c.annual_plan_id,
            c.plan_name,
            c.macrocycle,
            c.mesocycle,
            c.microcycle,
            c.waves,
            c.status,
            c.assigned_at,
            c.external_id,
            c.output_json,
            c.macrocycles_arr,
            c.mesocycles_arr,
            c.annual_goal,
            c.micro_rules,
            c.snap_payload,
            c.snap_phase,
            c.snap_periodization_id,
            c.real_waves,
            c.snap_started,
            c.meso_weeks,
            c.macro_weeks,
            LEAST(GREATEST(COALESCE(floor((CURRENT_DATE - c.snap_started::date)::numeric / 7.0)::integer + 1, NULLIF(COALESCE(c.output_json ->> 'cycle_week'::text, c.output_json ->> 'current_week'::text, c.output_json ->> 'week_index'::text), ''::text)::integer), 1), GREATEST(c.macro_weeks, c.meso_weeks, 1)) AS cw
           FROM calc c
        ), meso AS (
         SELECT c.athlete_id,
            e.m,
            e.ord,
            COALESCE(NULLIF(e.m ->> 'weeks'::text, ''::text)::integer, 4) AS w,
            (COALESCE(sum(COALESCE(NULLIF(e.m ->> 'weeks'::text, ''::text)::integer, 4)) OVER (PARTITION BY c.athlete_id ORDER BY e.ord ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0::bigint) + 1)::integer AS start_week
           FROM calc2 c,
            LATERAL jsonb_array_elements(
                CASE
                    WHEN jsonb_typeof(c.mesocycles_arr) = 'array'::text THEN c.mesocycles_arr
                    ELSE '[]'::jsonb
                END) WITH ORDINALITY e(m, ord)
        ), fin AS (
         SELECT c.athlete_id,
            c.source,
            c.plan_id,
            c.annual_plan_id,
            c.plan_name,
            c.macrocycle,
            c.mesocycle,
            c.microcycle,
            c.waves,
            c.status,
            c.assigned_at,
            c.external_id,
            c.output_json,
            c.macrocycles_arr,
            c.mesocycles_arr,
            c.annual_goal,
            c.micro_rules,
            c.snap_payload,
            c.snap_phase,
            c.snap_periodization_id,
            c.real_waves,
            c.snap_started,
            c.meso_weeks,
            c.macro_weeks,
            c.cw,
            COALESCE(( SELECT mm.m
                   FROM meso mm
                  WHERE mm.athlete_id = c.athlete_id AND mm.start_week <= c.cw
                  ORDER BY mm.start_week DESC
                 LIMIT 1), c.mesocycles_arr -> 0) AS curm
           FROM calc2 c
        )
 SELECT athlete_id,
    source,
    plan_id,
    plan_name,
        CASE
            WHEN jsonb_typeof(macrocycle) = 'array'::text THEN ( SELECT jsonb_agg(
                    CASE
                        WHEN jsonb_typeof(x.e) = 'object'::text THEN x.e || jsonb_build_object('weeks', COALESCE(NULLIF(x.e ->> 'weeks'::text, ''::text)::integer, NULLIF(x.e ->> 'duration_weeks'::text, ''::text)::integer, 4))
                        ELSE jsonb_build_object('name', split_part(TRIM(BOTH FROM x.e #>> '{}'::text[]), ':'::text, 1), 'weeks', 4, 'legacy_string', true)
                    END ORDER BY x.o) AS jsonb_agg
               FROM jsonb_array_elements(fin.macrocycle) WITH ORDINALITY x(e, o))
            ELSE macrocycle
        END AS macrocycle,
    mesocycle,
    microcycle,
        CASE
            WHEN COALESCE(real_waves, waves) IS NULL THEN NULL::jsonb
            ELSE ( SELECT jsonb_agg(x.rw || jsonb_build_object('weeks', COALESCE(mm.w, NULLIF(x.rw ->> 'weeks'::text, ''::text)::integer), 'start_week', COALESCE(mm.start_week, NULLIF(x.rw ->> 'start_week'::text, ''::text)::integer), 'end_week', COALESCE(mm.start_week + mm.w - 1, NULLIF(x.rw ->> 'end_week'::text, ''::text)::integer), 'volume', COALESCE(
                    CASE
                        WHEN mm.m ? 'sets_range'::text THEN 'Séries '::text || (mm.m ->> 'sets_range'::text)
                        ELSE NULL::text
                    END, x.rw ->> 'volume'::text), 'intensity', COALESCE(
                    CASE
                        WHEN mm.m ? 'rpe_cap'::text THEN 'RPE '::text || (mm.m ->> 'rpe_cap'::text)
                        ELSE NULL::text
                    END, x.rw ->> 'intensity'::text), 'status',
                    CASE
                        WHEN mm.w IS NULL THEN x.rw ->> 'status'::text
                        WHEN fin.cw > (mm.start_week + mm.w - 1) THEN 'completed'::text
                        WHEN fin.cw >= mm.start_week THEN 'current'::text
                        ELSE 'upcoming'::text
                    END, 'pct',
                    CASE
                        WHEN mm.w IS NULL THEN NULLIF(x.rw ->> 'pct'::text, ''::text)::numeric
                        WHEN fin.cw > (mm.start_week + mm.w - 1) THEN 100::numeric
                        WHEN fin.cw >= mm.start_week THEN LEAST(99::numeric, round((fin.cw - mm.start_week + 1)::numeric / mm.w::numeric * 100::numeric))
                        ELSE 0::numeric
                    END) ORDER BY x.o) AS jsonb_agg
               FROM jsonb_array_elements(COALESCE(fin.real_waves, fin.waves)) WITH ORDINALITY x(rw, o)
                 LEFT JOIN meso mm ON mm.athlete_id = fin.athlete_id AND mm.ord = x.o)
        END AS waves,
    status,
    assigned_at,
    external_id,
    COALESCE(output_json, snap_payload) AS output_json,
    cw AS current_week_index,
    curm AS current_meso,
        CASE
            WHEN jsonb_typeof(macrocycles_arr -> 0) = 'object'::text THEN macrocycles_arr -> 0
            WHEN (macrocycles_arr -> 0) IS NOT NULL THEN jsonb_build_object('name', split_part(TRIM(BOTH FROM macrocycles_arr ->> 0), ':'::text, 1), 'weeks', 4, 'legacy_string', true)
            ELSE NULL::jsonb
        END AS current_macro,
    COALESCE(curm ->> 'name'::text, curm ->> 'type'::text, curm ->> 'focus'::text, snap_phase) AS current_phase,
    COALESCE(fn_map_phase_category(curm ->> 'phase'::text), fn_map_phase_category(curm ->> 'category'::text), fn_map_phase_category(annual_goal), fn_map_phase_category(snap_phase), fn_map_phase_category(curm ->> 'type'::text), fn_map_phase_category(curm ->> 'focus'::text), 'geral'::text) AS current_phase_category,
    curm ->> 'rpe_cap'::text AS rpe_cap,
    curm ->> 'reps_range'::text AS reps_range,
    curm ->> 'sets_range'::text AS sets_range,
    (EXISTS ( SELECT 1
           FROM logs_sincronizacao ls
          WHERE ls.status = 'success'::text AND ls.created_at > (now() - '00:10:00'::interval))) AS sincronizado_recente,
    ( SELECT max(ls.created_at) AS max
           FROM logs_sincronizacao ls
          WHERE ls.status = 'success'::text) AS ultima_sincronizacao,
    curm ->> 'intensity_pct_1rm'::text AS intensity_pct_1rm,
    curm ->> 'frequencia_semanal_por_grupo'::text AS frequencia_semanal_grupo,
    micro_rules -> 'weekly_split'::text AS weekly_split,
    micro_rules -> 'detailed_microcycle'::text AS detailed_microcycle,
    micro_rules -> 'load_progression_rules'::text AS load_progression_rules,
    macro_weeks,
    meso_weeks
   FROM fin;
REVOKE ALL ON public.vw_athlete_periodizacao_ativa FROM PUBLIC, anon;
GRANT SELECT ON public.vw_athlete_periodizacao_ativa TO authenticated, service_role;
COMMIT;
