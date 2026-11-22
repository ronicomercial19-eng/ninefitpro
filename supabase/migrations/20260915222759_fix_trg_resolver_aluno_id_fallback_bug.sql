-- Achado 15/09: trg_resolver_aluno_id (outro dev, BEFORE INSERT em
-- avaliacoes_unificadas) duplica a resolução de identidade que
-- trg_resolve_athlete_id_avaliacoes já faz (ordem alfabética: a primeira
-- roda antes), mas seu fallback final "NEW.aluno_id := NEW.athlete_id"
-- assume que os dois UUIDs são intercambiáveis — falso, já provado com
-- dados reais (Fernanda: aluno_id=9e4f43d7... != athlete_id=18fabf10...).
-- Remove o fallback perigoso; mantém só a resolução real via email (que já
-- é redundante com a outra trigger, mas inofensiva). Deixa aluno_id NULL
-- quando não há correspondência real, em vez de poluir com dado errado.

CREATE OR REPLACE FUNCTION public.fn_resolver_aluno_id()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_aluno_id UUID;
  v_email TEXT;
BEGIN
  IF NEW.aluno_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.athlete_id IS NOT NULL THEN
    SELECT a.email INTO v_email
    FROM athletes a
    WHERE a.id = NEW.athlete_id;

    IF v_email IS NOT NULL THEN
      SELECT al.id INTO v_aluno_id
      FROM alunos al
      WHERE LOWER(al.email) = LOWER(v_email)
      LIMIT 1;

      IF v_aluno_id IS NOT NULL THEN
        NEW.aluno_id := v_aluno_id;
      END IF;
    END IF;
  END IF;

  -- Fallback perigoso removido: aluno_id fica NULL quando não há
  -- correspondência real em `alunos`, em vez de receber o UUID de
  -- athlete_id incorretamente.
  RETURN NEW;
END;
$function$;;
