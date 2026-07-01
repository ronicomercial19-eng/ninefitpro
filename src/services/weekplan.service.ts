// src/services/weekplan.service.ts
import { supabase } from '@/integrations/supabase/client';
import type { ApiResponse } from '@/types/domains';

/**
 * Service: Week Plan (generate / list / apply)
 * - generateWeekForAthlete: cria um rascunho em student_week_plans chamando os RPCs smart_periodizer e smart_training_model
 * - applyWeekPlan: converte um week_plan em student_training_assignments (ativa)
 * - listWeekPlans: lista semanas do atleta
 */

export async function generateWeekForAthlete(
  athleteId: string,
  weekStart: string,
  opts: { useAi?: boolean } = { useAi: true }
): Promise<ApiResponse<any>> {
  try {
    // 1) fetch athlete
    const { data: athlete, error: athleteErr } = await supabase.from('athletes').select('*').eq('id', athleteId).maybeSingle();
    if (athleteErr) return { success: false, error: { code: 'DB_ERROR', message: athleteErr.message } };
    if (!athlete) return { success: false, error: { code: 'NOT_FOUND', message: 'Atleta não encontrado' } };

    // 2) choose periodization via RPC
    const { data: period, error: periodErr } = await supabase.rpc('smart_periodizer', { p_athlete_id: athleteId });
    if (periodErr) return { success: false, error: { code: 'RPC_ERROR', message: periodErr.message } };

    // 3) choose training model via RPC
    const { data: model, error: modelErr } = await supabase.rpc('smart_training_model', { p_athlete_id: athleteId, p_periodization_id: period?.id ?? null });
    if (modelErr) return { success: false, error: { code: 'RPC_ERROR', message: modelErr.message } };

    // 4) fetch catalog of exercises (library_items) to allow AI or heuristics to pick real exercises
    const { data: catalog, error: catalogErr } = await supabase.from('library_items').select('*').limit(300);
    if (catalogErr) return { success: false, error: { code: 'DB_ERROR', message: catalogErr.message } };

    // 5) generate days
    let days: any[] = [];

    if (opts.useAi) {
      // Call existing edge-function 'ai-coach' if available to generate concrete day plans
      // Fallback to simple mapping when ai-coach not available or returns error
      try {
        // supabase.functions.invoke expects body as second param in some SDKs; using REST pattern supported in repo elsewhere
        const fnRes: any = await (supabase as any).functions.invoke('ai-coach', {
          body: { mode: 'generate_training_week', athlete, model, period, catalog, weekStart }
        });

        if (fnRes?.data?.days) {
          days = fnRes.data.days;
        }
      } catch (aiErr) {
        // swallow and fallback
        console.warn('[generateWeekForAthlete] ai-coach failed, falling back to heuristic mapping', aiErr);
      }
    }

    if (!days || days.length === 0) {
      // Simple heuristic fallback: generate N days based on sessions_per_week or default 4
      const sessions = athlete.sessions_per_week ?? athlete.sessions_per_week ?? 4;
      const sessionCount = Math.max(1, Math.min(7, sessions));
      const templatePool = (catalog || []).filter((c: any) => c.type === 'exercise');

      // Distribute exercises across days
      for (let i = 0; i < sessionCount; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        // pick 6 exercises per day or less if not enough
        const exercises = (templatePool.slice(i * 6, i * 6 + 6) || []).map((e: any) => ({
          library_item_id: e.id,
          name: e.title || e.name || e.exercise_name || 'Exercício',
          sets: e.default_sets ?? 3,
          reps: e.default_reps ?? '8-12',
          notes: null
        }));

        days.push({ day_index: i, date: date.toISOString().split('T')[0], exercises });
      }

      // Fill remaining days as rest days up to 7 with empty arrays
      for (let i = sessionCount; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        days.push({ day_index: i, date: date.toISOString().split('T')[0], exercises: [] });
      }
    }

    // 6) save draft week in student_week_plans
    const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;
    const insert = {
      athlete_id: athleteId,
      week_start: weekStart,
      periodization_id: period?.id ?? null,
      training_model_id: model?.id ?? null,
      days,
      status: 'draft',
      created_by: userId
    } as any;

    const { error: insertErr } = await supabase.from('student_week_plans').insert(insert);
    if (insertErr) return { success: false, error: { code: 'DB_ERROR', message: insertErr.message } };

    return { success: true, data: { athlete: { id: athleteId }, week_start: weekStart, days } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err?.message ?? String(err) } };
  }
}

export async function listWeekPlans(athleteId: string): Promise<ApiResponse<any[]>> {
  try {
    const { data, error } = await supabase.from('student_week_plans').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false });
    if (error) return { success: false, error: { code: 'DB_ERROR', message: error.message } };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}

export async function applyWeekPlan(weekPlanId: string): Promise<ApiResponse<any>> {
  try {
    // 1) fetch week plan
    const { data: plan, error: planErr } = await supabase.from('student_week_plans').select('*').eq('id', weekPlanId).maybeSingle();
    if (planErr) return { success: false, error: { code: 'DB_ERROR', message: planErr.message } };
    if (!plan) return { success: false, error: { code: 'NOT_FOUND', message: 'Week plan not found' } };

    // 2) create student_training_assignments entry (is_active = true)
    const userId = (await supabase.auth.getUser()).data?.user?.id ?? null;
    const assignment = {
      student_id: plan.athlete_id,
      training_name: `Week plan ${plan.id}`,
      training_data: plan.days,
      start_date: plan.week_start,
      end_date: null,
      is_active: true,
      created_at: new Date().toISOString(),
      assigned_by: userId
    } as any;

    const { data: aData, error: assignErr } = await supabase.from('student_training_assignments').insert(assignment).select().single();
    if (assignErr) return { success: false, error: { code: 'DB_ERROR', message: assignErr.message } };

    // 3) mark week plan as applied
    const { error: updErr } = await supabase.from('student_week_plans').update({ status: 'applied', applied_at: new Date().toISOString() }).eq('id', weekPlanId);
    if (updErr) return { success: false, error: { code: 'DB_ERROR', message: updErr.message } };

    return { success: true, data: { assignment: aData } };
  } catch (err: any) {
    return { success: false, error: { code: 'UNEXPECTED_ERROR', message: err.message } };
  }
}
