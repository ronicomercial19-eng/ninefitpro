-- Trigger genérico: garante no máximo 1 periodization_annual_plans.status='active'
-- por atleta, independente de qual caminho gravou (Wizard antigo, atalho IA,
-- fn_generate_plan_from_bank_model, ou qualquer função futura). Antes, só a
-- função nova (fn_generate_plan_from_bank_model) fazia esse arquivamento
-- manualmente — o Wizard e o atalho de IA nunca faziam, causando duplicatas
-- (16 na Fernanda, 2 na Sarah, 2 na Priscila).
CREATE OR REPLACE FUNCTION public.fn_archive_previous_annual_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' AND NEW.athlete_id IS NOT NULL THEN
    UPDATE public.periodization_annual_plans
       SET status = 'archived', updated_at = now()
     WHERE athlete_id = NEW.athlete_id
       AND status = 'active'
       AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_archive_previous_annual_plan ON public.periodization_annual_plans;
CREATE TRIGGER trg_archive_previous_annual_plan
  AFTER INSERT OR UPDATE OF status ON public.periodization_annual_plans
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.fn_archive_previous_annual_plan();

-- Limpeza retroativa dos duplicados já existentes: mantém só o mais recente
-- (por updated_at, com created_at como desempate) ativo por atleta.
WITH ranked AS (
  SELECT id, athlete_id,
         row_number() OVER (
           PARTITION BY athlete_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.periodization_annual_plans
  WHERE status = 'active'
)
UPDATE public.periodization_annual_plans p
   SET status = 'archived', updated_at = now()
  FROM ranked r
 WHERE p.id = r.id AND r.rn > 1;;
