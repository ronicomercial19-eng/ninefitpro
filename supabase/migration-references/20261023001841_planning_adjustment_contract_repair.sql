CREATE OR REPLACE FUNCTION public.fn_publicar_ajuste_treino_dia(p_athlete_id uuid, p_data date, p_daily_workout_id uuid, p_expected_updated_at timestamp with time zone, p_changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_workout public.daily_workouts%rowtype;
  v_change jsonb;
  v_row public.workout_exercises%rowtype;
  v_replacement uuid;
  v_before jsonb;
  v_after jsonb;
  v_exercises jsonb;
  v_dose text;
  v_saved_at timestamptz;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) or not (
    exists (select 1 from public.athletes a where a.id = p_athlete_id
      and (a.user_id = auth.uid() or a.coach_id = auth.uid()))
    or exists (select 1 from public.athlete_auth_link l
      where l.athlete_id = p_athlete_id and l.user_id = auth.uid())
  ) then raise exception 'Acesso ao aluno não autorizado' using errcode = '42501'; end if;
  if p_data is null or p_data < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Ajuste apenas a sessão de hoje ou uma sessão futura';
  end if;
  if not exists(select 1 from public.athletes a where a.id=p_athlete_id and a.coach_id=auth.uid())
     and exists(select 1 from public.daily_checkins c where c.athlete_id=p_athlete_id
       and c.checkin_date=(now() at time zone 'America/Sao_Paulo')::date
       and (c.dor>=3 or nullif(btrim(c.dor_local),'') is not null)) then
    raise exception 'Revisão profissional necessária antes de publicar ajustes' using errcode='42501';
  end if;
  if p_changes is null or jsonb_typeof(p_changes) <> 'array'
     or jsonb_array_length(p_changes) not between 1 and 100 then
    raise exception 'Lista de alterações inválida';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_athlete_id::text || p_data::text, 0));
  select * into v_workout from public.daily_workouts
    where id = p_daily_workout_id and athlete_id = p_athlete_id and workout_date = p_data
    for update;
  if not found then raise exception 'Treino não encontrado para este aluno e data'; end if;
  if v_workout.updated_at is distinct from p_expected_updated_at then
    raise exception 'A prescrição mudou desde a abertura da tela. Recarregue antes de publicar.';
  end if;
  if exists (select 1 from public.workout_executions e
    where e.athlete_id = p_athlete_id and e.workout_date = p_data
      and e.status in ('started','in_progress','paused','completed','skipped')) then
    raise exception 'Este treino já foi iniciado. Preserve a execução e ajuste uma sessão futura.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(we) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_before from public.workout_exercises we where we.daily_workout_id = v_workout.id;

  for v_change in select value from jsonb_array_elements(p_changes) loop
    if jsonb_typeof(v_change) <> 'object' or nullif(v_change->>'workout_exercise_id','') is null then
      raise exception 'Identificador de exercício ausente';
    end if;
    select * into v_row from public.workout_exercises
      where id = (v_change->>'workout_exercise_id')::uuid and daily_workout_id = v_workout.id for update;
    if not found then raise exception 'Exercício não pertence ao treino'; end if;
    if v_change ? 'sets' and ((v_change->>'sets')::int not between 1 and 10) then
      raise exception 'Séries inválidas'; end if;
    if v_change ? 'rest_seconds' and ((v_change->>'rest_seconds')::int not between 0 and 600) then
      raise exception 'Descanso inválido'; end if;
    if v_change ? 'intensidade' and ((v_change->>'intensidade')::int not between 1 and 10) then
      raise exception 'Intensidade inválida'; end if;
    v_dose := trim(coalesce(v_change->>'reps_range', v_row.reps_range));
    if length(v_dose) not between 1 and 40 or
       (v_dose ~ '^[0-9]+$' and v_dose::numeric >= 100) then
      raise exception 'Dose ambígua. Informe a unidade, por exemplo 400 m ou 40 s.';
    end if;
    v_replacement := null;
    if nullif(trim(v_change->>'new_exercise_name'),'') is not null then
      select e.id into v_replacement from public.exercises e
        where lower(e.name) = lower(trim(v_change->>'new_exercise_name')) order by e.id limit 1;
      if v_replacement is null then raise exception 'Exercício substituto não encontrado na biblioteca'; end if;
    end if;
    update public.workout_exercises set
      exercise_id = coalesce(v_replacement, exercise_id),
      sets = coalesce((v_change->>'sets')::int, sets),
      reps_range = v_dose,
      rest_seconds = coalesce((v_change->>'rest_seconds')::int, rest_seconds),
      rpe_target = coalesce((v_change->>'intensidade')::int, rpe_target),
      override_locked = true
    where id = v_row.id;
  end loop;

  select coalesce(jsonb_agg(to_jsonb(we) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_after from public.workout_exercises we where we.daily_workout_id = v_workout.id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', we.id, 'exercise_id', we.exercise_id, 'exercise_name', e.name,
      'sets', we.sets, 'reps_range', we.reps_range,
      'rest_seconds', we.rest_seconds, 'intensidade', we.rpe_target,
      'video_url', e.video_url, 'exercise_order', we.exercise_order
    ) order by we.exercise_order, we.id), '[]'::jsonb)
    into v_exercises from public.workout_exercises we
    left join public.exercises e on e.id = we.exercise_id
    where we.daily_workout_id = v_workout.id;

  update public.daily_workouts set
    changes_json = jsonb_build_object('exercises', v_exercises),
    override_locked = true, updated_at = clock_timestamp()
    where id = v_workout.id returning updated_at into v_saved_at;
  insert into public.workout_adjustment_versions
    (daily_workout_id, athlete_id, changed_by, before_exercises, after_exercises)
    values (v_workout.id, p_athlete_id, auth.uid(), v_before, v_after);
  return jsonb_build_object('success', true, 'daily_workout_id', v_workout.id,
    'exercises', v_exercises, 'updated_at', v_saved_at);
end;
$function$;

REVOKE ALL ON FUNCTION public.fn_publicar_ajuste_treino_dia(uuid,date,uuid,timestamptz,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_publicar_ajuste_treino_dia(uuid,date,uuid,timestamptz,jsonb) TO authenticated;
CREATE OR REPLACE VIEW public.vw_athlete_periodizacao_ativa WITH (security_invoker=true) AS
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
            coalesce(ppr.raw_payload->'macrocycles',ppr.raw_payload->'macrocycle',case when ppr.total_weeks>0 then jsonb_build_array(jsonb_build_object('name',coalesce(ppr.plan_name,'Plano sincronizado'),'weeks',ppr.total_weeks)) else '[]'::jsonb end),
            coalesce(ppr.raw_payload->'mesocycles',ppr.raw_payload->'mesocycle','[]'::jsonb),
            ppr.raw_payload->'microcycle',
            ppr.waves,
            ppr.status,
            ppr.last_synced_at,
            ppr.external_plan_id,
            coalesce(ppr.raw_payload,'{}'::jsonb)||jsonb_build_object('current_week',ppr.current_week),
            coalesce(ppr.raw_payload->'macrocycles',ppr.raw_payload->'macrocycle',case when ppr.total_weeks>0 then jsonb_build_array(jsonb_build_object('name',coalesce(ppr.plan_name,'Plano sincronizado'),'weeks',ppr.total_weeks)) else '[]'::jsonb end),
            coalesce(ppr.raw_payload->'mesocycles',ppr.raw_payload->'mesocycle','[]'::jsonb),
            NULL::text AS text,
            ppr.raw_payload->'micro_rules'
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
          ORDER BY unified.athlete_id, CASE WHEN unified.source = 'athlete_periodizations' THEN 1 ELSE 0 END, unified.assigned_at DESC NULLS LAST, (
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
                  WHERE p.fitpro_student_id = r.athlete_id AND p.status = 'active'::text AND r.source <> 'periodization_plans_remote'
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
