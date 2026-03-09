/**
 * Periodization Service
 * Canonical service for periodization models and athlete assignments
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from '@/types/domains';

// ==================== PERIODIZATION MODELS ====================

export async function getPeriodizationModels(options?: {
  goal?: string; limit?: number;
}): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('periodization_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.goal) query = query.eq('goal', options.goal);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getPeriodizationModelById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.from('periodization_models').select('*').eq('id', id).single();
    if (error) return { success: false, error: { code: error.code === 'PGRST116' ? 'NOT_FOUND' : 'FETCH_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== ATHLETE ASSIGNMENTS ====================

export async function getAthletePeriodizations(athleteId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('athlete_periodizations')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('assigned_at', { ascending: false });

    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function assignPeriodization(
  athleteId: string,
  modelId: string,
  options?: { matchPercentage?: number; matchFactors?: any; notes?: string; assignedBy?: string }
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('athlete_periodizations')
      .insert({
        athlete_id: athleteId,
        periodization_model_id: modelId,
        match_percentage: options?.matchPercentage,
        match_factors: options?.matchFactors,
        notes: options?.notes,
        assigned_by: options?.assignedBy,
        status: 'active',
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { success: false, error: { code: 'CREATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function updatePeriodizationStatus(
  assignmentId: string, status: string
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('athlete_periodizations')
      .update({ status })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) return { success: false, error: { code: 'UPDATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== TRAINING PHASES ====================

export async function getTrainingPhases(modelId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('training_phases')
      .select('*')
      .eq('periodization_model_id', modelId)
      .order('phase_order' as any, { ascending: true });

    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== QUERY KEYS ====================

export const periodizationQueryKeys = {
  models: {
    all: ['periodization', 'models'] as const,
    byId: (id: string) => ['periodization', 'models', id] as const,
    byGoal: (goal: string) => ['periodization', 'models', 'goal', goal] as const,
  },
  assignments: {
    all: ['periodization', 'assignments'] as const,
    byAthlete: (athleteId: string) => ['periodization', 'assignments', 'athlete', athleteId] as const,
  },
  phases: {
    byModel: (modelId: string) => ['periodization', 'phases', 'model', modelId] as const,
  },
};
