CREATE OR REPLACE FUNCTION public.fn_montar_bloco_exercicios(p_descricao text, p_qtd_alvo int DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_termos text[];
  v_termo text;
  v_result jsonb := '[]'::jsonb;
  v_ex RECORD;
  v_ordem int := 1;
  v_qtd int := GREATEST(1, LEAST(COALESCE(p_qtd_alvo, 1), 6));
BEGIN
  IF p_descricao IS NULL OR trim(p_descricao) = '' THEN
    RETURN v_result;
  END IF;

  -- extrai termos-chave grosseiros da descrição textual do bloco (pt-BR)
  v_termos := ARRAY(
    SELECT unnest(string_to_array(lower(p_descricao), ' '))
  );

  FOR v_ordem IN 1..v_qtd LOOP
    SELECT e.id, e.name INTO v_ex
    FROM exercises e
    WHERE EXISTS (
      SELECT 1 FROM unnest(e.target_muscles) m, unnest(v_termos) t
      WHERE m ILIKE '%' || t || '%' AND length(t) > 3
    )
    ORDER BY random()
    LIMIT 1;

    IF v_ex.id IS NULL THEN
      SELECT id, name INTO v_ex FROM exercises ORDER BY random() LIMIT 1;
    END IF;

    IF v_ex.id IS NOT NULL THEN
      v_result := v_result || jsonb_build_object(
        'ordem', v_ordem,
        'exercise_id', v_ex.id,
        'nome', v_ex.name,
        'descricao_bloco', p_descricao
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$function$;;
