-- Extrai a lógica de checagem de PR para uma função chamável diretamente
-- (não só via trigger), permitindo reprocessamento retroativo e reuso.

CREATE OR REPLACE FUNCTION public.check_and_create_pr_from_assessment(p_assessment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_prev_max numeric;
  v_test record;
BEGIN
  SELECT * INTO v_row FROM public.avaliacoes_unificadas WHERE id = p_assessment_id;
  IF v_row.athlete_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_test IN
    SELECT * FROM (VALUES
      ('rm1_empurrar_perna', 'Leg Press (1RM)', v_row.rm1_empurrar_perna),
      ('rm1_puxar_costas', 'Remada (1RM)', v_row.rm1_puxar_costas),
      ('rm1_empurrar_superior', 'Supino Reto (1RM)', v_row.rm1_empurrar_superior),
      ('rm1_puxar_inferior', 'Stiff (1RM)', v_row.rm1_puxar_inferior)
    ) AS t(campo, nome_exercicio, valor)
  LOOP
    IF v_test.valor IS NULL OR v_test.valor <= 0 THEN
      CONTINUE;
    END IF;

    -- Máximo histórico ANTES desta avaliação (respeitando a data, para o
    -- reprocessamento retroativo funcionar em ordem cronológica correta).
    SELECT GREATEST(
      COALESCE((
        SELECT MAX(
          CASE v_test.campo
            WHEN 'rm1_empurrar_perna' THEN rm1_empurrar_perna
            WHEN 'rm1_puxar_costas' THEN rm1_puxar_costas
            WHEN 'rm1_empurrar_superior' THEN rm1_empurrar_superior
            WHEN 'rm1_puxar_inferior' THEN rm1_puxar_inferior
          END
        )
        FROM public.avaliacoes_unificadas
        WHERE athlete_id = v_row.athlete_id
          AND id <> v_row.id
          AND data_avaliacao <= v_row.data_avaliacao
      ), 0),
      COALESCE((
        SELECT MAX(valor) FROM public.personal_records
        WHERE athlete_id = v_row.athlete_id
          AND exercicio = v_test.nome_exercicio
          AND data_pr <= v_row.data_avaliacao
      ), 0)
    ) INTO v_prev_max;

    IF v_test.valor > v_prev_max THEN
      -- Evita duplicar se já existe PR idêntico para esta data/exercício/valor
      IF NOT EXISTS (
        SELECT 1 FROM public.personal_records
        WHERE athlete_id = v_row.athlete_id
          AND exercicio = v_test.nome_exercicio
          AND data_pr = v_row.data_avaliacao
          AND valor = v_test.valor
      ) THEN
        INSERT INTO public.personal_records (athlete_id, exercicio, tipo, valor, unidade, data_pr)
        VALUES (v_row.athlete_id, v_test.nome_exercicio, 'forca', v_test.valor, 'kg', v_row.data_avaliacao);
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- Trigger passa a chamar esta função em vez de duplicar a lógica.
CREATE OR REPLACE FUNCTION public.trg_fn_create_pr_from_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.check_and_create_pr_from_assessment(NEW.id);
  RETURN NEW;
END;
$function$;;
