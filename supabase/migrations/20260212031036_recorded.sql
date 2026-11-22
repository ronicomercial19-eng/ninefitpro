ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS tempo_disponivel_min integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS historico_lesoes text,
  ADD COLUMN IF NOT EXISTS foco_muscular varchar DEFAULT 'corpo_todo',
  ADD COLUMN IF NOT EXISTS condicionamento_cardio varchar DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS experiencia_pesos_livres varchar DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS preferencia_intensidade varchar DEFAULT 'moderado',
  ADD COLUMN IF NOT EXISTS preferencia_cardio varchar DEFAULT 'integrado',
  ADD COLUMN IF NOT EXISTS preferencia_equipamento varchar DEFAULT 'ambos',
  ADD COLUMN IF NOT EXISTS treina_sozinho boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS horario_preferido varchar DEFAULT 'manha',
  ADD COLUMN IF NOT EXISTS meta_tempo_meses integer DEFAULT 3;;
