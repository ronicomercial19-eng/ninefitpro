CREATE OR REPLACE FUNCTION public.fn_montar_bloco9_exercicios(p_descricao text, p_qtd_alvo int, p_grupos_musculares text[], p_rpe text DEFAULT NULL, p_rest text DEFAULT NULL, p_cadence text DEFAULT NULL, p_reps text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_ex_id uuid;
  v_ex_name text;
  v_ex_muscles text[];
  v_ordem int;
  v_qtd int := GREATEST(1, LEAST(COALESCE(p_qtd_alvo, 1), 6));
  v_is_cardio boolean;
BEGIN
  v_is_cardio := (
    p_descricao ~* '[0-9]+\s*(m|km|min)([^a-zA-Z]|$)'
    OR p_descricao ~* '(sprint|corrida|rodagem|tempo run|fartlek|z1|z2|limiar|hill|stride|pace|30/30)'
  );

  FOR v_ordem IN 1..v_qtd LOOP
    v_ex_id := NULL; v_ex_name := NULL; v_ex_muscles := NULL;

    IF v_is_cardio THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM exercises e WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m WHERE m ILIKE 'cardio')
      ORDER BY random() LIMIT 1;
    ELSIF p_grupos_musculares IS NOT NULL AND array_length(p_grupos_musculares, 1) > 0 THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM exercises e
      WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m, unnest(p_grupos_musculares) g WHERE m ILIKE g)
      ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex_id IS NULL THEN
      SELECT id, name, target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles FROM exercises ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex_id IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'id', v_ex_id,
        'nome', v_ex_name,
        'grupo_muscular', COALESCE(v_ex_muscles[1], null),
        'series', v_qtd,
        'reps', COALESCE(p_reps, '8-12'),
        'rpe', COALESCE(NULLIF(regexp_replace(COALESCE(p_rpe,''), '[^0-9]', '', 'g'), '')::numeric, 6),
        'descanso', COALESCE(p_rest, '60') || 's',
        'cadencia', p_cadence,
        'nota_tecnica', p_descricao
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_montar_bloco_exercicios(p_descricao text, p_qtd_alvo int DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_termos text[];
  v_result jsonb := '[]'::jsonb;
  v_ex_id uuid;
  v_ex_name text;
  v_ex_muscles text[];
  v_ordem int;
  v_qtd int := GREATEST(1, LEAST(COALESCE(p_qtd_alvo, 1), 6));
  v_is_cardio boolean;
BEGIN
  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN
    RETURN v_result;
  END IF;

  v_is_cardio := (
    p_descricao ~* '[0-9]+\s*(m|km|min)([^a-zA-Z]|$)'
    OR p_descricao ~* '(sprint|corrida|rodagem|tempo run|fartlek|z1|z2|limiar|hill|stride|pace|30/30)'
  );

  v_termos := ARRAY(SELECT unnest(string_to_array(lower(p_descricao), ' ')));

  FOR v_ordem IN 1..v_qtd LOOP
    v_ex_id := NULL; v_ex_name := NULL; v_ex_muscles := NULL;

    IF v_is_cardio THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM exercises e WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m WHERE m ILIKE 'cardio')
      ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex_id IS NULL THEN
      SELECT e.id, e.name, e.target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles
      FROM exercises e
      WHERE EXISTS (
        SELECT 1 FROM unnest(e.target_muscles) m, unnest(v_termos) t
        WHERE m ILIKE '%' || t || '%' AND length(t) > 3
      )
      ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex_id IS NULL THEN
      SELECT id, name, target_muscles INTO v_ex_id, v_ex_name, v_ex_muscles FROM exercises ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex_id IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'id', v_ex_id,
        'nome', v_ex_name,
        'grupo_muscular', COALESCE(v_ex_muscles[1], null),
        'series', 1,
        'reps', '1',
        'rpe', 4,
        'descanso', '30s',
        'cadencia', null,
        'nota_tecnica', p_descricao
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$function$;;
