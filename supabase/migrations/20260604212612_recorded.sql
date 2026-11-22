
CREATE OR REPLACE VIEW public.vw_periodizacao_ativa_aluno AS
SELECT
  a.id AS aluno_id,
  COALESCE(fsp.goal, ap.notes, a.objetivo) AS objetivo,
  COALESCE(fsp.training_level, a.nivel_experiencia) AS nivel,
  COALESCE(fsp.current_phase, 'acumulacao') AS fase_atual,
  COALESCE(fsp.cycle_week, 1) AS semana_atual,
  fsp.volume_level,
  fsp.intensity_level,
  fsp.recovery_status,
  fsp.adherence_level,
  fsp.fatigue_level,
  ap.annual_plan_id,
  ap.id AS athlete_periodization_id,
  fsp.id AS fitpro_periodization_id,
  CASE
    WHEN ap.id IS NOT NULL THEN 'internal'
    WHEN fsp.id IS NOT NULL THEN 'fitpro'
    ELSE NULL
  END AS fonte,
  (ap.id IS NOT NULL OR fsp.id IS NOT NULL) AS tem_periodizacao
FROM public.alunos a
LEFT JOIN LATERAL (
  SELECT * FROM public.athlete_periodizations
  WHERE athlete_id = a.id AND status IN ('in_progress','assigned','active')
  ORDER BY assigned_at DESC NULLS LAST, created_at DESC
  LIMIT 1
) ap ON true
LEFT JOIN LATERAL (
  SELECT * FROM public.fitpro_smartperiodizer_periodizations
  WHERE fitpro_student_id = a.id AND status IN ('active','in_progress')
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1
) fsp ON true;

GRANT SELECT ON public.vw_periodizacao_ativa_aluno TO authenticated;
GRANT SELECT ON public.vw_periodizacao_ativa_aluno TO service_role;

CREATE OR REPLACE FUNCTION public.tem_periodizacao_ativa(p_aluno_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tem_periodizacao FROM public.vw_periodizacao_ativa_aluno WHERE aluno_id = p_aluno_id LIMIT 1),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.notificar_falta_periodizacao(p_aluno_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof uuid;
  v_nome text;
  v_id uuid;
BEGIN
  SELECT professor_id, nome INTO v_prof, v_nome FROM public.alunos WHERE id = p_aluno_id;
  IF v_prof IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (
    v_prof,
    'Periodização ausente',
    'O aluno ' || COALESCE(v_nome,'(sem nome)') || ' não possui periodização ativa. Cadastre no SmartPeriodizer para liberar a geração automática de treinos.',
    'warning',
    '/periodization-upload?aluno=' || p_aluno_id::text
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tem_periodizacao_ativa(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notificar_falta_periodizacao(uuid) TO authenticated, service_role;
;
