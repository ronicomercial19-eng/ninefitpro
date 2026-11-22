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
  v_ordem int;
  v_qtd int := GREATEST(1, LEAST(COALESCE(p_qtd_alvo, 1), 6));
  v_is_cardio boolean;
BEGIN
  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN
    RETURN v_result;
  END IF;

  v_is_cardio := (
    p_descricao ~* '\d+\s*(m|km|min)\b'
    OR p_descricao ~* '(sprint|corrida|rodagem|tempo run|fartlek|z[12]|limiar|hill|strides?|pace|30/30)'
  );

  v_termos := ARRAY(SELECT unnest(string_to_array(lower(p_descricao), ' ')));

  FOR v_ordem IN 1..v_qtd LOOP
    v_ex_id := NULL;
    v_ex_name := NULL;

    IF v_is_cardio THEN
      SELECT e.id, e.name INTO v_ex_id, v_ex_name
      FROM exercises e
      WHERE EXISTS (SELECT 1 FROM unnest(e.target_muscles) m WHERE m ILIKE 'cardio')
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_ex_id IS NULL THEN
      SELECT e.id, e.name INTO v_ex_id, v_ex_name
      FROM exercises e
      WHERE EXISTS (
        SELECT 1 FROM unnest(e.target_muscles) m, unnest(v_termos) t
        WHERE m ILIKE '%' || t || '%' AND length(t) > 3
      )
      ORDER BY random()
      LIMIT 1;
    END IF;

    IF v_ex_id IS NULL THEN
      SELECT id, name INTO v_ex_id, v_ex_name FROM exercises ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex_id IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'ordem', v_ordem,
        'exercise_id', v_ex_id,
        'nome', v_ex_name,
        'descricao_bloco', p_descricao
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$function$;;
