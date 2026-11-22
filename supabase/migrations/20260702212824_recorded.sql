
DROP VIEW IF EXISTS public.vw_alunos_canonical CASCADE;

CREATE VIEW public.vw_alunos_canonical AS
SELECT
  a.id::text                                     AS id,
  a.id                                           AS athlete_id,
  a.professor_id::text                           AS professor_id,
  COALESCE(NULLIF(TRIM(a.nome), ''), 'Aluno')    AS nome,
  COALESCE(a.email, '')                          AS email,
  COALESCE(a.objetivo, 'Não definido')           AS objetivo,
  COALESCE(a.nivel_experiencia, 'intermediario') AS nivel,
  NULL::text                                     AS fase_atual,
  a.status::text                                 AS status,
  NULL::text                                     AS volume_level,
  NULL::text                                     AS intensity_level,
  NULL::text                                     AS recovery_status,
  NULL::numeric                                  AS adherence_level,
  NULL::numeric                                  AS fatigue_level,
  'alunos'::text                                 AS source
FROM public.alunos a

UNION ALL

SELECT
  ath.id::text,
  ath.id,
  ath.user_id::text,
  COALESCE(NULLIF(TRIM(ath.name), ''), 'Atleta'),
  COALESCE(ath.email, ''),
  COALESCE(ath.objetivo, 'Não definido'),
  COALESCE(ath.nivel, 'intermediario'),
  NULL::text,
  'ativo',
  NULL::text, NULL::text, NULL::text, NULL::numeric, NULL::numeric,
  'athletes'::text
FROM public.athletes ath
WHERE NOT EXISTS (SELECT 1 FROM public.alunos a2 WHERE a2.id = ath.id);

GRANT SELECT ON public.vw_alunos_canonical TO authenticated;
GRANT SELECT ON public.vw_alunos_canonical TO anon;
GRANT ALL   ON public.vw_alunos_canonical TO service_role;
;
