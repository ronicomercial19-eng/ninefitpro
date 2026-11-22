
-- ============================================================
-- BLOQUEIO DEFINITIVO: Staff/Prof inacessível para role 'user'
-- ============================================================

-- 1. Função que o frontend chama no mount de qualquer rota staff
-- Se não for professor/admin → lança exceção → frontend redireciona
CREATE OR REPLACE FUNCTION public.fn_assert_is_staff()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(get_user_role(auth.uid()), 'user');
  
  IF v_role NOT IN ('professor','trainer','admin','super_admin') THEN
    RAISE EXCEPTION 'Acesso negado. Área restrita a professores e administradores.'
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;
  
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assert_is_staff() TO authenticated;

-- 2. Cria view segura de alunos — só professores veem
-- Alunos tentando acessar a view não encontram nada
CREATE OR REPLACE VIEW public.vw_meus_alunos AS
SELECT a.*
FROM alunos a
WHERE a.professor_id = auth.uid()
  AND fn_is_staff(auth.uid()) = true;

-- 3. Bloqueia acesso direto à tabela alunos para role 'user' comum
-- Remove a policy que permitia aluno ver linha própria na tabela do professor
DROP POLICY IF EXISTS "alunos_select_access" ON alunos;

CREATE POLICY "alunos_select_access" ON alunos
  FOR SELECT USING (
    -- Professor vê seus próprios alunos
    professor_id = auth.uid()
    OR
    -- Admin vê todos
    has_role(auth.uid(), 'admin'::app_role)
    -- Alunos NÃO veem mais esta tabela diretamente
    -- (seus dados ficam em athletes, não em alunos)
  );

-- 4. RPC segura para dashboard do professor — bloqueia alunos na origem
CREATE OR REPLACE FUNCTION public.fn_get_professor_panel(p_professor_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role    text;
  v_alunos  json;
  v_stats   json;
BEGIN
  -- Bloqueia qualquer um que não seja staff
  v_role := COALESCE(get_user_role(v_user_id), 'user');
  IF v_role NOT IN ('professor','trainer','admin','super_admin') THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  -- Lista alunos do professor
  SELECT json_agg(row_to_json(a)) INTO v_alunos
  FROM (
    SELECT id, nome, email, objetivo, nivel,
           created_at, ultimo_treino
    FROM alunos
    WHERE professor_id = v_user_id
    ORDER BY created_at DESC
  ) a;

  -- Stats do painel
  SELECT json_build_object(
    'total_alunos', COUNT(*),
    'ativos_semana', COUNT(*) FILTER (WHERE ultimo_treino >= CURRENT_DATE - 7)
  ) INTO v_stats
  FROM alunos WHERE professor_id = v_user_id;

  RETURN json_build_object(
    'role',   v_role,
    'alunos', COALESCE(v_alunos, '[]'::json),
    'stats',  v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_professor_panel(uuid) TO authenticated;
;
