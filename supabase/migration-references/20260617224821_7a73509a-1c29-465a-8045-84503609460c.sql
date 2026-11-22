-- Realtime
ALTER TABLE public.workout_executions REPLICA IDENTITY FULL;
ALTER TABLE public.athletes REPLICA IDENTITY FULL;
ALTER TABLE public.planos_de_treino_gerados REPLICA IDENTITY FULL;
ALTER TABLE public.ninefit_checkins REPLICA IDENTITY FULL;
ALTER TABLE public.nutrition_logs REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_executions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.planos_de_treino_gerados; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.ninefit_checkins; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.nutrition_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.athletes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Backfill athlete_id em ninefit_checkins
UPDATE public.ninefit_checkins c
SET athlete_id = aal.athlete_id
FROM public.athlete_auth_link aal
WHERE aal.user_id = c.aluno_id AND c.athlete_id IS NULL;

-- share_events: garantir athlete_id e shared_at
ALTER TABLE public.share_events ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL;
ALTER TABLE public.share_events ADD COLUMN IF NOT EXISTS shared_at timestamptz NOT NULL DEFAULT now();

-- Cleanup mocks
DELETE FROM public.workout_executions WHERE notes ILIKE '%mock%' OR notes ILIKE '%test%' OR notes ILIKE '%fake%';
DELETE FROM public.planos_de_treino_gerados WHERE plano_completo::text = '{}' OR plano_completo IS NULL;
DELETE FROM public.athlete_planning_history WHERE sync_data::text = '{}' OR sync_data IS NULL;