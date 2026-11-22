-- FIX (Rony, 30/08): "novo recorde" / avaliação guiada não salva e não
-- atualiza progresso. Causa real: personal_records tem duas colunas de
-- ID (aluno_id legado do backoffice do professor, athlete_id novo do
-- app do aluno). O app do aluno só grava athlete_id. O trigger que
-- recalcula user_stats_agg só lê aluno_id -> chega NULL -> viola
-- NOT NULL em user_stats_agg.aluno_id -> o INSERT inteiro falha,
-- "Inserir novo recorde" trava com erro técnico e nada é salvo.

-- 1) Backfill: preenche a coluna que faltar a partir da que veio preenchida,
-- ANTES do insert, pra nenhum trigger downstream ver NULL.
CREATE OR REPLACE FUNCTION public.fn_sync_personal_records_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.aluno_id IS NULL AND NEW.athlete_id IS NOT NULL THEN
    NEW.aluno_id := NEW.athlete_id;
  ELSIF NEW.athlete_id IS NULL AND NEW.aluno_id IS NOT NULL THEN
    NEW.athlete_id := NEW.aluno_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_pr_ids ON public.personal_records;
CREATE TRIGGER trg_sync_pr_ids
  BEFORE INSERT OR UPDATE ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_personal_records_ids();

-- 2) Defensivo: mesmo que algum outro caminho ainda deixe aluno_id nulo,
-- o trigger de recálculo agora tenta as duas colunas antes de chamar
-- recalc_user_stats, nunca passando NULL adiante.
CREATE OR REPLACE FUNCTION public.trg_recalc_stats_on_treino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  v_id := COALESCE(NEW.aluno_id, NEW.athlete_id, OLD.aluno_id, OLD.athlete_id);
  IF v_id IS NOT NULL THEN
    PERFORM public.recalc_user_stats(v_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3) Corrige registros já quebrados que ficaram com um dos dois IDs nulo
UPDATE public.personal_records SET aluno_id = athlete_id WHERE aluno_id IS NULL AND athlete_id IS NOT NULL;
UPDATE public.personal_records SET athlete_id = aluno_id WHERE athlete_id IS NULL AND aluno_id IS NOT NULL;;
