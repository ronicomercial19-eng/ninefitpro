-- Ponte Progress Tracker → FitPro: sempre que uma avaliação física é salva
-- (avaliacoes_unificadas), verifica os 4 testes de 1RM contra o recorde
-- histórico do atleta (avaliações anteriores + personal_records já
-- existentes) e cria um novo personal_record automaticamente quando um
-- valor bate o recorde. Isso alimenta "Recordes Recentes" e "Progressão
-- de Força" no FitPro sem duplicar lógica em nenhum front específico.

CREATE OR REPLACE FUNCTION public.trg_fn_create_pr_from_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_max numeric;
  v_test record;
BEGIN
  IF NEW.athlete_id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_test IN
    SELECT * FROM (VALUES
      ('rm1_empurrar_perna', 'Leg Press (1RM)', NEW.rm1_empurrar_perna),
      ('rm1_puxar_costas', 'Remada (1RM)', NEW.rm1_puxar_costas),
      ('rm1_empurrar_superior', 'Supino Reto (1RM)', NEW.rm1_empurrar_superior),
      ('rm1_puxar_inferior', 'Stiff (1RM)', NEW.rm1_puxar_inferior)
    ) AS t(campo, nome_exercicio, valor)
  LOOP
    IF v_test.valor IS NULL OR v_test.valor <= 0 THEN
      CONTINUE;
    END IF;

    -- Máximo histórico anterior: outras avaliações do mesmo atleta (exceto
    -- esta linha) + PRs já registrados manualmente para o mesmo exercício.
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
        WHERE athlete_id = NEW.athlete_id AND id <> NEW.id
      ), 0),
      COALESCE((
        SELECT MAX(valor) FROM public.personal_records
        WHERE athlete_id = NEW.athlete_id AND exercicio = v_test.nome_exercicio
      ), 0)
    ) INTO v_prev_max;

    IF v_test.valor > v_prev_max THEN
      INSERT INTO public.personal_records (athlete_id, exercicio, tipo, valor, unidade, data_pr)
      VALUES (NEW.athlete_id, v_test.nome_exercicio, 'forca', v_test.valor, 'kg', NEW.data_avaliacao);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_create_pr_from_assessment ON public.avaliacoes_unificadas;
CREATE TRIGGER trg_create_pr_from_assessment
AFTER INSERT ON public.avaliacoes_unificadas
FOR EACH ROW
EXECUTE FUNCTION public.trg_fn_create_pr_from_assessment();;
