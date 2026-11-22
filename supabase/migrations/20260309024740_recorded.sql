
-- Fase 3: Canonical Views — Consolidação de dados

-- 1. v_exercises_canonical
CREATE OR REPLACE VIEW public.v_exercises_canonical AS
  SELECT id, name, description, target_muscles, equipment, difficulty_level,
    video_url, image_url, gif_url, instructions, phase, goal, muscle_groups,
    created_at, 'exercises' AS source_table
  FROM public.exercises
  UNION ALL
  SELECT id, nome AS name, NULL AS description, ARRAY[grupo_muscular] AS target_muscles,
    NULL AS equipment, NULL AS difficulty_level, video_url, NULL AS image_url,
    NULL AS gif_url, NULL AS instructions, NULL AS phase, NULL AS goal,
    NULL::jsonb AS muscle_groups, criado_em AS created_at, 'exercicios_novos' AS source_table
  FROM public.exercicios_novos
  WHERE id NOT IN (SELECT id FROM public.exercises);

-- 2. v_workouts_canonical
CREATE OR REPLACE VIEW public.v_workouts_canonical AS
  SELECT p.id, p.nome_plano AS name, p.descricao AS description, p.objetivo AS objective,
    p.duracao_semanas AS duration_weeks, p.frequencia_semanal AS weekly_frequency,
    p.tipo_periodizacao AS periodization_type, p.fase_atual AS current_phase,
    p.semana_atual AS current_week, p.status, p.aluno_id AS student_id,
    p.professor_id AS coach_id, p.estrutura_treino AS structure_data,
    p.created_at, p.updated_at, 'planos_treino_aluno' AS source_table, 'plan' AS record_type
  FROM public.planos_treino_aluno p
  UNION ALL
  SELECT wm.id, wm.name, wm.general_objective AS description, wm.general_objective AS objective,
    NULL::integer AS duration_weeks, NULL::integer AS weekly_frequency,
    wm.periodization_phase AS periodization_type, wm.periodization_phase AS current_phase,
    wm.week_number AS current_week, 'template' AS status, NULL::uuid AS student_id,
    NULL::uuid AS coach_id, wm.exercise_fields AS structure_data,
    wm.created_at, wm.updated_at, 'workout_models' AS source_table, 'model' AS record_type
  FROM public.workout_models wm
  UNION ALL
  SELECT m.id, m.nome AS name, m.descricao AS description, m.objetivo AS objective,
    m.duracao_em_semanas AS duration_weeks, NULL::integer AS weekly_frequency,
    m.tipo_modelo AS periodization_type, NULL AS current_phase, NULL::integer AS current_week,
    COALESCE(m.tag, 'active') AS status, m.estudante_id AS student_id, NULL::uuid AS coach_id,
    m.periodizacao AS structure_data, m.criado_em AS created_at, m.criado_em AS updated_at,
    'modelos_de_treino' AS source_table, 'legacy_model' AS record_type
  FROM public.modelos_de_treino m;

-- 3. v_progress_canonical
CREATE OR REPLACE VIEW public.v_progress_canonical AS
  SELECT h.id, h.aluno_id AS student_id, h.plano_treino_id AS plan_id,
    h.data_treino::text AS workout_date, h.dia_treino AS day_number,
    h.semana_treino AS week_number, h.duracao_minutos::numeric AS duration_minutes,
    h.volume_total_kg AS total_volume_kg, h.pse_sessao::numeric AS rpe,
    h.intensidade_media AS avg_intensity, h.exercicios_realizados AS exercises_data,
    h.notas_aluno AS student_notes, h.notas_professor AS coach_notes,
    h.created_at, 'historico_treinos_realizados' AS source_table
  FROM public.historico_treinos_realizados h
  UNION ALL
  SELECT wl.id, wl.student_id, wl.workout_id AS plan_id,
    wl.started_at::date::text AS workout_date, NULL::integer AS day_number,
    NULL::integer AS week_number,
    EXTRACT(EPOCH FROM (wl.completed_at - wl.started_at))::numeric/60 AS duration_minutes,
    NULL::numeric AS total_volume_kg, wl.rating::numeric AS rpe,
    NULL::numeric AS avg_intensity, NULL::jsonb AS exercises_data,
    wl.notes AS student_notes, NULL::text AS coach_notes,
    wl.started_at AS created_at, 'workout_logs' AS source_table
  FROM public.workout_logs wl;

-- 4. v_plans_canonical
CREATE OR REPLACE VIEW public.v_plans_canonical AS
  SELECT p.id_plano AS id, p.nome_plano AS name, p.descricao AS description,
    p.duracao_dias AS duration_days, p.preco AS price, p.ativo AS is_active,
    p.recursos_incluidos AS features, p.created_at, p.updated_at, 'planos' AS source_table
  FROM public.planos p;

-- Grants
GRANT SELECT ON public.v_exercises_canonical TO authenticated, anon;
GRANT SELECT ON public.v_workouts_canonical TO authenticated, anon;
GRANT SELECT ON public.v_progress_canonical TO authenticated, anon;
GRANT SELECT ON public.v_plans_canonical TO authenticated, anon;
;
