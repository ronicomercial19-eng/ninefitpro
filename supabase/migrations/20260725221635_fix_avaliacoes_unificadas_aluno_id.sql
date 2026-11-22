
-- 1. Torna aluno_id nullable (aceita athletes que não têm registro em alunos)
ALTER TABLE avaliacoes_unificadas 
  ALTER COLUMN aluno_id DROP NOT NULL;

-- 2. Garante que athlete_id também existe e tem índice
CREATE INDEX IF NOT EXISTS idx_avaliacoes_athlete_id 
  ON avaliacoes_unificadas(athlete_id);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_aluno_id 
  ON avaliacoes_unificadas(aluno_id);

-- 3. Trigger: ao inserir com athlete_id mas sem aluno_id,
--    tenta preencher aluno_id automaticamente via email
CREATE OR REPLACE FUNCTION fn_resolver_aluno_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_aluno_id UUID;
  v_email TEXT;
BEGIN
  -- Se aluno_id já veio preenchido, não faz nada
  IF NEW.aluno_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tenta resolver via athlete_id → email → alunos
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

  -- Se ainda nulo, usa athlete_id como fallback no aluno_id
  -- (só funciona se o tipo for compatível — ambos UUID)
  IF NEW.aluno_id IS NULL AND NEW.athlete_id IS NOT NULL THEN
    NEW.aluno_id := NEW.athlete_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resolver_aluno_id ON avaliacoes_unificadas;
CREATE TRIGGER trg_resolver_aluno_id
  BEFORE INSERT ON avaliacoes_unificadas
  FOR EACH ROW EXECUTE FUNCTION fn_resolver_aluno_id();

-- 4. Adiciona policy para athletes do FitPro lerem/inserirem suas próprias avaliações
DROP POLICY IF EXISTS "Athletes FitPro veem suas avaliacoes" ON avaliacoes_unificadas;
CREATE POLICY "Athletes FitPro veem suas avaliacoes"
  ON avaliacoes_unificadas FOR SELECT
  USING (
    athlete_id IN (
      SELECT aal.athlete_id 
      FROM athlete_auth_link aal 
      WHERE aal.user_id = auth.uid()
    )
    OR
    aluno_id IN (
      SELECT aal.athlete_id 
      FROM athlete_auth_link aal 
      WHERE aal.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Athletes FitPro inserem avaliacoes" ON avaliacoes_unificadas;
CREATE POLICY "Athletes FitPro inserem avaliacoes"
  ON avaliacoes_unificadas FOR INSERT
  WITH CHECK (
    athlete_id IN (
      SELECT aal.athlete_id 
      FROM athlete_auth_link aal 
      WHERE aal.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'professor'::app_role)
  );
;
