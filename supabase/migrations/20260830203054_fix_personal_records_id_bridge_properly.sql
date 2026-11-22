-- CORREÇÃO do fix anterior: aluno_id e athlete_id são de tabelas DIFERENTES
-- (alunos = backoffice do professor, athletes = app do aluno) com FK real
-- pra alunos. Copiar o UUID direto quebra a foreign key. O certo é tentar
-- resolver a ponte por email/nome (quando existir) e, se não existir aluno
-- correspondente, simplesmente NÃO preencher aluno_id — nunca travar o
-- insert do app do aluno por causa de uma tabela que ele nem usa.
CREATE OR REPLACE FUNCTION public.fn_sync_personal_records_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_resolved_aluno_id uuid;
BEGIN
  IF NEW.aluno_id IS NULL AND NEW.athlete_id IS NOT NULL THEN
    SELECT al.id INTO v_resolved_aluno_id
    FROM public.athletes a
    JOIN public.alunos al ON lower(al.email) = lower(a.email) OR lower(al.nome) = lower(a.name)
    WHERE a.id = NEW.athlete_id
    LIMIT 1;
    NEW.aluno_id := v_resolved_aluno_id; -- fica NULL se não achar ponte, e tudo bem
  ELSIF NEW.athlete_id IS NULL AND NEW.aluno_id IS NOT NULL THEN
    NEW.athlete_id := NEW.aluno_id; -- aqui é seguro: athlete_id não tem FK restritiva
  END IF;
  RETURN NEW;
END;
$function$;

-- Desfaz a "correção" anterior que tinha colocado um aluno_id inválido
-- (cópia direta do athlete_id, que não existe em alunos)
UPDATE public.personal_records pr
SET aluno_id = NULL
WHERE aluno_id IS NOT NULL
  AND aluno_id = athlete_id
  AND NOT EXISTS (SELECT 1 FROM public.alunos al WHERE al.id = pr.aluno_id);;
