-- Garante no máximo 1 periodização in_progress/active por atleta.
-- Índice único parcial: não precisa de trigger, Postgres rejeita o INSERT/UPDATE
-- direto se já existir outra linha ativa pro mesmo athlete_id.
CREATE UNIQUE INDEX IF NOT EXISTS ux_athlete_periodizations_unica_ativa
ON athlete_periodizations (athlete_id)
WHERE status IN ('in_progress', 'active');;
