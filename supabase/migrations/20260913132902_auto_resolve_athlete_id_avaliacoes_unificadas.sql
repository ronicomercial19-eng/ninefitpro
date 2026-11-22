-- Bug crítico: salvar_avaliacao() (usada por NewAssessmentPage.tsx via
-- saveViaRpc e por QuickAssessmentPage.tsx) grava só aluno_id, nunca
-- athlete_id — confirmado com dados reais: todas as avaliações com
-- origem='manual' têm athlete_id NULL, o que impede a trigger de PR e
-- qualquer ponte com o FitPro. Corrigido na borda do banco (não nas RPCs,
-- que são várias e algumas Lovable pode reescrever) via trigger que resolve
-- athlete_id automaticamente pelo join real athletes↔alunos (email/nome),
-- em vez de assumir que os UUIDs são iguais como fn_sync_personal_records_ids
-- fazia incorretamente.

CREATE OR REPLACE FUNCTION public.fn_resolve_athlete_id_avaliacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_resolved_athlete_id uuid;
  v_resolved_aluno_id uuid;
BEGIN
  IF NEW.athlete_id IS NULL AND NEW.aluno_id IS NOT NULL THEN
    SELECT a.id INTO v_resolved_athlete_id
    FROM public.alunos al
    JOIN public.athletes a ON lower(a.email) = lower(al.email) OR lower(a.name) = lower(al.nome)
    WHERE al.id = NEW.aluno_id
    LIMIT 1;
    NEW.athlete_id := v_resolved_athlete_id; -- fica NULL se não achar ponte real
  ELSIF NEW.aluno_id IS NULL AND NEW.athlete_id IS NOT NULL THEN
    SELECT al.id INTO v_resolved_aluno_id
    FROM public.athletes a
    JOIN public.alunos al ON lower(al.email) = lower(a.email) OR lower(al.nome) = lower(a.name)
    WHERE a.id = NEW.athlete_id
    LIMIT 1;
    NEW.aluno_id := v_resolved_aluno_id;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_resolve_athlete_id_avaliacoes ON public.avaliacoes_unificadas;
CREATE TRIGGER trg_resolve_athlete_id_avaliacoes
BEFORE INSERT OR UPDATE OF aluno_id, athlete_id ON public.avaliacoes_unificadas
FOR EACH ROW
EXECUTE FUNCTION public.fn_resolve_athlete_id_avaliacoes();;
