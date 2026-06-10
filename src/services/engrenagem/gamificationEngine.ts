/**
 * Gamification Engine — XP, levels, streaks, sync score.
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
  syncScore?: number;     // 0-100
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
  if (m.syncScore != null) {
    if (m.syncScore >= 75) mult += 0.2;
    else if (m.syncScore < 40) mult -= 0.1;
  }
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
    if (!user) {
      window.dispatchEvent(new CustomEvent('9fit:xp_awarded', { detail: { action, xp, multiplier: mult, ephemeral: true } }));
      return { xp, newTotal: xp, newLevel: 1, leveledUp: false };
    }

    // Resolve athlete
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, total_xp, level')
      .eq('user_id', user.id)
      .maybeSingle();

    let prevXp = (athlete as any)?.total_xp ?? 0;
    let prevLevel = (athlete as any)?.level ?? levelFromXP(prevXp);
    let newTotal = prevXp + xp;
    let newLevel = levelFromXP(newTotal);
    let leveledUp = newLevel > prevLevel;

    if (athlete?.id) {
      const { data: rpcRes } = await supabase.rpc('fn_award_xp' as any, {
        p_athlete_id: athlete.id,
        p_amount: xp,
        p_source: action,
        p_metadata: meta as any,
      });
      const row = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
      if (row) {
        newTotal = (row as any).new_total_xp ?? newTotal;
        newLevel = (row as any).new_level ?? newLevel;
        leveledUp = (row as any).leveled_up ?? leveledUp;
      }
    }

    // Best-effort event log
    try {
      await supabase.from('gamification_events' as any).insert({
        user_id: user.id,
        athlete_id: athlete?.id ?? null,
        event_type: action,
        xp_awarded: xp,
        multiplier: mult,
        metadata: meta,
      });
    } catch (e) {
      console.debug('[gamification] event log skipped', e);
    }

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
