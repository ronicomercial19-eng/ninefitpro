-- fn_aplicar_protocolo_9x9x9 comparava goal_tags dos protocolos (português: hipertrofia, forca, funcional, longevidade...)
-- com exercises.goal (inglês: strength, endurance, power, hypertrophy): 0 exercícios casavam em qualquer protocolo,
-- então NINE/LIMA sempre devolvia sem_exercicios_compativeis. Agora há um mapa tag -> goals do acervo, e a escolha dos
-- 6 exercícios deixa de ser random(): round-robin pernas/empurrar/puxar/core com desempate estável por atleta+dia.
CREATE OR REPLACE FUNCTION public.fn_protocol_exercise_goals(p_tags text[])
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_tags IS NULL OR cardinality(p_tags) = 0 THEN NULL ELSE (
    SELECT array_agg(DISTINCT g) FROM unnest(p_tags) t, LATERAL unnest(CASE lower(t)
      WHEN 'hipertrofia' THEN ARRAY['strength','hypertrophy']
      WHEN 'estetica' THEN ARRAY['strength','hypertrophy']
      WHEN 'forca' THEN ARRAY['strength','power']
      WHEN 'emagrecimento' THEN ARRAY['strength','endurance']
      WHEN 'reabilitacao' THEN ARRAY['strength']
      WHEN 'funcional' THEN ARRAY['strength','endurance']
      WHEN 'longevidade' THEN ARRAY['strength','endurance']
      WHEN 'performance' THEN ARRAY['endurance','power','strength']
      WHEN 'cardio' THEN ARRAY['endurance']
      ELSE ARRAY['strength','endurance','power','hypertrophy'] END) g
  ) END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_pick_balanced_exercises(p_athlete_id uuid, p_date date, p_goals text[], p_limit integer)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT g.id FROM (
    SELECT f.id, f.grp, f.h, row_number() OVER (PARTITION BY f.grp ORDER BY f.h) AS rk
    FROM (
      SELECT x.id,
        (SELECT CASE
           WHEN bool_or(lower(m) ~ '(inferiores|glúteos|gluteos|isquio|quadr|perna)') THEN 'pernas'
           WHEN bool_or(lower(m) ~ '(peitoral|tríceps|triceps|deltoid|ombro)') THEN 'empurrar'
           WHEN bool_or(lower(m) ~ '(dorsal|latíssimo|latissimo|romboide|trapézio|trapezio|bíceps|biceps)') THEN 'puxar'
           WHEN bool_or(lower(m) ~ '(core|abdômen|abdomen|erector)') THEN 'core'
           ELSE 'outros' END
         FROM unnest(x.target_muscles) m) AS grp,
        hashtextextended(x.id::text || p_athlete_id::text || p_date::text, 0) AS h
      FROM public.exercises x
      WHERE x.video_url IS NOT NULL
        AND (p_goals IS NULL OR x.goal = ANY(p_goals))
        AND coalesce(x.equipment, '') <> 'Mobilidade'
    ) f
  ) g
  ORDER BY g.rk, CASE g.grp WHEN 'pernas' THEN 1 WHEN 'empurrar' THEN 2 WHEN 'puxar' THEN 3 WHEN 'core' THEN 4 ELSE 5 END, g.h
  LIMIT p_limit;
$function$;

DO $mig$
DECLARE d text;
BEGIN
  SELECT pg_get_functiondef('public.fn_aplicar_protocolo_9x9x9(uuid,text,date)'::regprocedure) INTO d;
  IF d NOT LIKE '%goal ILIKE ''%'' || tag || ''%''%' OR d NOT LIKE '%ORDER BY random() LIMIT 6%' THEN
    RAISE EXCEPTION 'fn_aplicar_protocolo_9x9x9 fora do estado esperado';
  END IF;
  d := replace(d, E'  v_daily_workout_id UUID;\nBEGIN', E'  v_daily_workout_id UUID;\n  v_goals text[];\nBEGIN');
  d := replace(d, E'  IF NOT public.fn_protocol_strength_compatible(p_protocol_id) THEN', E'  v_goals := public.fn_protocol_exercise_goals(v_protocolo.goal_tags);\n  IF NOT public.fn_protocol_strength_compatible(p_protocol_id) THEN');
  d := replace(d,
    E'    AND (v_protocolo.goal_tags IS NULL OR EXISTS (\n      SELECT 1 FROM unnest(v_protocolo.goal_tags) tag WHERE e.goal ILIKE ''%'' || tag || ''%''\n    ))',
    E'    AND (v_goals IS NULL OR e.goal = ANY(v_goals))');
  d := replace(d,
    E'  FROM (\n    SELECT id FROM public.exercises\n    WHERE video_url IS NOT NULL\n      AND (\n        v_protocolo.goal_tags IS NULL\n        OR EXISTS (\n          SELECT 1 FROM unnest(v_protocolo.goal_tags) AS tag\n          WHERE goal ILIKE ''%'' || tag || ''%''\n        )\n      )\n    ORDER BY random() LIMIT 6\n  ) ex;',
    E'  FROM (SELECT x AS id FROM public.fn_pick_balanced_exercises(p_athlete_id, p_data, v_goals, 6) AS x) ex;');
  IF d LIKE '%random()%' OR d LIKE '%ILIKE%' OR d NOT LIKE '%v_goals text[]%' THEN RAISE EXCEPTION 'substituicao falhou'; END IF;
  EXECUTE d;
END
$mig$;;
