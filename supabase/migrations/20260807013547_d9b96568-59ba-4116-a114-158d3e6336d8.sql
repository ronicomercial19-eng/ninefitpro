-- Visão canônica dos planos de treino do atleta (leitura, não destrutiva)
CREATE OR REPLACE VIEW public.v_athlete_workout_plans_canonical
WITH (security_invoker = true) AS
  SELECT
    sta.id,
    'student_training_assignments'::text AS source_table,
    sta.student_id                        AS athlete_id,
    sta.created_by                        AS professor_id,
    sta.training_name                     AS title,
    sta.training_description              AS description,
    NULL::text                            AS goal,
    NULL::integer                         AS duration_weeks,
    sta.start_date::date                  AS start_date,
    sta.end_date::date                    AS end_date,
    CASE WHEN sta.is_active THEN 'active' ELSE 'inactive' END AS status,
    sta.training_data                     AS plan_data,
    sta.created_at,
    sta.updated_at
  FROM public.student_training_assignments sta

  UNION ALL
  SELECT
    p.id,
    'planos_treino_aluno',
    p.aluno_id,
    p.professor_id,
    p.nome_plano,
    p.descricao,
    p.objetivo,
    p.duracao_semanas,
    p.data_inicio::date,
    p.data_fim::date,
    p.status,
    p.estrutura_treino,
    p.created_at,
    p.updated_at
  FROM public.planos_treino_aluno p

  UNION ALL
  SELECT
    g.id,
    'planos_de_treino_gerados',
    g.athlete_id,
    g.professor_id,
    g.nome_plano,
    NULL,
    g.objetivo,
    g.duracao_semanas,
    NULL::date,
    NULL::date,
    g.status,
    g.plano_completo,
    g.created_at,
    g.updated_at
  FROM public.planos_de_treino_gerados g

  UNION ALL
  SELECT
    m.id,
    'modelos_de_treino',
    m.athlete_id,
    NULL::uuid,
    m.nome,
    m.descricao,
    m.objetivo,
    m.duracao_em_semanas,
    NULL::date,
    NULL::date,
    'template',
    to_jsonb(m.periodizacao),
    m.criado_em,
    m.criado_em
  FROM public.modelos_de_treino m

  UNION ALL
  SELECT
    gw.id,
    'generated_workout_plans',
    a.id,
    NULL::uuid,
    'Plano gerado',
    gw.variation_used,
    NULL,
    (gw.duration_months * 4),
    NULL::date,
    NULL::date,
    gw.status,
    gw.plan_data,
    gw.generated_at,
    gw.generated_at
  FROM public.generated_workout_plans gw
  LEFT JOIN public.athletes a ON a.user_id = gw.user_profile_id;

GRANT SELECT ON public.v_athlete_workout_plans_canonical TO authenticated;

-- Visão canônica do catálogo de modelos/templates (não pertencem a um atleta)
CREATE OR REPLACE VIEW public.v_workout_templates_canonical
WITH (security_invoker = true) AS
  SELECT
    tp.id,
    'training_programs'::text AS source_table,
    tp.name                   AS title,
    tp.description,
    tp.goal,
    tp.duration_weeks,
    tp.frequency_per_week,
    tp.program_structure      AS template_data,
    tp.created_at
  FROM public.training_programs tp

  UNION ALL
  SELECT
    wt.id,
    'workout_templates',
    wt.name,
    NULL,
    wt.goal,
    NULL::integer,
    NULL::integer,
    wt.template_data,
    wt.created_at
  FROM public.workout_templates wt

  UNION ALL
  SELECT
    wm.id,
    'workout_models',
    wm.name,
    wm.method_description,
    wm.general_objective,
    NULL::integer,
    NULL::integer,
    wm.exercise_fields,
    wm.created_at
  FROM public.workout_models wm;

GRANT SELECT ON public.v_workout_templates_canonical TO authenticated;;
