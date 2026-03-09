/**
 * Analytics Service
 * System events, check-ins, and reports
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse, DateRange } from '@/types/domains';

// ==================== SYSTEM EVENTS ====================

type EventType = 'approved' | 'assigned' | 'completed' | 'created' | 'deleted' | 'notified' | 'rejected' | 'started' | 'updated' | 'viewed';
type CheckinTipo = 'mensal' | 'semanal' | 'trimestral';
type ReportTipo = 'diagnostico' | 'evolutivo' | 'trimestral';

export async function logSystemEvent(event: {
  event_type: EventType;
  entity_type: string;
  entity_id: string;
  target_id?: string;
  metadata?: Record<string, any>;
}): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('system_events')
      .insert({
        event_type: event.event_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        target_id: event.target_id,
        metadata: event.metadata ?? {},
      })
      .select()
      .single();

    if (error) return { success: false, error: { code: 'CREATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getSystemEvents(options?: {
  entityType?: string; eventType?: EventType; limit?: number; dateRange?: DateRange;
}): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('system_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (options?.entityType) query = query.eq('entity_type', options.entityType);
    if (options?.eventType) query = query.eq('event_type', options.eventType);
    if (options?.limit) query = query.limit(options.limit);

    if (options?.dateRange) {
      const from = typeof options.dateRange.from === 'string' ? options.dateRange.from : options.dateRange.from.toISOString();
      const to = typeof options.dateRange.to === 'string' ? options.dateRange.to : options.dateRange.to.toISOString();
      query = query.gte('created_at', from).lte('created_at', to);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== CHECKINS ====================

export async function getAthleteCheckins(
  athleteId: string, options?: { tipo?: CheckinTipo; limit?: number }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('ninefit_checkins')
      .select('*')
      .eq('aluno_id', athleteId)
      .order('data_checkin', { ascending: false });

    if (options?.tipo) query = query.eq('tipo', options.tipo);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function createCheckin(checkin: {
  aluno_id: string;
  professor_id: string;
  tipo?: CheckinTipo;
  sono?: number;
  energia?: number;
  dor?: number;
  dor_local?: string;
  alimentacao?: number;
  treinos_semana?: number;
}): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('ninefit_checkins')
      .insert(checkin as any)
      .select()
      .single();

    if (error) return { success: false, error: { code: 'CREATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== REPORTS ====================

export async function getAthleteReports(
  athleteId: string, options?: { tipo?: ReportTipo; limit?: number }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('ninefit_reports')
      .select('*')
      .eq('aluno_id', athleteId)
      .order('data_relatorio', { ascending: false });

    if (options?.tipo) query = query.eq('tipo', options.tipo);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== NOTIFICATIONS ====================

export async function getNotifications(
  userId: string, options?: { unreadOnly?: boolean; limit?: number }
): Promise<ApiResponse<any[]>> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options?.unreadOnly) query = query.eq('is_read', false);
    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) return { success: false, error: { code: 'FETCH_ERROR', message: error.message } };
    return { success: true, data: data ?? [], metadata: { timestamp: new Date().toISOString(), version: 'v1', count: data?.length ?? 0 } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function markNotificationRead(notificationId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) return { success: false, error: { code: 'UPDATE_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

// ==================== QUERY KEYS ====================

export const analyticsQueryKeys = {
  events: {
    all: ['analytics', 'events'] as const,
    byType: (type: string) => ['analytics', 'events', type] as const,
  },
  checkins: {
    all: ['analytics', 'checkins'] as const,
    byAthlete: (athleteId: string) => ['analytics', 'checkins', 'athlete', athleteId] as const,
  },
  reports: {
    all: ['analytics', 'reports'] as const,
    byAthlete: (athleteId: string) => ['analytics', 'reports', 'athlete', athleteId] as const,
  },
  notifications: {
    all: ['analytics', 'notifications'] as const,
    byUser: (userId: string) => ['analytics', 'notifications', 'user', userId] as const,
  },
};
