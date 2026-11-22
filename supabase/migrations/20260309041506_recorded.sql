-- PRIORIDADE 4: Limpeza de Duplicacoes (Merge de dados para tabelas canônicas)

-- 1. Migrar exercicios de exercise_library e exercicios_novos para exercises (se não existirem)
-- Apenas insere novos exercicios na tabela canonical
INSERT INTO public.exercises (name, target_muscles, muscle_groups, created_at)
SELECT 
  nome::text,
  ARRAY[categoria->>'primario'],
  categoria,
  now()
FROM public.exercise_library
WHERE nome IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM public.exercises e WHERE LOWER(e.name) = LOWER(exercise_library.nome::text)
);

INSERT INTO public.exercises (name, target_muscles, video_url, created_at)
SELECT 
  nome,
  ARRAY[grupo_muscular],
  video_url,
  COALESCE(criado_em::timestamp with time zone, now())
FROM public.exercicios_novos
WHERE nome IS NOT NULL 
AND NOT EXISTS (
  SELECT 1 FROM public.exercises e WHERE LOWER(e.name) = LOWER(exercicios_novos.nome)
);

-- 2. Migrar supersets se a tabela supersets existir e super_sets também
-- Copiando de super_sets para supersets (assumindo que supersets é a nova e super_sets a antiga)
-- Verificando existência para evitar erros. (Opcional: podemos só adicionar comentários)

-- Adicionando comentários nas tabelas deprecated para desencorajar uso futuro
COMMENT ON TABLE public.alunos IS 'DEPRECATED: Use public.athletes instead.';
COMMENT ON TABLE public.students IS 'DEPRECATED: Use public.athletes instead.';
COMMENT ON TABLE public.estudantes IS 'DEPRECATED: Use public.athletes instead.';
COMMENT ON TABLE public.exercise_library IS 'DEPRECATED: Use public.exercises instead.';
COMMENT ON TABLE public.exercicios_novos IS 'DEPRECATED: Use public.exercises instead.';
COMMENT ON TABLE public.avaliacoes IS 'DEPRECATED: Use public.avaliacoes_unificadas instead.';
COMMENT ON TABLE public.avaliacoes_fisicas IS 'DEPRECATED: Use public.avaliacoes_unificadas instead.';
COMMENT ON TABLE public.historico_avaliacoes IS 'DEPRECATED: Use public.avaliacoes_unificadas instead.';
COMMENT ON TABLE public.historico_treinos_realizados IS 'DEPRECATED: Use public.workout_executions instead.';
COMMENT ON TABLE public.progresso_aluno IS 'DEPRECATED: Use public.workout_progress instead.';

-- Crie views unificadas para os dominios que migraram (já fiz algumas)
;
