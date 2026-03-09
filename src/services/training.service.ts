/**
 * Training Service
 * Canonical service for training assignments, progress, and executions
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse, DateRange } from '@/types/domains';

// ==================== TRAINING ASSIGNMENTS ====================

export async function getActiveAssignments(athleteId: string): Promise<ApiResponse<any[]>> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('student_training_assignments')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function getAllAssignments(
  athleteId: string, 
  options?: { status?: string; limit?: number }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('student_training_assignments')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function getAssignmentsByCoach(coachId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('student_training_assignments')
      .select('*, athletes(id, name, email)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function createAssignment(assignment: {
  athlete_id: string;
  coach_id: string;
  title: string;
  description?: string;
  content_type: string;
  content_url?: string;
  html_content?: string;
  file_path?: string;
  week_number?: number;
  day_number?: number;
  status?: string;
  starts_at?: string;
  expires_at?: string;
}): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('student_training_assignments')
      .insert(assignment)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function updateAssignment(
  id: string, 
  updates: Record<string, any>
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('student_training_assignments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== WORKOUT PROGRESS ====================

export async function getWorkoutProgress(
  athleteId: string, 
  dateRange?: DateRange
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('workout_progress')
      .select('*')
      .eq('aluno_id', athleteId) // Using legacy FK for now
      .order('created_at', { ascending: false });

    if (dateRange) {
      const from = typeof dateRange.from === 'string' ? dateRange.from : dateRange.from.toISOString();
      const to = typeof dateRange.to === 'string' ? dateRange.to : dateRange.to.toISOString();
      query = query.gte('created_at', from).lte('created_at', to);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function logWorkoutProgress(
  progress: Record<string, any>
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('workout_progress')
      .insert(progress)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== WORKOUT EXECUTIONS ====================

export async function getWorkoutExecutions(
  athleteId: string,
  options?: { status?: string; limit?: number; dateRange?: DateRange }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('workout_executions')
      .select('*, workout_exercise_sets(*)')
      .eq('athlete_id', athleteId)
      .order('started_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.dateRange) {
      const from = typeof options.dateRange.from === 'string' 
        ? options.dateRange.from 
        : options.dateRange.from.toISOString();
      const to = typeof options.dateRange.to === 'string' 
        ? options.dateRange.to 
        : options.dateRange.to.toISOString();
      query = query.gte('started_at', from).lte('started_at', to);
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data ?? [],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function startWorkoutExecution(
  athleteId: string,
  assignmentId?: string,
  templateId?: string
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('workout_executions')
      .insert({
        athlete_id: athleteId,
        assignment_id: assignmentId,
        template_id: templateId,
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function completeWorkoutExecution(
  executionId: string,
  summary?: { duration_minutes?: number; total_volume_kg?: number; avg_rpe?: number; notes?: string }
): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('workout_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        ...summary
      })
      .eq('id', executionId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== QUERY KEYS ====================

export const trainingQueryKeys = {
  assignments: {
    all: ['training', 'assignments'] as const,
    byAthlete: (athleteId: string) => ['training', 'assignments', 'athlete', athleteId] as const,
    active: (athleteId: string) => ['training', 'assignments', 'athlete', athleteId, 'active'] as const,
    byCoach: (coachId: string) => ['training', 'assignments', 'coach', coachId] as const,
  },
  progress: {
    all: ['training', 'progress'] as const,
    byAthlete: (athleteId: string) => ['training', 'progress', 'athlete', athleteId] as const,
    inRange: (athleteId: string, from: string, to: string) => 
      ['training', 'progress', 'athlete', athleteId, from, to] as const,
  },
  executions: {
    all: ['training', 'executions'] as const,
    byAthlete: (athleteId: string) => ['training', 'executions', 'athlete', athleteId] as const,
    byId: (id: string) => ['training', 'executions', id] as const,
  },
};
