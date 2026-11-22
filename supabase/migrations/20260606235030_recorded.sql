
-- Resolve aluno interno a partir do ID externo do FitPro
CREATE OR REPLACE FUNCTION public.resolve_aluno_by_external(p_external_id text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT athlete_id
  FROM public.fitpro_student_map
  WHERE fitpro_student_id = p_external_id
  ORDER BY last_seen_at DESC NULLS LAST
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_aluno_by_external(text) TO service_role, authenticated;

-- Versão de prescrever_treino para chamadas server-side (após validação x-partner-key)
-- Impersona o professor do aluno (ou admin se não houver professor) para satisfazer auth.uid()
CREATE OR REPLACE FUNCTION public.prescrever_treino_partner(
  p_aluno_id uuid,
  p_data date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof uuid;
  v_admin uuid;
BEGIN
  SELECT professor_id INTO v_prof FROM public.alunos WHERE id = p_aluno_id;
  IF v_prof IS NULL THEN
    -- fallback: primeiro admin
    SELECT user_id INTO v_admin FROM public.user_roles WHERE role IN ('admin','super_admin') LIMIT 1;
    v_prof := v_admin;
  END IF;
  IF v_prof IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'motivo', 'sem_professor_para_impersonar');
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_prof::text, 'role', 'authenticated')::text,
    true
  );

  RETURN public.prescrever_treino(p_aluno_id, p_data);
END;
$$;

GRANT EXECUTE ON FUNCTION public.prescrever_treino_partner(uuid, date) TO service_role;

-- Valida chave parceiro contra fitpro_connections.api_key_hash (SHA-256 hex da API key)
CREATE OR REPLACE FUNCTION public.validate_partner_key(p_key text)
RETURNS TABLE(connection_id uuid, professor_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT id, professor_id
  FROM public.fitpro_connections
  WHERE status = 'active'
    AND api_key_hash = encode(digest(p_key, 'sha256'), 'hex')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.validate_partner_key(text) TO service_role;
;
