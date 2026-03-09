/**
 * Assessments Service
 * Canonical service for physical assessments, measurements, and photos
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Assessment, 
  StudentMeasurement,
  ApiResponse,
  DateRange 
} from '@/types/domains';

// ==================== ASSESSMENTS ====================

export async function getAssessmentsByAthlete(
  athleteId: string,
  options?: { limit?: number; dateRange?: DateRange }
): Promise<ApiResponse<Assessment[]>> {
  try {
    let query = supabase
      .from('avaliacoes_unificadas')
      .select('*')
      .eq('aluno_id', athleteId) // Using legacy FK for now
      .order('data_avaliacao', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.dateRange) {
      const from = typeof options.dateRange.from === 'string' 
        ? options.dateRange.from 
        : options.dateRange.from.toISOString().split('T')[0];
      const to = typeof options.dateRange.to === 'string' 
        ? options.dateRange.to 
        : options.dateRange.to.toISOString().split('T')[0];
      query = query.gte('data_avaliacao', from).lte('data_avaliacao', to);
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
      data: data as Assessment[],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function getLatestAssessment(athleteId: string): Promise<ApiResponse<Assessment | null>> {
  try {
    const { data, error } = await supabase
      .from('avaliacoes_unificadas')
      .select('*')
      .eq('aluno_id', athleteId)
      .order('data_avaliacao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    return {
      success: true,
      data: data as Assessment | null,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function createAssessment(
  assessment: Partial<Assessment> & { aluno_id: string; origem: string }
): Promise<ApiResponse<Assessment>> {
  try {
    const { data, error } = await supabase
      .from('avaliacoes_unificadas')
      .insert({
        ...assessment,
        data_avaliacao: assessment.data_avaliacao || new Date().toISOString().split('T')[0]
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
      data: data as Assessment,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function updateAssessment(
  id: string,
  updates: Partial<Assessment>
): Promise<ApiResponse<Assessment>> {
  try {
    const { data, error } = await supabase
      .from('avaliacoes_unificadas')
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
      data: data as Assessment,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== MEASUREMENTS ====================

export async function getMeasurementsByStudent(
  studentId: string,
  options?: { limit?: number }
): Promise<ApiResponse<StudentMeasurement[]>> {
  try {
    let query = supabase
      .from('student_measurements')
      .select('*')
      .eq('student_id', studentId) // Legacy FK - will migrate to athlete_id
      .order('measurement_date', { ascending: false });

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
      data: data as StudentMeasurement[],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function createMeasurement(
  measurement: Omit<StudentMeasurement, 'id' | 'created_at'>
): Promise<ApiResponse<StudentMeasurement>> {
  try {
    const { data, error } = await supabase
      .from('student_measurements')
      .insert(measurement)
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
      data: data as StudentMeasurement,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== STUDENT PHOTOS ====================

export interface StudentPhoto {
  id: string;
  student_id: string;
  athlete_id?: string;
  photo_url: string;
  photo_type: string | null;
  taken_at: string | null;
  notes: string | null;
  created_at: string;
}

export async function getPhotosByStudent(
  studentId: string,
  options?: { photoType?: string; limit?: number }
): Promise<ApiResponse<StudentPhoto[]>> {
  try {
    let query = supabase
      .from('student_photos')
      .select('*')
      .eq('student_id', studentId)
      .order('taken_at', { ascending: false });

    if (options?.photoType) {
      query = query.eq('photo_type', options.photoType);
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
      data: data as StudentPhoto[],
      metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

export async function uploadPhoto(
  studentId: string,
  file: File,
  photoType?: string
): Promise<ApiResponse<StudentPhoto>> {
  try {
    // Upload to storage
    const fileName = `${studentId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assessments')
      .upload(fileName, file);

    if (uploadError) {
      return {
        success: false,
        error: { code: 'UPLOAD_ERROR', message: uploadError.message }
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assessments')
      .getPublicUrl(fileName);

    // Create record
    const { data, error } = await supabase
      .from('student_photos')
      .insert({
        student_id: studentId,
        photo_url: urlData.publicUrl,
        photo_type: photoType,
        taken_at: new Date().toISOString()
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
      data: data as StudentPhoto,
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: err.message }
    };
  }
}

// ==================== COMPARISON HELPERS ====================

export async function getProgressComparison(
  athleteId: string
): Promise<ApiResponse<{
  latest: Assessment | null;
  previous: Assessment | null;
  changes: Record<string, { value: number; change: number; changePercent: number }>;
}>> {
  try {
    const { data, error } = await supabase
      .from('avaliacoes_unificadas')
      .select('*')
      .eq('aluno_id', athleteId)
      .order('data_avaliacao', { ascending: false })
      .limit(2);

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      };
    }

    const latest = data?.[0] as Assessment | null;
    const previous = data?.[1] as Assessment | null;

    const changes: Record<string, { value: number; change: number; changePercent: number }> = {};

    if (latest && previous) {
      const metrics = [
        'peso', 'gordura_corporal', 'massa_muscular', 'massa_magra',
        'circunferencia_cintura', 'circunferencia_quadril', 'circunferencia_braco'
      ];

      for (const metric of metrics) {
        const latestVal = (latest as any)[metric];
        const prevVal = (previous as any)[metric];
        
        if (latestVal != null && prevVal != null) {
          const change = latestVal - prevVal;
          const changePercent = prevVal !== 0 ? (change / prevVal) * 100 : 0;
          changes[metric] = {
            value: latestVal,
            change: Math.round(change * 100) / 100,
            changePercent: Math.round(changePercent * 10) / 10
          };
        }
      }
    }

    return {
      success: true,
      data: { latest, previous, changes },
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

export const assessmentQueryKeys = {
  assessments: {
    all: ['assessments'] as const,
    byAthlete: (athleteId: string) => ['assessments', 'athlete', athleteId] as const,
    latest: (athleteId: string) => ['assessments', 'athlete', athleteId, 'latest'] as const,
    comparison: (athleteId: string) => ['assessments', 'athlete', athleteId, 'comparison'] as const,
  },
  measurements: {
    all: ['measurements'] as const,
    byStudent: (studentId: string) => ['measurements', 'student', studentId] as const,
  },
  photos: {
    all: ['photos'] as const,
    byStudent: (studentId: string) => ['photos', 'student', studentId] as const,
  },
};
