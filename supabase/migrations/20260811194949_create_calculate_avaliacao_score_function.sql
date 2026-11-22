-- Função de cálculo de score para avaliacoes_unificadas.
-- Baseada nos campos brutos existentes (rml_*, rm1_*, core_*, cardio_*, mob_*).
-- Cada subscore é normalizado 0-100 usando faixas de referência simples;
-- score_global é a média dos 5 subscores que tiverem dado disponível
-- (não penaliza campos ainda não coletados, evita zerar score por falta de 1 medida).

CREATE OR REPLACE FUNCTION public.fn_calcular_score_avaliacao(p_avaliacao_id uuid)
RETURNS TABLE(score_forca numeric, score_resistencia numeric, score_core numeric, score_cardio numeric, score_mobilidade numeric, score_global numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_forca numeric;
  v_resistencia numeric;
  v_core numeric;
  v_cardio numeric;
  v_mobilidade numeric;
  v_soma numeric := 0;
  v_count int := 0;
  v_global numeric;
BEGIN
  SELECT * INTO v_row FROM public.avaliacoes_unificadas WHERE id = p_avaliacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'avaliacao % not found', p_avaliacao_id;
  END IF;

  -- Força: média normalizada dos testes de RM1 (referência simples: 0-150kg -> 0-100)
  IF v_row.rm1_empurrar_perna IS NOT NULL OR v_row.rm1_puxar_costas IS NOT NULL 
     OR v_row.rm1_empurrar_superior IS NOT NULL OR v_row.rm1_puxar_inferior IS NOT NULL THEN
    v_forca := LEAST(100, GREATEST(0, (
      COALESCE(v_row.rm1_empurrar_perna,0) + COALESCE(v_row.rm1_puxar_costas,0) +
      COALESCE(v_row.rm1_empurrar_superior,0) + COALESCE(v_row.rm1_puxar_inferior,0)
    ) / 4.0 / 150.0 * 100));
    v_soma := v_soma + v_forca; v_count := v_count + 1;
  END IF;

  -- Resistência: média normalizada dos testes RML (referência: 0-60 reps -> 0-100)
  IF v_row.rml_abs IS NOT NULL OR v_row.rml_flexao IS NOT NULL 
     OR v_row.rml_agachamento IS NOT NULL OR v_row.rml_pull IS NOT NULL OR v_row.rml_elevacao_p IS NOT NULL THEN
    v_resistencia := LEAST(100, GREATEST(0, (
      COALESCE(v_row.rml_abs,0) + COALESCE(v_row.rml_flexao,0) + COALESCE(v_row.rml_agachamento,0) +
      COALESCE(v_row.rml_pull,0) + COALESCE(v_row.rml_elevacao_p,0)
    ) / 5.0 / 60.0 * 100));
    v_soma := v_soma + v_resistencia; v_count := v_count + 1;
  END IF;

  -- Core: prancha + side planks (referência: 0-120seg -> 0-100)
  IF v_row.core_prancha_seg IS NOT NULL OR v_row.core_side_plank_esq_seg IS NOT NULL OR v_row.core_side_plank_dir_seg IS NOT NULL THEN
    v_core := LEAST(100, GREATEST(0, (
      COALESCE(v_row.core_prancha_seg,0) + COALESCE(v_row.core_side_plank_esq_seg,0) + COALESCE(v_row.core_side_plank_dir_seg,0)
    ) / 3.0 / 120.0 * 100));
    v_soma := v_soma + v_core; v_count := v_count + 1;
  END IF;

  -- Cardio: baseado em BPM repouso (referência inversa: 40-100bpm -> 100-0, menor é melhor)
  IF v_row.cardio_bpm_repouso IS NOT NULL THEN
    v_cardio := LEAST(100, GREATEST(0, 100 - ((v_row.cardio_bpm_repouso - 40) / 60.0 * 100)));
    v_soma := v_soma + v_cardio; v_count := v_count + 1;
  END IF;

  -- Mobilidade: média dos testes de mobilidade (referência: 0-100 já é escala direta assumida)
  IF v_row.mob_overhead_squat IS NOT NULL OR v_row.mob_quadril IS NOT NULL 
     OR v_row.mob_tornozelo IS NOT NULL OR v_row.mob_ombro IS NOT NULL THEN
    v_mobilidade := LEAST(100, GREATEST(0, (
      COALESCE(v_row.mob_overhead_squat,0) + COALESCE(v_row.mob_quadril,0) +
      COALESCE(v_row.mob_tornozelo,0) + COALESCE(v_row.mob_ombro,0)
    ) / 4.0));
    v_soma := v_soma + v_mobilidade; v_count := v_count + 1;
  END IF;

  IF v_count > 0 THEN
    v_global := round(v_soma / v_count, 1);
  ELSE
    v_global := NULL; -- sem dado nenhum, não inventa score 0
  END IF;

  UPDATE public.avaliacoes_unificadas
  SET score_forca = v_forca,
      score_resistencia = v_resistencia,
      score_core = v_core,
      score_cardio = v_cardio,
      score_mobilidade = v_mobilidade,
      score_global = v_global,
      updated_at = now()
  WHERE id = p_avaliacao_id;

  RETURN QUERY SELECT v_forca, v_resistencia, v_core, v_cardio, v_mobilidade, v_global;
END;
$function$;

COMMENT ON FUNCTION public.fn_calcular_score_avaliacao(uuid) IS 'Calcula os 5 subscores + score_global de avaliacoes_unificadas a partir dos campos brutos (rml_*, rm1_*, core_*, cardio_*, mob_*). Só considera subscores com dado disponível (não zera por medida ausente). Criada 11/08 - antes não existia função de cálculo, campos ficavam sempre NULL.';

-- Trigger: recalcula automaticamente sempre que uma avaliação é inserida ou os campos brutos são atualizados
CREATE OR REPLACE FUNCTION public.trg_fn_calcular_score_avaliacao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_calcular_score_avaliacao(NEW.id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_auto_calcular_score ON public.avaliacoes_unificadas;
CREATE TRIGGER trg_auto_calcular_score
AFTER INSERT ON public.avaliacoes_unificadas
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_calcular_score_avaliacao();;
