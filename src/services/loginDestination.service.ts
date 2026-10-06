import { supabase } from '@/integrations/supabase/client';
import { loginDestination } from '@/lib/loginDestination';
export async function resolveLoginDestination(userId: string): Promise<string> {
  const [profile, roles] = await Promise.all([
    supabase.from('profiles').select('role').eq('user_id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
  ]);
  if (profile.error || roles.error) throw new Error('Não foi possível carregar seu perfil. Tente novamente.');
  return loginDestination(profile.data?.role, roles.data?.map(row => row.role));
}
