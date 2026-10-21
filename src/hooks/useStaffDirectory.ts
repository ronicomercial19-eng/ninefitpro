import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface StaffProfessional { user_id: string; full_name: string; role: string; avatar_url?: string | null; }

/**
 * Equipe NINE nativa (admin + professor ativos).
 * Usa o RPC get_staff_directory (security definer), porque a RLS de profiles
 * só deixa o aluno ler o próprio perfil. O enum user_role só tem admin/student/professor.
 */
export function useStaffDirectory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['staff-directory', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StaffProfessional[]> => {
      const { data, error } = await supabase.rpc('get_staff_directory' as any);
      if (error) throw error;
      return ((data as any[]) || []) as StaffProfessional[];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });
}
