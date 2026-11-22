DROP VIEW IF EXISTS public.v_avaliacoes CASCADE;
DROP VIEW IF EXISTS public.vw_assessments_unified CASCADE;
DROP VIEW IF EXISTS public.v_assessment_canonical CASCADE;
DROP VIEW IF EXISTS public.vw_hub_status CASCADE;
DROP VIEW IF EXISTS public.vw_performance_athlete CASCADE;

ALTER TABLE public.avaliacoes_unificadas
  ALTER COLUMN peso TYPE numeric(10,2),
  ALTER COLUMN altura TYPE numeric(10,2),
  ALTER COLUMN imc TYPE numeric(10,2),
  ALTER COLUMN gordura_corporal TYPE numeric(10,2),
  ALTER COLUMN massa_gorda TYPE numeric(10,2),
  ALTER COLUMN massa_magra TYPE numeric(10,2),
  ALTER COLUMN massa_muscular TYPE numeric(10,2),
  ALTER COLUMN agua_corporal TYPE numeric(10,2),
  ALTER COLUMN taxa_metabolica TYPE numeric(10,2),
  ALTER COLUMN circunferencia_braco TYPE numeric(10,2),
  ALTER COLUMN circunferencia_peitoral TYPE numeric(10,2),
  ALTER COLUMN circunferencia_cintura TYPE numeric(10,2),
  ALTER COLUMN circunferencia_quadril TYPE numeric(10,2),
  ALTER COLUMN circunferencia_coxa TYPE numeric(10,2),
  ALTER COLUMN circunferencia_panturrilha TYPE numeric(10,2),
  ALTER COLUMN dobra_triceps TYPE numeric(10,2),
  ALTER COLUMN dobra_peitoral TYPE numeric(10,2),
  ALTER COLUMN dobra_abdominal TYPE numeric(10,2),
  ALTER COLUMN dobra_suprailiaca TYPE numeric(10,2),
  ALTER COLUMN dobra_coxa TYPE numeric(10,2),
  ALTER COLUMN dobra_panturrilha TYPE numeric(10,2),
  ALTER COLUMN dobra_subescapular TYPE numeric(10,2),
  ALTER COLUMN dobra_axilar_media TYPE numeric(10,2),
  ALTER COLUMN rm1_empurrar_perna TYPE numeric(10,2),
  ALTER COLUMN rm1_puxar_costas TYPE numeric(10,2),
  ALTER COLUMN rm1_empurrar_superior TYPE numeric(10,2),
  ALTER COLUMN rm1_puxar_inferior TYPE numeric(10,2);

CREATE VIEW public.v_avaliacoes
WITH (security_invoker = true) AS
SELECT a.id, a.aluno_id, a.athlete_id, a.origem, a.data_avaliacao,
  a.peso, a.altura, a.imc, a.gordura_corporal, a.massa_muscular,
  a.massa_gorda, a.massa_magra, a.agua_corporal, a.taxa_metabolica,
  a.circunferencia_braco, a.circunferencia_peitoral, a.circunferencia_cintura,
  a.circunferencia_quadril, a.circunferencia_coxa, a.circunferencia_panturrilha,
  a.rml_abs, a.rml_flexao, a.rml_agachamento, a.rml_pull, a.rml_elevacao_p,
  a.rm1_empurrar_perna, a.rm1_puxar_costas, a.rm1_empurrar_superior, a.rm1_puxar_inferior,
  a.score_forca, a.score_resistencia, a.score_core, a.score_cardio,
  a.score_mobilidade, a.score_global, a.flags_inteligentes, a.avaliacao_exames,
  a.observacoes, a.avaliador_nome, a.avaliador_cref, a.created_at, a.updated_at
FROM public.avaliacoes_unificadas a
UNION ALL
SELECT f.id, f.aluno_id, NULL::uuid, 'legacy'::text, f.data_avaliacao,
  f.peso_kg, f.altura_cm, f.imc, f.percentual_gordura, f.massa_magra_kg,
  f.massa_gorda_kg, f.massa_magra_kg, NULL::numeric, NULL::numeric,
  f.circ_braco, f.circ_peitoral, f.circ_cintura, f.circ_quadril, f.circ_coxa, f.circ_panturrilha,
  f.rml_flexao, f.rml_abdominal, f.rml_agachamento, NULL::integer, NULL::integer,
  f.rm_supino, NULL::numeric, NULL::numeric, f.rm_leg_press,
  NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric,
  NULL::numeric, NULL::numeric, NULL::jsonb, NULL::text,
  f.observacoes, f.avaliador_nome, f.avaliador_cref, f.created_at, f.created_at
FROM public.avaliacoes_fisicas f;

GRANT SELECT ON public.v_avaliacoes TO authenticated;
GRANT ALL ON public.v_avaliacoes TO service_role;

CREATE VIEW public.vw_assessments_unified
WITH (security_invoker = true) AS
SELECT au.id, au.aluno_id, au.origem, au.id_externo, au.sincronizado,
  au.data_avaliacao, au.created_at, au.updated_at,
  au.peso, au.altura, au.imc, au.gordura_corporal, au.massa_muscular,
  au.massa_gorda, au.massa_magra, au.agua_corporal, au.taxa_metabolica,
  au.circunferencia_braco, au.circunferencia_peitoral, au.circunferencia_cintura,
  au.circunferencia_quadril, au.circunferencia_coxa, au.circunferencia_panturrilha,
  au.rml_abs, au.rml_flexao, au.rml_agachamento, au.rml_pull, au.rml_elevacao_p,
  au.rm1_empurrar_perna, au.rm1_puxar_costas, au.rm1_empurrar_superior, au.rm1_puxar_inferior,
  au.dobra_triceps, au.dobra_peitoral, au.dobra_abdominal, au.dobra_suprailiaca,
  au.dobra_coxa, au.dobra_panturrilha, au.dobra_subescapular, au.dobra_axilar_media,
  au.exames, au.dados_adicionais, au.avaliacao_exames, au.observacoes,
  au.avaliador_nome, au.avaliador_cref, au.athlete_id,
  COALESCE(au.athlete_id, a.id) AS resolved_athlete_id
FROM public.avaliacoes_unificadas au
LEFT JOIN public.athletes a ON au.aluno_id = a.aluno_id;

GRANT SELECT ON public.vw_assessments_unified TO authenticated;
GRANT ALL ON public.vw_assessments_unified TO service_role;

CREATE VIEW public.v_assessment_canonical
WITH (security_invoker = true) AS
SELECT id,
  COALESCE(athlete_id, aluno_id) AS athlete_id,
  data_avaliacao, peso, altura, imc,
  rm1_empurrar_perna, rm1_empurrar_superior, rm1_puxar_costas, rm1_puxar_inferior,
  rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p, rml_abs,
  core_prancha_seg, core_side_plank_esq_seg, core_side_plank_dir_seg,
  cardio_sprint_vel, cardio_bpm_repouso, cardio_bpm_max,
  mob_overhead_squat, mob_quadril, mob_tornozelo, mob_ombro,
  score_forca, score_resistencia, score_core, score_cardio, score_mobilidade, score_global,
  flags_inteligentes, origem, created_at, updated_at
FROM public.avaliacoes_unificadas;

GRANT SELECT ON public.v_assessment_canonical TO authenticated;
GRANT ALL ON public.v_assessment_canonical TO service_role;

CREATE VIEW public.vw_hub_status
WITH (security_invoker = true) AS
SELECT a.id AS athlete_id,
  a.name, a.sync_score, a.total_xp, a.level,
  COALESCE((SELECT count(*)::integer FROM workout_executions we
    WHERE we.athlete_id = a.id AND we.workout_date >= (now() - '7 days'::interval)), 0) AS treinos_semana,
  COALESCE((SELECT COALESCE(sum(we.duration_minutes), 0::bigint)::integer FROM workout_executions we
    WHERE we.athlete_id = a.id AND we.workout_date >= (now() - '7 days'::interval)), 0) AS minutos_semana,
  COALESCE((SELECT count(*)::integer FROM nutrition_logs nl
    WHERE nl.athlete_id = a.id AND nl.created_at >= (now() - '7 days'::interval)), 0) AS nutri_semana,
  EXISTS (SELECT 1 FROM avaliacoes_unificadas av WHERE av.athlete_id = a.id) AS missao_avaliacao,
  EXISTS (SELECT 1 FROM planos_de_treino_gerados p WHERE p.athlete_id = a.id AND p.status = 'active') AS missao_plano,
  EXISTS (SELECT 1 FROM workout_executions we WHERE we.athlete_id = a.id) AS missao_primeiro_treino,
  (SELECT count(DISTINCT we.workout_date) >= 3 FROM workout_executions we
    WHERE we.athlete_id = a.id AND we.workout_date >= (now() - '7 days'::interval)) AS missao_3dias,
  (SELECT count(DISTINCT we.workout_date) >= 7 FROM workout_executions we
    WHERE we.athlete_id = a.id AND we.workout_date >= (now() - '30 days'::interval)) AS missao_7dias
FROM public.athletes a;

GRANT SELECT ON public.vw_hub_status TO authenticated;
GRANT ALL ON public.vw_hub_status TO service_role;

CREATE VIEW public.vw_performance_athlete
WITH (security_invoker = true) AS
SELECT a.id AS athlete_id, a.name,
  COALESCE(asc2.score_normalized, 0::numeric) AS score_geral,
  COALESCE(asc2.churn_risk, 'baixo'::text) AS churn_risk,
  COALESCE(asc2.stagnation_flag, false) AS stagnation,
  av.gordura_corporal, av.massa_muscular,
  av.score_forca, av.score_resistencia, av.score_core, av.score_cardio, av.score_mobilidade, av.score_global,
  av.data_avaliacao AS ultima_avaliacao,
  (SELECT COALESCE(sum(sr.weight_kg), 0::numeric) FROM strength_records sr
    WHERE sr.user_id = aal.user_id
      AND (sr.exercise_name ILIKE ANY (ARRAY['%supino%','%agachamento%','%puxada%','%deadlift%','%terra%']))
      AND sr.recorded_at >= (now() - '90 days'::interval)) AS forca_total_kg,
  (SELECT count(*) FROM personal_records pr WHERE pr.aluno_id = a.id) AS total_prs
FROM public.athletes a
LEFT JOIN public.athlete_auth_link aal ON aal.athlete_id = a.id
LEFT JOIN public.aluno_score_composite asc2 ON asc2.aluno_id = a.id
LEFT JOIN LATERAL (
  SELECT av2.gordura_corporal, av2.massa_muscular, av2.data_avaliacao,
    av2.score_forca, av2.score_resistencia, av2.score_core, av2.score_cardio, av2.score_mobilidade, av2.score_global
  FROM public.avaliacoes_unificadas av2
  WHERE av2.athlete_id = a.id
  ORDER BY av2.data_avaliacao DESC LIMIT 1
) av ON true;

GRANT SELECT ON public.vw_performance_athlete TO authenticated;
GRANT ALL ON public.vw_performance_athlete TO service_role;;
