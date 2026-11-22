
CREATE OR REPLACE VIEW public.vw_athlete_legacy_map
WITH (security_invoker = true) AS
SELECT
  a.id AS athlete_id,
  a.email AS athlete_email,
  a.user_id AS athlete_user_id,
  est.id AS estudante_id,
  al.id AS aluno_id,
  st.id AS student_id
FROM public.athletes a
LEFT JOIN public.estudantes est
  ON est.email IS NOT NULL AND lower(est.email) = lower(a.email)
LEFT JOIN public.alunos al
  ON al.email IS NOT NULL AND lower(al.email) = lower(a.email)
LEFT JOIN public.students st
  ON st.email IS NOT NULL AND lower(st.email) = lower(a.email);

GRANT SELECT ON public.vw_athlete_legacy_map TO authenticated, service_role;

ALTER TABLE public.modelos_de_treino
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL;
ALTER TABLE public.planos_de_treino_gerados
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL;
ALTER TABLE public.periodizacoes_novas
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL;
ALTER TABLE public.progresso_aluno
  ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.athletes(id) ON DELETE SET NULL;

UPDATE public.modelos_de_treino m
SET athlete_id = map.athlete_id
FROM public.vw_athlete_legacy_map map
WHERE m.athlete_id IS NULL AND m.estudante_id IS NOT NULL AND map.estudante_id = m.estudante_id;

UPDATE public.planos_de_treino_gerados p
SET athlete_id = map.athlete_id
FROM public.vw_athlete_legacy_map map
WHERE p.athlete_id IS NULL AND p.estudante_id IS NOT NULL AND map.estudante_id = p.estudante_id;

UPDATE public.periodizacoes_novas pn
SET athlete_id = map.athlete_id
FROM public.vw_athlete_legacy_map map
WHERE pn.athlete_id IS NULL AND pn.estudante_id IS NOT NULL AND map.estudante_id = pn.estudante_id;

UPDATE public.progresso_aluno pa
SET athlete_id = map.athlete_id
FROM public.vw_athlete_legacy_map map
WHERE pa.athlete_id IS NULL AND pa.id_aluno IS NOT NULL
  AND (map.aluno_id = pa.id_aluno OR map.estudante_id = pa.id_aluno OR map.student_id = pa.id_aluno);

INSERT INTO public.migration_unmatched (source_table, source_id, reason, payload)
SELECT 'modelos_de_treino', id, 'no athlete_id mapped', jsonb_build_object('estudante_id', estudante_id)
FROM public.modelos_de_treino WHERE athlete_id IS NULL AND estudante_id IS NOT NULL;

INSERT INTO public.migration_unmatched (source_table, source_id, reason, payload)
SELECT 'planos_de_treino_gerados', id, 'no athlete_id mapped', jsonb_build_object('estudante_id', estudante_id)
FROM public.planos_de_treino_gerados WHERE athlete_id IS NULL AND estudante_id IS NOT NULL;

INSERT INTO public.migration_unmatched (source_table, source_id, reason, payload)
SELECT 'periodizacoes_novas', id, 'no athlete_id mapped', jsonb_build_object('estudante_id', estudante_id)
FROM public.periodizacoes_novas WHERE athlete_id IS NULL AND estudante_id IS NOT NULL;

INSERT INTO public.migration_unmatched (source_table, source_id, reason, payload)
SELECT 'progresso_aluno', id_progresso, 'no athlete_id mapped', jsonb_build_object('id_aluno', id_aluno)
FROM public.progresso_aluno WHERE athlete_id IS NULL AND id_aluno IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_modelos_de_treino_athlete_id ON public.modelos_de_treino(athlete_id);
CREATE INDEX IF NOT EXISTS idx_planos_de_treino_gerados_athlete_id ON public.planos_de_treino_gerados(athlete_id);
CREATE INDEX IF NOT EXISTS idx_periodizacoes_novas_athlete_id ON public.periodizacoes_novas(athlete_id);
CREATE INDEX IF NOT EXISTS idx_progresso_aluno_athlete_id ON public.progresso_aluno(athlete_id);

CREATE OR REPLACE VIEW public.vw_athlete_full_profile
WITH (security_invoker = true) AS
SELECT
  a.id AS athlete_id,
  a.coach_id,
  a.name,
  a.email,
  a.user_id,
  a.nivel,
  a.objetivo,
  a.peso_kg,
  a.altura_cm,
  a.sessions_per_week,
  a.total_xp,
  a.level,
  ap.id AS active_periodization_id,
  ap.periodization_model_id,
  ap.status AS periodization_status,
  ap.assigned_at AS periodization_assigned_at,
  ptg.id AS active_plan_id,
  ptg.nome_plano AS active_plan_name,
  ptg.status AS active_plan_status,
  lp.id_progresso AS last_progress_id,
  lp.data_registro AS last_progress_date,
  lp.peso_kg AS last_progress_weight
FROM public.athletes a
LEFT JOIN LATERAL (
  SELECT * FROM public.athlete_periodizations
  WHERE athlete_id = a.id AND status = 'active'
  ORDER BY assigned_at DESC LIMIT 1
) ap ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.planos_de_treino_gerados
  WHERE athlete_id = a.id AND COALESCE(status,'') <> 'archived'
  ORDER BY created_at DESC LIMIT 1
) ptg ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.progresso_aluno
  WHERE athlete_id = a.id
  ORDER BY data_registro DESC LIMIT 1
) lp ON true;

GRANT SELECT ON public.vw_athlete_full_profile TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_athlete_bootstrap_skeletons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.athlete_periodizations (athlete_id, periodization_model_id, status, assigned_at, notes)
    VALUES (NEW.id, 'pending', 'pending', now(), 'Auto-created on athlete insert');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.planos_de_treino_gerados
      (athlete_id, nome_plano, objetivo, nivel, status, plano_completo, created_at)
    VALUES
      (NEW.id, 'Plano pendente', NEW.objetivo, NEW.nivel, 'pending', '{}'::jsonb, now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.system_events (event_type, payload, created_at)
    VALUES ('athlete.bootstrap_skeletons', jsonb_build_object('athlete_id', NEW.id), now());
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_athlete_bootstrap_skeletons ON public.athletes;
CREATE TRIGGER trg_athlete_bootstrap_skeletons
AFTER INSERT ON public.athletes
FOR EACH ROW
EXECUTE FUNCTION public.fn_athlete_bootstrap_skeletons();
