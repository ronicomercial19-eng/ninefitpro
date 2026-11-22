
-- Add core, cardio, mobility test columns and computed scores to avaliacoes_unificadas
ALTER TABLE public.avaliacoes_unificadas
  ADD COLUMN IF NOT EXISTS core_prancha_seg NUMERIC,
  ADD COLUMN IF NOT EXISTS core_side_plank_esq_seg NUMERIC,
  ADD COLUMN IF NOT EXISTS core_side_plank_dir_seg NUMERIC,
  ADD COLUMN IF NOT EXISTS cardio_sprint_vel NUMERIC,
  ADD COLUMN IF NOT EXISTS cardio_bpm_repouso INTEGER,
  ADD COLUMN IF NOT EXISTS cardio_bpm_max INTEGER,
  ADD COLUMN IF NOT EXISTS mob_overhead_squat NUMERIC,
  ADD COLUMN IF NOT EXISTS mob_quadril NUMERIC,
  ADD COLUMN IF NOT EXISTS mob_tornozelo NUMERIC,
  ADD COLUMN IF NOT EXISTS mob_ombro NUMERIC,
  ADD COLUMN IF NOT EXISTS score_forca NUMERIC,
  ADD COLUMN IF NOT EXISTS score_resistencia NUMERIC,
  ADD COLUMN IF NOT EXISTS score_core NUMERIC,
  ADD COLUMN IF NOT EXISTS score_cardio NUMERIC,
  ADD COLUMN IF NOT EXISTS score_mobilidade NUMERIC,
  ADD COLUMN IF NOT EXISTS score_global NUMERIC,
  ADD COLUMN IF NOT EXISTS flags_inteligentes JSONB DEFAULT '[]'::jsonb;

-- Update the salvar_avaliacao function to handle new columns
CREATE OR REPLACE FUNCTION public.salvar_avaliacao(p_estudante_id uuid, p_dados jsonb)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_aluno_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.alunos WHERE id = p_estudante_id) INTO v_aluno_exists;
  IF NOT v_aluno_exists THEN
    RETURN QUERY SELECT FALSE as success, 'Aluno não encontrado'::TEXT as message; RETURN;
  END IF;
  INSERT INTO public.avaliacoes_unificadas (
    aluno_id, origem, data_avaliacao, peso, altura, imc, gordura_corporal, massa_muscular,
    circunferencia_braco, circunferencia_peitoral, circunferencia_cintura,
    circunferencia_quadril, circunferencia_coxa, circunferencia_panturrilha,
    rml_abs, rml_flexao, rml_agachamento, rml_pull, rml_elevacao_p,
    rm1_empurrar_perna, rm1_puxar_costas, rm1_empurrar_superior, rm1_puxar_inferior,
    dobra_triceps, dobra_peitoral, dobra_abdominal, dobra_suprailiaca,
    dobra_coxa, dobra_panturrilha, dobra_subescapular, dobra_axilar_media,
    massa_gorda, massa_magra, agua_corporal, taxa_metabolica,
    exames, avaliacao_exames, observacoes, avaliador_nome, avaliador_cref,
    core_prancha_seg, core_side_plank_esq_seg, core_side_plank_dir_seg,
    cardio_sprint_vel, cardio_bpm_repouso, cardio_bpm_max,
    mob_overhead_squat, mob_quadril, mob_tornozelo, mob_ombro,
    score_forca, score_resistencia, score_core, score_cardio, score_mobilidade, score_global,
    flags_inteligentes
  ) VALUES (
    p_estudante_id, 'manual', COALESCE((p_dados->>'data_avaliacao')::DATE, CURRENT_DATE),
    (p_dados->>'peso')::NUMERIC, (p_dados->>'altura')::NUMERIC, (p_dados->>'imc')::NUMERIC,
    (p_dados->>'gordura_corporal')::NUMERIC, (p_dados->>'massa_muscular')::NUMERIC,
    (p_dados->>'circunferencia_braco')::NUMERIC, (p_dados->>'circunferencia_peitoral')::NUMERIC,
    (p_dados->>'circunferencia_cintura')::NUMERIC, (p_dados->>'circunferencia_quadril')::NUMERIC,
    (p_dados->>'circunferencia_coxa')::NUMERIC, (p_dados->>'circunferencia_panturrilha')::NUMERIC,
    (p_dados->>'rml_abs')::INTEGER, (p_dados->>'rml_flexao')::INTEGER,
    (p_dados->>'rml_agachamento')::INTEGER, (p_dados->>'rml_pull')::INTEGER,
    (p_dados->>'rml_elevacao_p')::INTEGER, (p_dados->>'rm1_empurrar_perna')::NUMERIC,
    (p_dados->>'rm1_puxar_costas')::NUMERIC, (p_dados->>'rm1_empurrar_superior')::NUMERIC,
    (p_dados->>'rm1_puxar_inferior')::NUMERIC, (p_dados->>'dobra_triceps')::NUMERIC,
    (p_dados->>'dobra_peitoral')::NUMERIC, (p_dados->>'dobra_abdominal')::NUMERIC,
    (p_dados->>'dobra_suprailiaca')::NUMERIC, (p_dados->>'dobra_coxa')::NUMERIC,
    (p_dados->>'dobra_panturrilha')::NUMERIC, (p_dados->>'dobra_subescapular')::NUMERIC,
    (p_dados->>'dobra_axilar_media')::NUMERIC, (p_dados->>'massa_gorda')::NUMERIC,
    (p_dados->>'massa_magra')::NUMERIC, (p_dados->>'agua_corporal')::NUMERIC,
    (p_dados->>'taxa_metabolica')::NUMERIC,
    COALESCE((p_dados->>'exames')::JSONB, '[]'::jsonb),
    p_dados->>'avaliacao_exames', p_dados->>'observacoes',
    p_dados->>'avaliador_nome', p_dados->>'avaliador_cref',
    (p_dados->>'core_prancha_seg')::NUMERIC, (p_dados->>'core_side_plank_esq_seg')::NUMERIC,
    (p_dados->>'core_side_plank_dir_seg')::NUMERIC,
    (p_dados->>'cardio_sprint_vel')::NUMERIC, (p_dados->>'cardio_bpm_repouso')::INTEGER,
    (p_dados->>'cardio_bpm_max')::INTEGER,
    (p_dados->>'mob_overhead_squat')::NUMERIC, (p_dados->>'mob_quadril')::NUMERIC,
    (p_dados->>'mob_tornozelo')::NUMERIC, (p_dados->>'mob_ombro')::NUMERIC,
    (p_dados->>'score_forca')::NUMERIC, (p_dados->>'score_resistencia')::NUMERIC,
    (p_dados->>'score_core')::NUMERIC, (p_dados->>'score_cardio')::NUMERIC,
    (p_dados->>'score_mobilidade')::NUMERIC, (p_dados->>'score_global')::NUMERIC,
    COALESCE((p_dados->>'flags_inteligentes')::JSONB, '[]'::jsonb)
  )
  ON CONFLICT (aluno_id, data_avaliacao, origem) DO UPDATE SET
    peso = EXCLUDED.peso, altura = EXCLUDED.altura, imc = EXCLUDED.imc,
    gordura_corporal = EXCLUDED.gordura_corporal, massa_muscular = EXCLUDED.massa_muscular,
    circunferencia_braco = EXCLUDED.circunferencia_braco, circunferencia_peitoral = EXCLUDED.circunferencia_peitoral,
    circunferencia_cintura = EXCLUDED.circunferencia_cintura, circunferencia_quadril = EXCLUDED.circunferencia_quadril,
    circunferencia_coxa = EXCLUDED.circunferencia_coxa, circunferencia_panturrilha = EXCLUDED.circunferencia_panturrilha,
    rml_abs = EXCLUDED.rml_abs, rml_flexao = EXCLUDED.rml_flexao, rml_agachamento = EXCLUDED.rml_agachamento,
    rml_pull = EXCLUDED.rml_pull, rml_elevacao_p = EXCLUDED.rml_elevacao_p,
    rm1_empurrar_perna = EXCLUDED.rm1_empurrar_perna, rm1_puxar_costas = EXCLUDED.rm1_puxar_costas,
    rm1_empurrar_superior = EXCLUDED.rm1_empurrar_superior, rm1_puxar_inferior = EXCLUDED.rm1_puxar_inferior,
    dobra_triceps = EXCLUDED.dobra_triceps, dobra_peitoral = EXCLUDED.dobra_peitoral,
    dobra_abdominal = EXCLUDED.dobra_abdominal, dobra_suprailiaca = EXCLUDED.dobra_suprailiaca,
    dobra_coxa = EXCLUDED.dobra_coxa, dobra_panturrilha = EXCLUDED.dobra_panturrilha,
    dobra_subescapular = EXCLUDED.dobra_subescapular, dobra_axilar_media = EXCLUDED.dobra_axilar_media,
    massa_gorda = EXCLUDED.massa_gorda, massa_magra = EXCLUDED.massa_magra,
    agua_corporal = EXCLUDED.agua_corporal, taxa_metabolica = EXCLUDED.taxa_metabolica,
    exames = EXCLUDED.exames, avaliacao_exames = EXCLUDED.avaliacao_exames,
    observacoes = EXCLUDED.observacoes, avaliador_nome = EXCLUDED.avaliador_nome,
    avaliador_cref = EXCLUDED.avaliador_cref,
    core_prancha_seg = EXCLUDED.core_prancha_seg, core_side_plank_esq_seg = EXCLUDED.core_side_plank_esq_seg,
    core_side_plank_dir_seg = EXCLUDED.core_side_plank_dir_seg,
    cardio_sprint_vel = EXCLUDED.cardio_sprint_vel, cardio_bpm_repouso = EXCLUDED.cardio_bpm_repouso,
    cardio_bpm_max = EXCLUDED.cardio_bpm_max,
    mob_overhead_squat = EXCLUDED.mob_overhead_squat, mob_quadril = EXCLUDED.mob_quadril,
    mob_tornozelo = EXCLUDED.mob_tornozelo, mob_ombro = EXCLUDED.mob_ombro,
    score_forca = EXCLUDED.score_forca, score_resistencia = EXCLUDED.score_resistencia,
    score_core = EXCLUDED.score_core, score_cardio = EXCLUDED.score_cardio,
    score_mobilidade = EXCLUDED.score_mobilidade, score_global = EXCLUDED.score_global,
    flags_inteligentes = EXCLUDED.flags_inteligentes,
    updated_at = now();
  RETURN QUERY SELECT TRUE as success, 'Avaliação salva com sucesso!'::TEXT as message;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE as success, SQLERRM::TEXT as message;
END;
$function$;
;
