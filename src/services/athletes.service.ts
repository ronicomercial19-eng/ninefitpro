/**
 * Athletes Service
 * Canonical service for athlete (student) data operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse, CreateAthleteDTO, UpdateAthleteDTO } from '@/types/domains';

export async function listAthletesByCoach(coachId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .eq('coach_id', coachId)
      .order('name', { ascending: true });

    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getAthleteById(id: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.from('athletes').select('*').eq('id', id).single();
    if (error) return { success: false, error: { code: error.code === 'PGRST116' ? 'NOT_FOUND' : 'FETCH_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getAthleteByUserId(userId: string): Promise<ApiResponse<any>> {
  try {
    let { data, error } = await supabase.from('athletes').select('*').eq('user_id', userId).maybeSingle();

    if (!data && !error) {
      const { data: link } = await supabase.from('athlete_auth_link').select('athlete_id').eq('user_id', userId).maybeSingle();
      if (link?.athlete_id) {
        const result = await supabase.from('athletes').select('*').eq('id', link.athlete_id).single();
        data = result.data;
        error = result.error;
      }
    }

    if (error || !data) return { success: false, error: { code: 'NOT_FOUND', message: 'Athlete not found for this user' } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getAthleteByEmail(email: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.from('athletes').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (error || !data) return { success: false, error: { code: 'NOT_FOUND', message: 'Athlete not found' } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function createAthlete(dto: CreateAthleteDTO): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('athletes')
      .insert({
        coach_id: dto.coach_id, name: dto.name,
        email: dto.email?.toLowerCase().trim(), phone: dto.phone,
        birthdate: dto.birthdate, gender: dto.gender,
        altura_cm: dto.altura_cm, peso_kg: dto.peso_kg,
        nivel: dto.nivel, objetivo: dto.objetivo,
        primary_goal: dto.primary_goal, experience_level: dto.experience_level,
        sessions_per_week: dto.sessions_per_week, training_environment: dto.training_environment,
        activated: false, password_changed: false
      })
      .select().single();

    if (error) return { success: false, error: { code: 'CREATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function updateAthlete(id: string, dto: UpdateAthleteDTO): Promise<ApiResponse<any>> {
  try {
    const updatePayload: Record<string, any> = { ...dto };
    if (dto.email) updatePayload.email = dto.email.toLowerCase().trim();

    const { data, error } = await supabase.from('athletes').update(updatePayload).eq('id', id).select().single();
    if (error) return { success: false, error: { code: 'UPDATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function deleteAthlete(id: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.from('athletes').delete().eq('id', id);
    if (error) return { success: false, error: { code: 'DELETE_ERROR', message: error.message } };
    return { success: true, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function activateAthlete(id: string, userId: string, markPasswordChanged?: boolean): Promise<ApiResponse<any>> {
  try {
    const updateData: Record<string, any> = { user_id: userId, activated: true };
    if (markPasswordChanged) {
      updateData.password_changed = true;
    }

    const { data, error } = await supabase.from('athletes').update(updateData).eq('id', id).select().single();
    if (error) return { success: false, error: { code: 'ACTIVATION_ERROR', message: error.message } };

    await supabase.from('athlete_auth_link').upsert({ athlete_id: id, user_id: userId }, { onConflict: 'athlete_id' });
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getAthleteStats(athleteId: string): Promise<ApiResponse<{
  totalWorkouts: number; totalCalories: number; currentStreak: number; level: number; totalXp: number;
}>> {
  try {
    const { data: athlete } = await supabase.from('athletes').select('level, total_xp').eq('id', athleteId).single();
    // workout_progress e uma tabela orfa (sem gravacoes desde 13/08/2026); a fonte
    // real e workout_executions, observada pelos triggers de sync. Essa tabela nao
    // guarda calorias, entao estimamos com a mesma formula usada no resumo pos-treino
    // (PostWorkoutModal.tsx: duration_minutes * rpe * 1.2) em vez de deixar zerado.
    const { data: progress } = await supabase
      .from('workout_executions')
      .select('workout_date, duration_minutes, avg_rpe')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .order('workout_date', { ascending: false });

    const totalWorkouts = progress?.length ?? 0;
    const totalCalories = progress?.reduce((sum, p) => {
      const estimated = Math.round((p.duration_minutes ?? 45) * (p.avg_rpe ?? 5) * 1.2);
      return sum + estimated;
    }, 0) ?? 0;

    let currentStreak = 0;
    if (progress && progress.length > 0) {
      const today = new Date();
      const dates = progress.map(p => new Date(p.workout_date).toDateString());
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        if (dates.includes(checkDate.toDateString())) currentStreak++;
        else if (i > 0) break;
      }
    }

    return {
      success: true,
      data: { totalWorkouts, totalCalories, currentStreak, level: athlete?.level ?? 1, totalXp: athlete?.total_xp ?? 0 },
      metadata: { timestamp: new Date().toISOString(), version: 'v1' }
    };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export const athleteQueryKeys = {
  all: ['athletes'] as const,
  byCoach: (coachId: string) => ['athletes', 'coach', coachId] as const,
  byId: (id: string) => ['athletes', id] as const,
  byUserId: (userId: string) => ['athletes', 'user', userId] as const,
  byEmail: (email: string) => ['athletes', 'email', email] as const,
  stats: (athleteId: string) => ['athletes', athleteId, 'stats'] as const,
};
