/**
 * Auth Service
 * Centralized authentication and role management
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from '@/types/domains';

export async function getCurrentSession(): Promise<ApiResponse<any>> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) return { success: false, error: { code: 'SESSION_ERROR', message: error.message } };
    if (!session) return { success: false, error: { code: 'NO_SESSION', message: 'No active session' } };
    return { success: true, data: session, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getCurrentUser(): Promise<ApiResponse<any>> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { success: false, error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } };
    return { success: true, data: user, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getUserRole(userId: string): Promise<ApiResponse<string>> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data) return { success: false, error: { code: 'NO_ROLE', message: 'No role found' } };
    return { success: true, data: data.role, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function getUserProfile(userId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return { success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function signIn(email: string, password: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { success: false, error: { code: 'AUTH_ERROR', message: error.message } };
    return { success: true, data, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function signOut(): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: { code: 'SIGNOUT_ERROR', message: error.message } };
    return { success: true, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function updatePassword(newPassword: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: { code: 'PASSWORD_ERROR', message: error.message } };
    return { success: true, metadata: { timestamp: new Date().toISOString(), version: 'v1' } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export const authQueryKeys = {
  session: ['auth', 'session'] as const,
  user: ['auth', 'user'] as const,
  role: (userId: string) => ['auth', 'role', userId] as const,
  profile: (userId: string) => ['auth', 'profile', userId] as const,
};
