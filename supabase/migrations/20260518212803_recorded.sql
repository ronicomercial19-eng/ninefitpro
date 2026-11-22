-- ======================================================
-- Helper: is current user the aluno's owner-student?
-- ======================================================
CREATE OR REPLACE FUNCTION public.is_aluno_student(p_aluno_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.athlete_auth_link
    WHERE athlete_id = p_aluno_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_aluno_professor(p_aluno_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.alunos
    WHERE id = p_aluno_id AND professor_id = p_user_id
  );
$$;

-- ======================================================
-- 1. treinos_realizados
-- ======================================================
CREATE TABLE IF NOT EXISTS public.treinos_realizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_treino date NOT NULL DEFAULT CURRENT_DATE,
  nome text,
  exercicios jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{nome, sets:[{peso,reps,rpe}]}]
  volume_total numeric NOT NULL DEFAULT 0,       -- soma peso*reps
  pse_medio numeric,                             -- 1-10
  duracao_min integer,
  origem text NOT NULL DEFAULT 'manual',         -- manual|fitpro|periodizer|wearable
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treinos_realizados_aluno_data
  ON public.treinos_realizados (aluno_id, data_treino DESC);

ALTER TABLE public.treinos_realizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "treinos: aluno vê o próprio" ON public.treinos_realizados
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_aluno_professor(aluno_id, auth.uid())
  OR public.is_aluno_student(aluno_id, auth.uid())
);

CREATE POLICY "treinos: aluno insere próprio" ON public.treinos_realizados
FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.is_aluno_professor(aluno_id, auth.uid())
  OR public.is_aluno_student(aluno_id, auth.uid())
);

CREATE POLICY "treinos: aluno atualiza próprio" ON public.treinos_realizados
FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_aluno_professor(aluno_id, auth.uid())
  OR public.is_aluno_student(aluno_id, auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR public.is_aluno_professor(aluno_id, auth.uid())
  OR public.is_aluno_student(aluno_id, auth.uid())
);

CREATE POLICY "treinos: aluno deleta próprio" ON public.treinos_realizados
FOR DELETE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.is_aluno_professor(aluno_id, auth.uid())
  OR public.is_aluno_student(aluno_id, auth.uid())
);

-- ======================================================
-- 2. registros_carga
-- ======================================================
CREATE TABLE IF NOT EXISTS public.registros_carga (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  treino_id uuid REFERENCES public.treinos_realizados(id) ON DELETE SET NULL,
  exercicio text NOT NULL,
  data_registro date NOT NULL DEFAULT CURRENT_DATE,
  carga_max numeric NOT NULL,
  reps integer,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registros_carga_aluno_ex_data
  ON public.registros_carga (aluno_id, exercicio, data_registro DESC);

ALTER TABLE public.registros_carga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carga: select" ON public.registros_carga FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "carga: insert" ON public.registros_carga FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "carga: update" ON public.registros_carga FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "carga: delete" ON public.registros_carga FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()));

-- ======================================================
-- 3. personal_records
-- ======================================================
CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  exercicio text NOT NULL,
  tipo text NOT NULL DEFAULT 'carga', -- carga|reps|tempo
  valor numeric NOT NULL,
  unidade text NOT NULL DEFAULT 'kg',
  data_pr date NOT NULL DEFAULT CURRENT_DATE,
  treino_id uuid REFERENCES public.treinos_realizados(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pr_aluno_ex_data
  ON public.personal_records (aluno_id, exercicio, data_pr DESC);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr: select" ON public.personal_records FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "pr: insert system" ON public.personal_records FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));

-- Trigger: detecta PR ao inserir registros_carga
CREATE OR REPLACE FUNCTION public.detect_pr_on_carga()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_max numeric;
BEGIN
  SELECT COALESCE(MAX(valor), 0) INTO v_max
  FROM public.personal_records
  WHERE aluno_id = NEW.aluno_id AND exercicio = NEW.exercicio AND tipo = 'carga';

  IF NEW.carga_max > v_max THEN
    INSERT INTO public.personal_records (aluno_id, exercicio, tipo, valor, unidade, data_pr, treino_id)
    VALUES (NEW.aluno_id, NEW.exercicio, 'carga', NEW.carga_max, 'kg', NEW.data_registro, NEW.treino_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_detect_pr_carga ON public.registros_carga;
CREATE TRIGGER trg_detect_pr_carga
AFTER INSERT ON public.registros_carga
FOR EACH ROW EXECUTE FUNCTION public.detect_pr_on_carga();

-- ======================================================
-- 4. metas_progresso
-- ======================================================
CREATE TABLE IF NOT EXISTS public.metas_progresso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  exercicio text,
  metrica text NOT NULL DEFAULT 'carga', -- carga|reps|tempo|peso_corporal|gordura
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_atual numeric NOT NULL DEFAULT 0,
  valor_meta numeric NOT NULL,
  unidade text NOT NULL DEFAULT 'kg',
  prazo date,
  status text NOT NULL DEFAULT 'ativa', -- ativa|concluida|abandonada
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metas_aluno ON public.metas_progresso (aluno_id, status);

ALTER TABLE public.metas_progresso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metas: select" ON public.metas_progresso FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "metas: insert" ON public.metas_progresso FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "metas: update" ON public.metas_progresso FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "metas: delete" ON public.metas_progresso FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));

-- ======================================================
-- 5. user_stats_agg
-- ======================================================
CREATE TABLE IF NOT EXISTS public.user_stats_agg (
  aluno_id uuid PRIMARY KEY REFERENCES public.alunos(id) ON DELETE CASCADE,
  total_treinos_mes integer NOT NULL DEFAULT 0,
  kg_total_mes numeric NOT NULL DEFAULT 0,
  streak_dias integer NOT NULL DEFAULT 0,
  ultimo_treino date,
  prs_count integer NOT NULL DEFAULT 0,
  total_treinos_geral integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats_agg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats: select" ON public.user_stats_agg FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.recalc_user_stats(p_aluno_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_total_mes int;
  v_kg_mes numeric;
  v_ultimo date;
  v_streak int := 0;
  v_check_date date;
  v_prs int;
  v_total_geral int;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(volume_total),0)
  INTO v_total_mes, v_kg_mes
  FROM public.treinos_realizados
  WHERE aluno_id = p_aluno_id
    AND data_treino >= date_trunc('month', CURRENT_DATE)::date;

  SELECT MAX(data_treino) INTO v_ultimo
  FROM public.treinos_realizados WHERE aluno_id = p_aluno_id;

  SELECT COUNT(*) INTO v_total_geral
  FROM public.treinos_realizados WHERE aluno_id = p_aluno_id;

  SELECT COUNT(*) INTO v_prs
  FROM public.personal_records WHERE aluno_id = p_aluno_id;

  -- Streak: dias consecutivos com treino terminando em ultimo
  IF v_ultimo IS NOT NULL THEN
    v_check_date := v_ultimo;
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.treinos_realizados
        WHERE aluno_id = p_aluno_id AND data_treino = v_check_date
      ) THEN
        v_streak := v_streak + 1;
        v_check_date := v_check_date - 1;
      ELSE
        EXIT;
      END IF;
      IF v_streak > 365 THEN EXIT; END IF;
    END LOOP;
    -- só conta streak se último treino é hoje ou ontem
    IF v_ultimo < CURRENT_DATE - 1 THEN v_streak := 0; END IF;
  END IF;

  INSERT INTO public.user_stats_agg (aluno_id, total_treinos_mes, kg_total_mes, streak_dias, ultimo_treino, prs_count, total_treinos_geral, updated_at)
  VALUES (p_aluno_id, v_total_mes, v_kg_mes, v_streak, v_ultimo, v_prs, v_total_geral, now())
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_treinos_mes = EXCLUDED.total_treinos_mes,
    kg_total_mes = EXCLUDED.kg_total_mes,
    streak_dias = EXCLUDED.streak_dias,
    ultimo_treino = EXCLUDED.ultimo_treino,
    prs_count = EXCLUDED.prs_count,
    total_treinos_geral = EXCLUDED.total_treinos_geral,
    updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalc_user_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalc_user_stats(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_recalc_stats_on_treino()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recalc_user_stats(COALESCE(NEW.aluno_id, OLD.aluno_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_treinos_recalc_stats ON public.treinos_realizados;
CREATE TRIGGER trg_treinos_recalc_stats
AFTER INSERT OR UPDATE OR DELETE ON public.treinos_realizados
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_stats_on_treino();

DROP TRIGGER IF EXISTS trg_prs_recalc_stats ON public.personal_records;
CREATE TRIGGER trg_prs_recalc_stats
AFTER INSERT ON public.personal_records
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_stats_on_treino();

-- ======================================================
-- 6. health_metrics
-- ======================================================
CREATE TABLE IF NOT EXISTS public.health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_metrica date NOT NULL DEFAULT CURRENT_DATE,
  passos integer,
  sono_horas numeric,
  agua_litros numeric,
  calorias integer,
  hr_repouso integer,
  origem text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, data_metrica)
);
CREATE INDEX IF NOT EXISTS idx_health_aluno_data ON public.health_metrics (aluno_id, data_metrica DESC);

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health: select" ON public.health_metrics FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "health: insert" ON public.health_metrics FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));
CREATE POLICY "health: update" ON public.health_metrics FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()))
WITH CHECK (public.is_admin(auth.uid()) OR public.is_aluno_professor(aluno_id, auth.uid()) OR public.is_aluno_student(aluno_id, auth.uid()));

-- ======================================================
-- 7. push_subscriptions
-- ======================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  aluno_id uuid REFERENCES public.alunos(id) ON DELETE SET NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push: own select" ON public.push_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "push: own insert" ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "push: own delete" ON public.push_subscriptions FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ======================================================
-- Realtime publication
-- ======================================================
ALTER TABLE public.treinos_realizados REPLICA IDENTITY FULL;
ALTER TABLE public.registros_carga REPLICA IDENTITY FULL;
ALTER TABLE public.personal_records REPLICA IDENTITY FULL;
ALTER TABLE public.user_stats_agg REPLICA IDENTITY FULL;
ALTER TABLE public.metas_progresso REPLICA IDENTITY FULL;
ALTER TABLE public.health_metrics REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.treinos_realizados; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.registros_carga;    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_records;   EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats_agg;     EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.metas_progresso;    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.health_metrics;     EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
;
