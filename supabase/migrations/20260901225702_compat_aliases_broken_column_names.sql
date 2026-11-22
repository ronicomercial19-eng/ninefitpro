-- Shims de compatibilidade: o front consulta nomes de coluna que nunca existiram nessas tabelas
-- (bug de nomenclatura, rodando o dia todo nos logs). Em vez de esperar o próximo deploy do
-- front (Lovable fora de sync agora), aliasamos no banco pra parar de quebrar já.

-- bio_hrv_logs: front pede .value e .athlete_id; reais são .hrv_ms e .user_id
ALTER TABLE public.bio_hrv_logs ADD COLUMN IF NOT EXISTS value numeric GENERATED ALWAYS AS (hrv_ms) STORED;
ALTER TABLE public.bio_hrv_logs ADD COLUMN IF NOT EXISTS athlete_id uuid GENERATED ALWAYS AS (user_id) STORED;

-- bio_sleep_logs: front pede .hours e .athlete_id; reais são .duration_min (minutos) e .user_id
ALTER TABLE public.bio_sleep_logs ADD COLUMN IF NOT EXISTS hours numeric GENERATED ALWAYS AS (round(duration_min::numeric / 60.0, 2)) STORED;
ALTER TABLE public.bio_sleep_logs ADD COLUMN IF NOT EXISTS athlete_id uuid GENERATED ALWAYS AS (user_id) STORED;

-- bio_recovery_state: front pede .score; real é .recovery_score
ALTER TABLE public.bio_recovery_state ADD COLUMN IF NOT EXISTS score integer GENERATED ALWAYS AS (recovery_score) STORED;

-- workout_executions: front pede .rpe; real é .avg_rpe
ALTER TABLE public.workout_executions ADD COLUMN IF NOT EXISTS rpe numeric GENERATED ALWAYS AS (avg_rpe) STORED;;
