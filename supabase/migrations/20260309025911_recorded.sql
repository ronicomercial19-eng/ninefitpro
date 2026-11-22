
-- Phase 1: Add aluno_id column to athletes for explicit bridging
ALTER TABLE public.athletes ADD COLUMN IF NOT EXISTS aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL;

-- Create index for bridge lookups
CREATE INDEX IF NOT EXISTS idx_athletes_aluno_id ON public.athletes(aluno_id);

-- Auto-populate aluno_id by matching email (one-time backfill)
UPDATE public.athletes a
SET aluno_id = al.id
FROM public.alunos al
WHERE LOWER(a.email) = LOWER(al.email)
  AND a.aluno_id IS NULL;

-- Create bridge view for unified student access
CREATE OR REPLACE VIEW public.v_students_bridge
WITH (security_invoker = true)
AS
SELECT
  al.id AS aluno_id,
  ath.id AS athlete_id,
  COALESCE(al.nome, ath.name) AS nome,
  COALESCE(al.email, ath.email) AS email,
  al.telefone AS telefone,
  COALESCE(al.data_nascimento, ath.birthdate) AS data_nascimento,
  COALESCE(al.objetivo, ath.objetivo) AS objetivo,
  al.status,
  COALESCE(al.nivel_experiencia, ath.nivel) AS nivel_experiencia,
  al.data_cadastro,
  COALESCE(al.altura_cm, ath.altura_cm) AS altura_cm,
  COALESCE(al.peso_atual, ath.peso_kg) AS peso_atual,
  al.professor_id,
  ath.coach_id,
  ath.user_id AS auth_user_id
FROM public.alunos al
LEFT JOIN public.athletes ath ON ath.aluno_id = al.id OR (ath.aluno_id IS NULL AND LOWER(ath.email) = LOWER(al.email))
UNION
SELECT
  NULL AS aluno_id,
  ath.id AS athlete_id,
  ath.name AS nome,
  ath.email,
  ath.phone AS telefone,
  ath.birthdate AS data_nascimento,
  ath.objetivo,
  NULL AS status,
  ath.nivel AS nivel_experiencia,
  ath.created_at AS data_cadastro,
  ath.altura_cm,
  ath.peso_kg AS peso_atual,
  NULL AS professor_id,
  ath.coach_id,
  ath.user_id AS auth_user_id
FROM public.athletes ath
WHERE ath.aluno_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.alunos al WHERE LOWER(al.email) = LOWER(ath.email));

-- Add comment to deprecated tables
COMMENT ON TABLE public.avaliacoes IS 'DEPRECATED: Use avaliacoes_unificadas instead. Kept for backward compatibility.';
COMMENT ON TABLE public.historico_avaliacoes IS 'DEPRECATED: Use avaliacoes_unificadas instead. Kept for backward compatibility.';
;
