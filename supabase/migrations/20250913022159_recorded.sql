-- Create historico_avaliacoes table to store all assessment history
CREATE TABLE public.historico_avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estudante_id UUID NOT NULL,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  peso NUMERIC,
  altura NUMERIC,
  imc NUMERIC,
  gordura_corporal NUMERIC,
  massa_muscular NUMERIC,
  
  -- Anthropometric data
  circunferencia_braco NUMERIC,
  circunferencia_peitoral NUMERIC,
  circunferencia_cintura NUMERIC,
  circunferencia_quadril NUMERIC,
  circunferencia_coxa NUMERIC,
  circunferencia_panturrilha NUMERIC,
  
  -- Strength tests (RML)
  rml_abs INTEGER,
  rml_flexao INTEGER,
  rml_agachamento INTEGER,
  rml_pull INTEGER,
  rml_elevacao_p INTEGER,
  
  -- 1RM tests
  rm1_empurrar_perna NUMERIC,
  rm1_puxar_costas NUMERIC,
  rm1_empurrar_superior NUMERIC,
  rm1_puxar_inferior NUMERIC,
  
  -- Skinfolds
  dobra_triceps NUMERIC,
  dobra_peitoral NUMERIC,
  dobra_abdominal NUMERIC,
  dobra_suprailiaca NUMERIC,
  dobra_coxa NUMERIC,
  dobra_panturrilha NUMERIC,
  dobra_subescapular NUMERIC,
  dobra_axilar_media NUMERIC,
  
  -- Bioimpedance
  massa_gorda NUMERIC,
  massa_magra NUMERIC,
  agua_corporal NUMERIC,
  taxa_metabolica NUMERIC,
  
  -- Exams and evaluations
  exames JSONB DEFAULT '[]'::jsonb,
  avaliacao_exames TEXT,
  
  -- Additional data
  observacoes TEXT,
  avaliador_nome TEXT,
  avaliador_cref TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create avaliacoes table for current/latest assessment only
CREATE TABLE public.avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estudante_id UUID NOT NULL UNIQUE, -- Only one current assessment per student
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  peso NUMERIC,
  altura NUMERIC,
  imc NUMERIC,
  gordura_corporal NUMERIC,
  massa_muscular NUMERIC,
  
  -- Anthropometric data
  circunferencia_braco NUMERIC,
  circunferencia_peitoral NUMERIC,
  circunferencia_cintura NUMERIC,
  circunferencia_quadril NUMERIC,
  circunferencia_coxa NUMERIC,
  circunferencia_panturrilha NUMERIC,
  
  -- Strength tests (RML)
  rml_abs INTEGER,
  rml_flexao INTEGER,
  rml_agachamento INTEGER,
  rml_pull INTEGER,
  rml_elevacao_p INTEGER,
  
  -- 1RM tests
  rm1_empurrar_perna NUMERIC,
  rm1_puxar_costas NUMERIC,
  rm1_empurrar_superior NUMERIC,
  rm1_puxar_inferior NUMERIC,
  
  -- Skinfolds
  dobra_triceps NUMERIC,
  dobra_peitoral NUMERIC,
  dobra_abdominal NUMERIC,
  dobra_suprailiaca NUMERIC,
  dobra_coxa NUMERIC,
  dobra_panturrilha NUMERIC,
  dobra_subescapular NUMERIC,
  dobra_axilar_media NUMERIC,
  
  -- Bioimpedance
  massa_gorda NUMERIC,
  massa_magra NUMERIC,
  agua_corporal NUMERIC,
  taxa_metabolica NUMERIC,
  
  -- Exams and evaluations
  exames JSONB DEFAULT '[]'::jsonb,
  avaliacao_exames TEXT,
  
  -- Additional data
  observacoes TEXT,
  avaliador_nome TEXT,
  avaliador_cref TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for historico_avaliacoes (simplified for now)
CREATE POLICY "Users can view assessment history"
  ON public.historico_avaliacoes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert assessment history"
  ON public.historico_avaliacoes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can manage assessment history"
  ON public.historico_avaliacoes FOR ALL
  USING (true);

-- Create RLS policies for avaliacoes (simplified for now)
CREATE POLICY "Users can view current assessments"
  ON public.avaliacoes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage current assessments"
  ON public.avaliacoes FOR ALL
  USING (true);

-- Create salvar_avaliacao procedure
CREATE OR REPLACE FUNCTION public.salvar_avaliacao(
  p_estudante_id UUID,
  p_dados JSONB
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_assessment RECORD;
BEGIN
  -- Get current assessment if exists
  SELECT * INTO v_old_assessment
  FROM public.avaliacoes 
  WHERE estudante_id = p_estudante_id;
  
  -- If there's an old assessment, move it to history
  IF FOUND THEN
    INSERT INTO public.historico_avaliacoes (
      estudante_id, data_avaliacao, peso, altura, imc, gordura_corporal, massa_muscular,
      circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
      circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
      rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
      rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
      dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
      dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
      massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
      exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref, created_at
    )
    VALUES (
      v_old_assessment.estudante_id, v_old_assessment.data_avaliacao,
      v_old_assessment.peso, v_old_assessment.altura, v_old_assessment.imc,
      v_old_assessment.gordura_corporal, v_old_assessment.massa_muscular,
      v_old_assessment.circunferencia_braco, v_old_assessment.circunferencia_peitoral,
      v_old_assessment.circunferencia_cintura, v_old_assessment.circunferencia_quadril,
      v_old_assessment.circunferencia_coxa, v_old_assessment.circunferencia_panturrilha,
      v_old_assessment.rml_abs, v_old_assessment.rml_flexao, v_old_assessment.rml_agachamento,
      v_old_assessment.rml_pull, v_old_assessment.rml_elevacao_p,
      v_old_assessment.rm1_empurrar_perna, v_old_assessment.rm1_puxar_costas,
      v_old_assessment.rm1_empurrar_superior, v_old_assessment.rm1_puxar_inferior,
      v_old_assessment.dobra_triceps, v_old_assessment.dobra_peitoral,
      v_old_assessment.dobra_abdominal, v_old_assessment.dobra_suprailiaca,
      v_old_assessment.dobra_coxa, v_old_assessment.dobra_panturrilha,
      v_old_assessment.dobra_subescapular, v_old_assessment.dobra_axilar_media,
      v_old_assessment.massa_gorda, v_old_assessment.massa_magra,
      v_old_assessment.agua_corporal, v_old_assessment.taxa_metabolica,
      v_old_assessment.exames, v_old_assessment.avaliacao_exames,
      v_old_assessment.observacoes, v_old_assessment.avaliador_nome,
      v_old_assessment.avaliador_cref, v_old_assessment.created_at
    );
    
    -- Delete old assessment from current table
    DELETE FROM public.avaliacoes WHERE estudante_id = p_estudante_id;
  END IF;
  
  -- Insert new assessment as current
  INSERT INTO public.avaliacoes (
    estudante_id, peso, altura, imc, gordura_corporal, massa_muscular,
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
    p_dados->>'avaliacao_cref'
  );
  
  RETURN QUERY SELECT TRUE as success, 'Avaliação salva com sucesso!'::TEXT as message;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE as success, SQLERRM::TEXT as message;
END;
$$;

-- Create indexes for better performance
CREATE INDEX idx_historico_avaliacoes_estudante_data ON public.historico_avaliacoes(estudante_id, data_avaliacao DESC);
CREATE INDEX idx_avaliacoes_estudante ON public.avaliacoes(estudante_id);;
