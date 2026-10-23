import { supabase } from '@/integrations/supabase/client';
import type { DailyContext } from './dailyContextRules';
import { parseDailyContext } from '@/lib/dailyContextContract';
export * from './dailyContextRules';

export async function fetchDailyContext(): Promise<DailyContext> {
  const { data, error } = await supabase.rpc('fn_get_daily_context' as never);
  if (error) throw error;
  return parseDailyContext(data);
}
