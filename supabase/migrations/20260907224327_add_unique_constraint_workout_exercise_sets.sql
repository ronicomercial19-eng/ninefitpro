
-- FIX: workout_exercise_sets não tinha constraint única em
-- (execution_id, exercise_order, set_number), então o upsert() em
-- progress-sync/set_log nunca conseguia fazer update de fato — sempre
-- inseria uma linha nova. Sem impacto até agora (usuário não desmarca
-- série), mas criaria duplicatas silenciosas assim que isso acontecesse,
-- inflando o cálculo de total_volume_kg em workout_complete.
ALTER TABLE workout_exercise_sets
  ADD CONSTRAINT workout_exercise_sets_unique_slot
  UNIQUE (execution_id, exercise_order, set_number);
;
