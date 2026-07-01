// src/services/skills.service.ts
import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from '@/types/domains';

/** Skills Service
 * - installSkill(manifest) => inserts into skills + skill_installations
 * - activateSkill(skillId) => sets activated = true (trigger will sync via nexus_publish)
 * - listSkills()
 * - listStudentSkills(athleteId)
 */

export async function installSkill(manifest: { key: string; name: string; version?: string; tier?: number; description?: string; content?: any }, installedBy?: string): Promise<ApiResponse<any>> {
  try {
    const payload = {
      key: manifest.key,
      name: manifest.name,
      version: manifest.version ?? '1.0',
      tier: manifest.tier ?? 1,
      description: manifest.description ?? null,
      content: manifest.content ?? {},
      installed: true,
      activated: false,
      installed_by: installedBy ?? null
    } as any;

    // Upsert skill
    const { data: skill, error } = await supabase.from('skills').upsert(payload, { onConflict: 'key' }).select().single();
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };

    // Insert installation record
    await supabase.from('skill_installations').insert({ skill_id: skill.id, installed_by: installedBy ?? null, metadata: { manifest } });

    return { success: true, data: skill };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function activateSkill(skillId: string): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase.from('skills').update({ activated: true, updated_at: new Date().toISOString() }).eq('id', skillId).select().single();
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function listSkills(): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase.from('skills').select('*').order('created_at', { ascending: false });
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function listStudentSkills(athleteId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase.from('student_skills').select('*, skills(*)').eq('athlete_id', athleteId).order('installed_at', { ascending: false });
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}
