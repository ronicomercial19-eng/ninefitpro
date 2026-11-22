-- 1) fn_consume_credit: credits_remaining é coluna GERADA; não pode ser escrita
CREATE OR REPLACE FUNCTION public.fn_consume_credit(p_athlete_id uuid, p_amount integer DEFAULT 1, p_reason text DEFAULT 'ai_action'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining integer;
BEGIN
  INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, plan_type)
  VALUES (p_athlete_id, 150, 0, 'base')
  ON CONFLICT (athlete_id) DO NOTHING;

  SELECT credits_remaining INTO v_remaining
  FROM public.athlete_credits
  WHERE athlete_id = p_athlete_id
  FOR UPDATE;

  IF v_remaining IS NULL OR v_remaining < p_amount THEN
    RETURN jsonb_build_object('ok', false, 'remaining', COALESCE(v_remaining,0), 'error', 'insufficient_credits');
  END IF;

  UPDATE public.athlete_credits
  SET credits_used = credits_used + p_amount,
      updated_at = now()
  WHERE athlete_id = p_athlete_id;

  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete_id, -p_amount, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'remaining', v_remaining - p_amount);
END;
$$;

-- 2) fn_add_credits: mesmo problema
CREATE OR REPLACE FUNCTION public.fn_add_credits(p_athlete_id uuid, p_amount integer, p_reason text DEFAULT 'recharge'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.athlete_credits (athlete_id, credits_total, credits_used, plan_type)
  VALUES (p_athlete_id, p_amount, 0, 'base')
  ON CONFLICT (athlete_id) DO UPDATE
    SET credits_total = public.athlete_credits.credits_total + EXCLUDED.credits_total,
        updated_at = now();

  INSERT INTO public.credit_transactions (athlete_id, amount, reason, metadata)
  VALUES (p_athlete_id, p_amount, p_reason, '{}'::jsonb);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 3) fn_ajustar_treino_dia: suporte a troca real de exercício (swap do FitCopilot)
CREATE OR REPLACE FUNCTION public.fn_ajustar_treino_dia(p_athlete_id uuid, p_data date, p_changes jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_workout_id UUID;
  v_change JSONB;
  v_patched_exercises JSONB;
  v_new_id UUID;
BEGIN
  SELECT id INTO v_daily_workout_id
  FROM public.daily_workouts
  WHERE athlete_id = p_athlete_id AND workout_date = p_data
  LIMIT 1;

  IF v_daily_workout_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_workout_for_date');
  END IF;

  FOR v_change IN SELECT * FROM jsonb_array_elements(p_changes) LOOP
    -- Troca de exercício (swap sugerido pela IA e aceito pelo aluno)
    v_new_id := NULL;
    IF v_change ? 'new_exercise_id' AND (v_change->>'new_exercise_id') IS NOT NULL THEN
      v_new_id := (v_change->>'new_exercise_id')::uuid;
    ELSIF v_change ? 'new_exercise_name' AND (v_change->>'new_exercise_name') IS NOT NULL THEN
      SELECT id INTO v_new_id FROM public.exercises
      WHERE name ILIKE (v_change->>'new_exercise_name')
      LIMIT 1;
      IF v_new_id IS NULL THEN
        SELECT id INTO v_new_id FROM public.exercises
        WHERE name ILIKE '%' || (v_change->>'new_exercise_name') || '%'
        LIMIT 1;
      END IF;
    END IF;

    IF v_new_id IS NOT NULL THEN
      UPDATE public.workout_exercises
      SET exercise_id = v_new_id,
          override_locked = true
      WHERE daily_workout_id = v_daily_workout_id
        AND exercise_id = (v_change->>'exercise_id')::uuid;
    END IF;

    UPDATE public.workout_exercises
    SET sets = COALESCE((v_change->>'sets')::int4, sets),
        reps_range = COALESCE(v_change->>'reps_range', reps_range),
        rest_seconds = COALESCE((v_change->>'rest_seconds')::int4, rest_seconds),
        rpe_target = COALESCE((v_change->>'intensidade')::int4, rpe_target),
        observations = CASE
          WHEN v_change ? 'fadiga' THEN COALESCE(observations, '{}'::jsonb) || jsonb_build_object('fadiga', v_change->'fadiga')
          ELSE observations
        END,
        override_locked = true
    WHERE daily_workout_id = v_daily_workout_id
      AND exercise_id = COALESCE(v_new_id, (v_change->>'exercise_id')::uuid);
  END LOOP;

  SELECT jsonb_agg(
    jsonb_build_object(
      'exercise_id', we.exercise_id,
      'name', vc.name,
      'sets', we.sets,
      'reps', we.reps_range,
      'rest_seconds', we.rest_seconds,
      'tempo', we.tempo,
      'notes', we.observations,
      'video_url', vc.video_url,
      'gif_url', vc.gif_url,
      'target_muscles', to_jsonb(vc.target_muscles),
      'order', we.exercise_order,
      'override_locked', we.override_locked
    )
    ORDER BY we.exercise_order
  )
  INTO v_patched_exercises
  FROM public.workout_exercises we
  LEFT JOIN public.v_exercises_canonical vc ON vc.id = we.exercise_id
  WHERE we.daily_workout_id = v_daily_workout_id;

  UPDATE public.daily_workouts
  SET changes_json = jsonb_build_object('exercises', COALESCE(v_patched_exercises, '[]'::jsonb)),
      override_locked = true,
      updated_at = now()
  WHERE id = v_daily_workout_id;

  RETURN json_build_object(
    'success', true,
    'daily_workout_id', v_daily_workout_id,
    'exercises', (
      SELECT json_agg(json_build_object(
        'id', we.id, 'exercise_id', we.exercise_id,
        'exercise_name', vc.name,
        'sets', we.sets, 'reps_range', we.reps_range, 'rest_seconds', we.rest_seconds,
        'video_url', vc.video_url
      ) ORDER BY we.exercise_order)
      FROM public.workout_exercises we
      LEFT JOIN public.v_exercises_canonical vc ON vc.id = we.exercise_id
      WHERE we.daily_workout_id = v_daily_workout_id
    )
  );
END;
$$;

-- 4) Recordes multi-categoria em personal_records (athlete_id como vínculo canônico)
ALTER TABLE public.personal_records ALTER COLUMN aluno_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_registrar_recorde(
  p_athlete_id uuid,
  p_categoria text,
  p_teste text,
  p_valor numeric,
  p_unidade text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND (a.user_id = auth.uid() OR a.coach_id = auth.uid())
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.personal_records (athlete_id, exercicio, tipo, valor, unidade, data_pr)
  VALUES (p_athlete_id, p_teste, lower(p_categoria), p_valor, p_unidade, CURRENT_DATE)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_get_recordes(p_athlete_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = p_athlete_id
      AND (a.user_id = auth.uid() OR a.coach_id = auth.uid())
  ) THEN
    RETURN '[]'::json;
  END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'id', pr.id,
    'categoria', pr.tipo,
    'teste', pr.exercicio,
    'valor', pr.valor,
    'unidade', pr.unidade,
    'data', pr.data_pr
  ) ORDER BY pr.data_pr), '[]'::json)
  INTO v
  FROM public.personal_records pr
  WHERE pr.athlete_id = p_athlete_id;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_registrar_recorde(uuid, text, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_registrar_recorde(uuid, text, text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_recordes(uuid) TO authenticated;;
