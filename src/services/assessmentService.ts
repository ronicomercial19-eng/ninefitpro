import { supabase } from '@/integrations/supabase/client';

export interface GuidedAssessmentData {
  peso: number;
  gordura_corporal: number;
  massa_muscular: number;
  rm1_empurrar_superior: number; // Supino
  rm1_puxar_costas: number;      // Puxada
  rm1_empurrar_perna: number;    // Agachamento
  data_avaliacao?: string;
}

export interface HistoricoPerformance {
  avaliacao_atual_score: number | null;
  composicao: {
    gordura_pct: number | null;
    musculo_pct: number | null;
  };
  progressao_forca: {
    supino: { atual: number | null; anterior: number | null; delta: number | null };
    agachamento: { atual: number | null; anterior: number | null; delta: number | null };
    puxada: { atual: number | null; anterior: number | null; delta: number | null };
  };
  historico_8_semanas: Array<{
    data: string;
    score: number | null;
    fase: string | null;
  }>;
}

/**
 * Salva avaliação guiada via RPC (modo self-onboarding)
 * Apenas campos reais, sem cálculos de score/flags no cliente
 */
export async function saveGuidedAssessment(
  athleteId: string,
  dados: GuidedAssessmentData
): Promise<{ id: string; success: boolean }> {
  try {
    const { data, error } = await supabase.rpc('fn_salvar_avaliacao_guiada', {
      p_athlete_id: athleteId,
      p_peso: dados.peso,
      p_gordura_corporal: dados.gordura_corporal,
      p_massa_muscular: dados.massa_muscular,
      p_rm1_supino: dados.rm1_empurrar_superior,
      p_rm1_agachamento: dados.rm1_empurrar_perna,
      p_rm1_puxada: dados.rm1_puxar_costas,
      p_data_avaliacao: dados.data_avaliacao || new Date().toISOString().split('T')[0],
    });

    if (error) throw error;

    return { id: data?.id || '', success: true };
  } catch (err) {
    console.error('saveGuidedAssessment error:', err);
    throw err;
  }
}

/**
 * Obtém histórico de performance do atleta via RPC
 * Substitui leitura direta de avaliacoes_unificadas
 */
export async function getHistoricoPerformance(
  athleteId: string
): Promise<HistoricoPerformance | null> {
  try {
    const { data, error } = await supabase.rpc('fn_get_historico_performance', {
      p_athlete_id: athleteId,
    });

    if (error) throw error;
    if (!data) return null;

    return {
      avaliacao_atual_score: data.avaliacao_atual_score,
      composicao: {
        gordura_pct: data.composicao?.gordura_pct,
        musculo_pct: data.composicao?.musculo_pct,
      },
      progressao_forca: {
        supino: {
          atual: data.progressao_forca?.supino?.atual,
          anterior: data.progressao_forca?.supino?.anterior,
          delta: data.progressao_forca?.supino?.delta,
        },
        agachamento: {
          atual: data.progressao_forca?.agachamento?.atual,
          anterior: data.progressao_forca?.agachamento?.anterior,
          delta: data.progressao_forca?.agachamento?.delta,
        },
        puxada: {
          atual: data.progressao_forca?.puxada?.atual,
          anterior: data.progressao_forca?.puxada?.anterior,
          delta: data.progressao_forca?.puxada?.delta,
        },
      },
      historico_8_semanas: data.historico_8_semanas || [],
    };
  } catch (err) {
    console.error('getHistoricoPerformance error:', err);
    return null;
  }
}

/**
 * Verifica se atleta tem avaliação registrada
 */
export async function hasAssessment(athleteId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('avaliacoes_unificadas')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athleteId);

    if (error) throw error;
    return (count || 0) > 0;
  } catch (err) {
    console.error('hasAssessment error:', err);
    return false;
  }
}
