import { supabase } from '@/integrations/supabase/client';
import type { DailyContext } from './dailyContextRules';
export * from './dailyContextRules';

export async function fetchDailyContext(): Promise<DailyContext> {
  const { data, error } = await supabase.rpc('fn_get_daily_context' as never);
  if (error) throw error;
  const result = data as unknown as DailyContext;
  if (result?.status !== 'available' || result?.version !== 2) throw new Error('Perfil do aluno ainda não está disponível.');
  return result;
}
