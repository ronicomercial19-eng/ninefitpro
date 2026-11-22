
-- IMPLEMENTAÇÃO (21/11): esta função existia só como stub (BEGIN RETURN NEW; END),
-- conectada ao trigger trg_materializar_annual_plan_catalogo (BEFORE INSERT/UPDATE
-- em athlete_periodizations), mas nunca fazia nada. Resultado: todo aluno que
-- recebe um Plano Periodizado (plano anual, catálogo de 44 modelos) nunca ganha
-- uma smart_treino_macro_rules formal -- fica dependendo só do fallback de
-- sugestão de perfil em prescrever_treino, perdendo a frequência semanal e o
-- split de dias (micro_rules.weekly_split) definidos no plano anual.
--
-- Esta versão lê o plano anual (periodization_annual_plans, via NEW.annual_plan_id)
-- e materializa uma smart_treino_macro_rules real a partir de:
--  - weekly_frequency: contagem de dias de treino em micro_rules.weekly_split.dias
--  - rpe_target / reps_range / carga_inicial_percent: do primeiro mesociclo
--    (mesocycles ordenado por "mes")
--  - protocol_code: escolhido por annual_goal (hipertrofia/força/ambos/performance
--    -> grupo de protocolos 4; emagrecimento -> 5; bem-estar -> 9; resto -> 6 como
--    default seguro), ou um protocolo de cardio real quando running_distance não é
--    nulo (plano de corrida).
-- Nunca derruba o INSERT/UPDATE da periodização em si: qualquer erro é absorvido e
-- registrado em training_generation_failures (mesmo padrão de visibilidade já usado
-- pela geração semanal), em vez de silenciar com RAISE LOG como o resto da cadeia
-- faz hoje.
CREATE OR REPLACE FUNCTION public.fn_materializar_annual_plan_do_catalogo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan RECORD;
  v_mesociclo jsonb;
  v_professor_id uuid;
  v_weekly_frequency int;
  v_rpe_target numeric;
  v_reps_range text;
  v_carga_inicial numeric;
  v_protocol_id_grupo int;
  v_protocol RECORD;
BEGIN
  -- só materializa quando a periodização está realmente ativa e aponta pra um
  -- plano anual de verdade (esqueletos 'pending' do bootstrap nunca entram aqui).
  IF NEW.status NOT IN ('active','in_progress') OR NEW.annual_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_plan FROM public.periodization_annual_plans WHERE id = NEW.annual_plan_id;
  IF v_plan.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT coach_id INTO v_professor_id FROM public.athletes WHERE id = NEW.athlete_id;
  IF v_professor_id IS NULL THEN
    INSERT INTO public.training_generation_failures (id, athlete_id, workout_date, origin, sqlstate_code, detail, created_at)
    VALUES (gen_random_uuid(), NEW.athlete_id, NULL, 'materializar_annual_plan_do_catalogo', 'no_coach', 'Aluno sem coach_id -- não foi possível materializar macro_rules (professor_id é NOT NULL).', now());
    RETURN NEW;
  END IF;

  -- frequência semanal real do plano (quantidade de dias de treino no split),
  -- com fallback pro valor genérico de 4 só se o plano não tiver weekly_split.
  v_weekly_frequency := COALESCE(
    jsonb_array_length(v_plan.micro_rules->'weekly_split'->'dias'),
    4
  );
  IF v_weekly_frequency IS NULL OR v_weekly_frequency < 1 OR v_weekly_frequency > 7 THEN
    v_weekly_frequency := 4;
  END IF;

  -- primeiro mesociclo do plano (é onde o aluno está ao ser materializado)
  SELECT m INTO v_mesociclo
  FROM jsonb_array_elements(COALESCE(v_plan.mesocycles,'[]'::jsonb)) m
  ORDER BY COALESCE(NULLIF(regexp_replace(COALESCE(m->>'mes',''),'[^0-9]','','g'),'')::int, 1) ASC
  LIMIT 1;

  v_rpe_target := public.fn_extrair_rpe_cap(v_mesociclo->>'rpe_cap');
  v_reps_range := COALESCE(v_mesociclo->>'reps_range', '8-12');
  v_carga_inicial := COALESCE(
    (regexp_match(v_mesociclo->>'intensity_pct_1rm', '([0-9]+(?:\.[0-9]+)?)'))[1]::numeric,
    60.0
  );

  v_protocol_id_grupo := CASE lower(coalesce(v_plan.annual_goal,''))
    WHEN 'hipertrofia' THEN 4
    WHEN 'forca' THEN 4
    WHEN 'ambos' THEN 4
    WHEN 'performance' THEN 4
    WHEN 'emagrecimento' THEN 5
    WHEN 'bem-estar' THEN 9
    ELSE 6
  END;

  IF v_plan.running_distance IS NOT NULL THEN
    SELECT id, protocol_name, pillar, variation_name, model_description INTO v_protocol
    FROM public.smart_treino_protocols
    WHERE block_9_template->>'modality' = 'cardio'
      AND protocol_axis = 'Resistência periférica'
      AND COALESCE((block_9_template->>'requires_approval')::boolean, false) = false
    ORDER BY id LIMIT 1;
  ELSE
    SELECT id, protocol_name, pillar, variation_name, model_description INTO v_protocol
    FROM public.smart_treino_protocols
    WHERE protocol_id = v_protocol_id_grupo
      AND COALESCE((block_9_template->>'requires_approval')::boolean, false) = false
    ORDER BY id LIMIT 1;
  END IF;

  -- archiva qualquer macro ativa anterior antes de inserir a nova -- evita o
  -- problema de duas linhas 'active' concorrentes pro mesmo aluno (visto antes
  -- em outro aluno real do sistema).
  UPDATE public.smart_treino_macro_rules
  SET status = 'archived', updated_at = now()
  WHERE aluno_id = NEW.athlete_id AND status = 'active';

  INSERT INTO public.smart_treino_macro_rules (
    aluno_id, professor_id, macro_number, macro_objetivo,
    reps_range, rpe_target, weekly_frequency, carga_inicial_percent,
    protocol_code, pillar, protocol_name, variation_name, model_name, status
  ) VALUES (
    NEW.athlete_id, v_professor_id, 1, COALESCE(v_plan.annual_goal, 'Base técnica'),
    v_reps_range, v_rpe_target, v_weekly_frequency, v_carga_inicial,
    v_protocol.id, v_protocol.pillar, v_protocol.protocol_name, v_protocol.variation_name, v_protocol.model_description, 'active'
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.training_generation_failures (id, athlete_id, workout_date, origin, sqlstate_code, detail, created_at)
  VALUES (gen_random_uuid(), NEW.athlete_id, NULL, 'materializar_annual_plan_do_catalogo', SQLSTATE, SQLERRM, now());
  RETURN NEW;
END;
$function$;
;
