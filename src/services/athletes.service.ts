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

    const { data, error } = await supabase.from('athletes').update(updatePayload as import("@/integrations/supabase/types").Database["public"]["Tables"]["athletes"]["Update"]).eq('id', id).select().single();
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

    const { data, error } = await supabase.from('athletes').update(updateData as import("@/integrations/supabase/types").Database["public"]["Tables"]["athletes"]["Update"]).eq('id', id).select().single();
    if (error) return { success: false, error: { code: 'ACTIVATION_ERROR', message: error.message } };

    await supabase.from('athlete_auth_link').upsert({ athlete_id: id, user_id: userId }, { onConflict: 'athlete_id' });
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

/**
 * Estatísticas do atleta logado.
 *
 * FONTE ÚNICA: level, total_xp e streak vêm de `fn_get_hub_snapshot`, a mesma
 * RPC usada por Hub e Perfil (useAthleteScores / recommendationEngine).
 * Não recalcular streak/XP/nível localmente — foi isso que fez Stats divergir.
 *
 * Pendência (Fase 1b): totalWorkouts e totalCalories ainda vêm de `workout_progress`
 * (tabela legada). Migrar para `workout_executions` via snapshot/view no servidor.
 */
export async function getAthleteStats(athleteId: string): Promise<ApiResponse<{
  totalWorkouts: number; totalCalories: number; currentStreak: number; level: number; totalXp: number;
}>> {
  try {
    const { data: snapshotRaw, error: snapshotError } = await supabase.rpc('fn_get_hub_snapshot' as any);
    if (snapshotError) return { success: false, error: { code: 'FETCH_ERROR', message: snapshotError.message } };

    const snapshot = snapshotRaw as any;
    if (!snapshot?.athlete?.id || snapshot.athlete.id !== athleteId) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Não foi possível confirmar a ficha do atleta.' } };
    }

    const { data: progress } = await supabase
      .from('workout_progress')
      .select('*')
      .eq('aluno_id', athleteId)
      .order('date', { ascending: false });

    const totalWorkouts = progress?.length ?? 0;
    const totalCalories = progress?.reduce((sum, p) => sum + (p.calories_burned ?? 0), 0) ?? 0;

    const streakValue = Number(snapshot.streak);
    const levelValue = Number(snapshot.athlete.level);
    const xpValue = Number(snapshot.athlete.total_xp);

    return {
      success: true,
      data: {
        totalWorkouts,
        totalCalories,
        currentStreak: Number.isFinite(streakValue) && streakValue >= 0 ? streakValue : 0,
        level: Number.isFinite(levelValue) && levelValue >= 1 ? levelValue : 1,
        totalXp: Number.isFinite(xpValue) && xpValue >= 0 ? xpValue : 0,
      },
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
