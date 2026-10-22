import { supabase } from '@/integrations/supabase/client';
import { loginDestination } from '@/lib/loginDestination';
import { CUSTOMER_ENTRY, entryStorage, readEntry } from '@/lib/customerEntry';
export async function resolveLoginDestination(userId: string): Promise<string> {
  const [profile, roles] = await Promise.all([
    supabase.from('profiles').select('role,first_access_completed').eq('user_id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
  ]);
  if (profile.error || roles.error) throw new Error('Não foi possível carregar seu perfil. Tente novamente.');
  const destination = loginDestination(profile.data?.role, roles.data?.map(row => row.role));
  if (destination !== '/app' && (readEntry(entryStorage()) || profile.data?.first_access_completed !== true)) return CUSTOMER_ENTRY;
  return destination;
}
