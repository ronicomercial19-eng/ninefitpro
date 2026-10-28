import { supabase } from '@/integrations/supabase/client';
import type { DailyContext } from './dailyContextRules';
import { parseDailyContext } from '@/lib/dailyContextContract';
import { withTimeout } from '@/lib/withTimeout';
import { ACTIVATION_PROFILE_KEYS } from '@/lib/activationProfile';
export * from './dailyContextRules';

export async function fetchDailyContext(): Promise<DailyContext> {
  const { data, error } = await withTimeout(supabase.rpc('fn_get_daily_context' as never));
  if (error) throw error;
  const context = parseDailyContext(data);
  context.profile.complete = context.profile.complete && ACTIVATION_PROFILE_KEYS.every(key => Object.prototype.hasOwnProperty.call(context.profile.declared, key));
  return context;
}
