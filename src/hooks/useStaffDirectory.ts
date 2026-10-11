import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface StaffProfessional { user_id: string; full_name: string; role: string; avatar_url?: string | null; }

export function useStaffDirectory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['staff-directory', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<StaffProfessional[]> => {
      const { data, error } = await supabase.from('profiles').select('user_id,full_name,role,avatar_url').in('role', ['admin', 'super_admin', 'professor', 'trainer', 'nutritionist'] as any).eq('is_active', true).order('full_name');
      if (error) throw error;
      return (data || []) as StaffProfessional[];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });
}
