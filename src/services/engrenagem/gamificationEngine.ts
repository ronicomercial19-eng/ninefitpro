/**
 * Gamification Engine — XP, levels, streaks.
 * Single entry point for awarding XP across the FitPro ecosystem.
 * Emits global events so any UI can react (overlay, toasts, animations).
 */
import { supabase } from '@/integrations/supabase/client';

export type XPAction =
  | 'workout_completed'
  | 'protocol_step'
  | 'protocol_completed'
  | 'check_in'
  | 'mood_logged'
  | 'water_log'
  | 'content_consumed'
  | 'mission_completed'
  | 'module_launched'
  | 'assessment_completed';

export interface XPMultipliers {
  streak?: number;        // streak days
  difficulty?: number;    // 1-3
}

const BASE_XP: Record<XPAction, number> = {
  workout_completed: 200,
  protocol_step: 25,
  protocol_completed: 150,
  check_in: 50,
  mood_logged: 30,
  water_log: 10,
  content_consumed: 40,
  mission_completed: 100,
  module_launched: 5,
  assessment_completed: 300,
};

function levelFromXP(xp: number): number {
  return Math.max(1, Math.floor(xp / 1000) + 1);
}

function computeMultiplier(m: XPMultipliers = {}): number {
  let mult = 1;
  if (m.streak && m.streak >= 3) mult += Math.min(0.5, m.streak * 0.05);
  if (m.difficulty) mult += (m.difficulty - 1) * 0.15;
  return Math.max(0.5, Math.min(2, mult));
}

export async function awardXP(
  action: XPAction,
  multipliers: XPMultipliers = {},
  meta: Record<string, any> = {}
): Promise<{ xp: number; newTotal: number; newLevel: number; leveledUp: boolean } | null> {
  try {
    const base = BASE_XP[action] ?? 25;
    const mult = computeMultiplier(multipliers);
    const xp = Math.round(base * mult);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const {data:athleteId,error:identityError}=await supabase.rpc('fn_current_athlete_id');
    if(identityError || !athleteId)throw identityError || new Error('Perfil de atleta não encontrado');
    const {data:rpcRes,error}=await supabase.rpc('fn_award_xp',{p_athlete_id:athleteId,p_amount:xp,p_source:action,p_metadata:meta as any});
    if(error)throw error;
    const row=Array.isArray(rpcRes)?rpcRes[0]:rpcRes;
    if(!row)throw new Error('Recompensa não confirmada');
    const newTotal=row.new_total_xp,newLevel=row.new_level,leveledUp=row.leveled_up;
    window.dispatchEvent(new CustomEvent('9fit:xp_awarded', {
      detail: { action, xp, multiplier: mult, newTotal, newLevel, leveledUp },
    }));
    if (leveledUp) {
      window.dispatchEvent(new CustomEvent('9fit:level_up', { detail: { newLevel, xp: newTotal } }));
    }

    return { xp, newTotal, newLevel, leveledUp };
  } catch (e) {
    console.error('[gamification] awardXP error', e);
    return null;
  }
}

export const Gamification = { awardXP, levelFromXP };
