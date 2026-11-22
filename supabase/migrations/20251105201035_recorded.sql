-- FASE 1: Unificação das Tabelas de Avaliação
-- Criar tabela unificada avaliacoes_unificadas

CREATE TABLE IF NOT EXISTS public.avaliacoes_unificadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  
  -- Metadados
  origem TEXT NOT NULL CHECK (origem IN ('base44', 'manual', 'importado')),
  id_externo TEXT, -- Referência ao Base44 quando aplicável
  sincronizado BOOLEAN DEFAULT false,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Dados Antropométricos
  peso NUMERIC(5,2),
  altura NUMERIC(5,2),
  imc NUMERIC(5,2),
  
  -- Composição Corporal
  gordura_corporal NUMERIC(5,2),
  massa_muscular NUMERIC(5,2),
  massa_gorda NUMERIC(5,2),
  massa_magra NUMERIC(5,2),
  agua_corporal NUMERIC(5,2),
  taxa_metabolica NUMERIC(6,2),
  
  -- Perímetros (cm)
  circunferencia_braco NUMERIC(5,2),
  circunferencia_peitoral NUMERIC(5,2),
  circunferencia_cintura NUMERIC(5,2),
  circunferencia_quadril NUMERIC(5,2),
  circunferencia_coxa NUMERIC(5,2),
  circunferencia_panturrilha NUMERIC(5,2),
  
  -- RML (Resistência Muscular Localizada)
  rml_abs INTEGER,
  rml_flexao INTEGER,
  rml_agachamento INTEGER,
  rml_pull INTEGER,
  rml_elevacao_p INTEGER,
  
  -- 1RM (Uma Repetição Máxima)
  rm1_empurrar_perna NUMERIC(6,2),
  rm1_puxar_costas NUMERIC(6,2),
  rm1_empurrar_superior NUMERIC(6,2),
  rm1_puxar_inferior NUMERIC(6,2),
  
  -- Dobras Cutâneas (mm)
  dobra_triceps NUMERIC(5,2),
  dobra_peitoral NUMERIC(5,2),
  dobra_abdominal NUMERIC(5,2),
  dobra_suprailiaca NUMERIC(5,2),
  dobra_coxa NUMERIC(5,2),
  dobra_panturrilha NUMERIC(5,2),
  dobra_subescapular NUMERIC(5,2),
  dobra_axilar_media NUMERIC(5,2),
  
  -- Dados Adicionais (JSONB para flexibilidade)
  exames JSONB DEFAULT '[]'::jsonb,
  dados_adicionais JSONB DEFAULT '{}'::jsonb,
  
  -- Observações e Avaliador
  avaliacao_exames TEXT,
  observacoes TEXT,
  avaliador_nome TEXT,
  avaliador_cref TEXT,
  
  -- Índices para busca eficiente
  UNIQUE(aluno_id, data_avaliacao, origem)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unificadas_aluno ON public.avaliacoes_unificadas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unificadas_data ON public.avaliacoes_unificadas(data_avaliacao DESC);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unificadas_origem ON public.avaliacoes_unificadas(origem);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_unificadas_id_externo ON public.avaliacoes_unificadas(id_externo) WHERE id_externo IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.atualizar_avaliacoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_avaliacoes_timestamp
  BEFORE UPDATE ON public.avaliacoes_unificadas
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_avaliacoes_timestamp();

-- Migrar dados existentes de avaliacoes (se existir)
INSERT INTO public.avaliacoes_unificadas (
  aluno_id, origem, data_avaliacao, created_at, updated_at,
  peso, altura, imc, gordura_corporal, massa_muscular,
  circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
  circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
  rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
  rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
  dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
  dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
  massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
  exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref
)
SELECT 
  estudante_id as aluno_id, 
  'manual' as origem,
  data_avaliacao, created_at, updated_at,
  peso, altura, imc, gordura_corporal, massa_muscular,
  circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
  circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
  rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
  rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
  dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
  dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
  massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
  exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref
FROM public.avaliacoes
WHERE EXISTS (SELECT 1 FROM public.avaliacoes LIMIT 1)
ON CONFLICT (aluno_id, data_avaliacao, origem) DO NOTHING;

-- Migrar historico_avaliacoes (se existir)
INSERT INTO public.avaliacoes_unificadas (
  aluno_id, origem, data_avaliacao, created_at,
  peso, altura, imc, gordura_corporal, massa_muscular,
  circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
  circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
  rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
  rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
  dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
  dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
  massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
  exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref
)
SELECT 
  estudante_id as aluno_id,
  'manual' as origem,
  data_avaliacao, created_at,
  peso, altura, imc, gordura_corporal, massa_muscular,
  circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
  circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
  rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
  rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
  dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
  dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
  massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
  exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref
FROM public.historico_avaliacoes
WHERE EXISTS (SELECT 1 FROM public.historico_avaliacoes LIMIT 1)
ON CONFLICT (aluno_id, data_avaliacao, origem) DO NOTHING;

-- RLS Policies
ALTER TABLE public.avaliacoes_unificadas ENABLE ROW LEVEL SECURITY;

-- Professores podem gerenciar avaliações de seus alunos
CREATE POLICY "Professores gerenciam avaliacoes de seus alunos"
ON public.avaliacoes_unificadas
FOR ALL
TO authenticated
USING (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE professor_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Alunos podem ver suas próprias avaliações
CREATE POLICY "Alunos veem suas avaliacoes"
ON public.avaliacoes_unificadas
FOR SELECT
TO authenticated
USING (
  aluno_id IN (
    SELECT id FROM public.alunos WHERE email = current_user_email()
  )
);

-- Sistema pode inserir via webhook (para Base44)
CREATE POLICY "Sistema insere avaliacoes"
ON public.avaliacoes_unificadas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Atualizar função salvar_avaliacao para usar nova tabela
CREATE OR REPLACE FUNCTION public.salvar_avaliacao(p_estudante_id uuid, p_dados jsonb)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
AS $function$
DECLARE
  v_aluno_exists BOOLEAN;
BEGIN
  -- Verificar se o aluno existe
  SELECT EXISTS(SELECT 1 FROM public.alunos WHERE id = p_estudante_id) INTO v_aluno_exists;
  
  IF NOT v_aluno_exists THEN
    RETURN QUERY SELECT FALSE as success, 'Aluno não encontrado'::TEXT as message;
    RETURN;
  END IF;
  
  -- Inserir nova avaliação na tabela unificada
  INSERT INTO public.avaliacoes_unificadas (
    aluno_id, origem, data_avaliacao,
    peso, altura, imc, gordura_corporal, massa_muscular,
    circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
    circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
    rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
    rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
    dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
    dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
    massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
    exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref
  )
  VALUES (
    p_estudante_id,
    'manual',
    COALESCE((p_dados->>'data_avaliacao')::DATE, CURRENT_DATE),
    (p_dados->>'peso')::NUMERIC,
    (p_dados->>'altura')::NUMERIC,
    (p_dados->>'imc')::NUMERIC,
    (p_dados->>'gordura_corporal')::NUMERIC,
    (p_dados->>'massa_muscular')::NUMERIC,
    (p_dados->>'circunferencia_braco')::NUMERIC,
    (p_dados->>'circunferencia_peitoral')::NUMERIC,
    (p_dados->>'circunferencia_cintura')::NUMERIC,
    (p_dados->>'circunferencia_quadril')::NUMERIC,
    (p_dados->>'circunferencia_coxa')::NUMERIC,
    (p_dados->>'circunferencia_panturrilha')::NUMERIC,
    (p_dados->>'rml_abs')::INTEGER,
    (p_dados->>'rml_flexao')::INTEGER,
    (p_dados->>'rml_agachamento')::INTEGER,
    (p_dados->>'rml_pull')::INTEGER,
    (p_dados->>'rml_elevacao_p')::INTEGER,
    (p_dados->>'rm1_empurrar_perna')::NUMERIC,
    (p_dados->>'rm1_puxar_costas')::NUMERIC,
    (p_dados->>'rm1_empurrar_superior')::NUMERIC,
    (p_dados->>'rm1_puxar_inferior')::NUMERIC,
    (p_dados->>'dobra_triceps')::NUMERIC,
    (p_dados->>'dobra_peitoral')::NUMERIC,
    (p_dados->>'dobra_abdominal')::NUMERIC,
    (p_dados->>'dobra_suprailiaca')::NUMERIC,
    (p_dados->>'dobra_coxa')::NUMERIC,
    (p_dados->>'dobra_panturrilha')::NUMERIC,
    (p_dados->>'dobra_subescapular')::NUMERIC,
    (p_dados->>'dobra_axilar_media')::NUMERIC,
    (p_dados->>'massa_gorda')::NUMERIC,
    (p_dados->>'massa_magra')::NUMERIC,
    (p_dados->>'agua_corporal')::NUMERIC,
    (p_dados->>'taxa_metabolica')::NUMERIC,
    COALESCE((p_dados->>'exames')::JSONB, '[]'::jsonb),
    p_dados->>'avaliacao_exames',
    p_dados->>'observacoes',
    p_dados->>'avaliador_nome',
    p_dados->>'avaliador_cref'
  )
  ON CONFLICT (aluno_id, data_avaliacao, origem) 
  DO UPDATE SET
    peso = EXCLUDED.peso,
    altura = EXCLUDED.altura,
    imc = EXCLUDED.imc,
    gordura_corporal = EXCLUDED.gordura_corporal,
    massa_muscular = EXCLUDED.massa_muscular,
    circunferencia_braco = EXCLUDED.circunferencia_braco,
    circunferencia_peitoral = EXCLUDED.circunferencia_peitoral,
    circunferencia_cintura = EXCLUDED.circunferencia_cintura,
    circunferencia_quadril = EXCLUDED.circunferencia_quadril,
    circunferencia_coxa = EXCLUDED.circunferencia_coxa,
    circunferencia_panturrilha = EXCLUDED.circunferencia_panturrilha,
    rml_abs = EXCLUDED.rml_abs,
    rml_flexao = EXCLUDED.rml_flexao,
    rml_agachamento = EXCLUDED.rml_agachamento,
    rml_pull = EXCLUDED.rml_pull,
    rml_elevacao_p = EXCLUDED.rml_elevacao_p,
    rm1_empurrar_perna = EXCLUDED.rm1_empurrar_perna,
    rm1_puxar_costas = EXCLUDED.rm1_puxar_costas,
    rm1_empurrar_superior = EXCLUDED.rm1_empurrar_superior,
    rm1_puxar_inferior = EXCLUDED.rm1_puxar_inferior,
    dobra_triceps = EXCLUDED.dobra_triceps,
    dobra_peitoral = EXCLUDED.dobra_peitoral,
    dobra_abdominal = EXCLUDED.dobra_abdominal,
    dobra_suprailiaca = EXCLUDED.dobra_suprailiaca,
    dobra_coxa = EXCLUDED.dobra_coxa,
    dobra_panturrilha = EXCLUDED.dobra_panturrilha,
    dobra_subescapular = EXCLUDED.dobra_subescapular,
    dobra_axilar_media = EXCLUDED.dobra_axilar_media,
    massa_gorda = EXCLUDED.massa_gorda,
    massa_magra = EXCLUDED.massa_magra,
    agua_corporal = EXCLUDED.agua_corporal,
    taxa_metabolica = EXCLUDED.taxa_metabolica,
    exames = EXCLUDED.exames,
    avaliacao_exames = EXCLUDED.avaliacao_exames,
    observacoes = EXCLUDED.observacoes,
    avaliador_nome = EXCLUDED.avaliador_nome,
    avaliador_cref = EXCLUDED.avaliador_cref,
    updated_at = now();
  
  RETURN QUERY SELECT TRUE as success, 'Avaliação salva com sucesso!'::TEXT as message;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE as success, SQLERRM::TEXT as message;
END;
$function$;

-- FASE 2.1: Preparar sistema para admin ronys191@gmail.com
-- Atualizar trigger handle_new_user para incluir o novo admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Inserir profile
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        CASE 
            WHEN NEW.email = 'admin@system.com' THEN 'admin'::public.user_role
            WHEN NEW.email = 'roni.comercial19@gmail.com' THEN 'admin'::public.user_role
            WHEN NEW.email = 'ronys191@gmail.com' THEN 'admin'::public.user_role
            ELSE 'student'::public.user_role
        END
    );
    
    -- Sincronizar user_roles (admin central)
    IF NEW.email IN ('roni.comercial19@gmail.com', 'ronys191@gmail.com', 'admin@system.com') THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$function$;;
