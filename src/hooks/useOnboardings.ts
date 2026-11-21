import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
import { useAuth } from '@/contexts/AuthContext';

export interface OnboardingStep { key: string; label: string; done: boolean; optional?: boolean }
export interface OnboardingStage { key: string; title: string; steps: OnboardingStep[]; done: number; total: number; completed: boolean }
export interface Onboardings { athlete_id: string; current: string | null; stages: OnboardingStage[] }

/** Estado das 3 etapas de onboarding do aluno logado (fn_my_onboardings). */
export function useOnboardings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-onboardings', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await withTimeout(supabase.rpc('fn_my_onboardings' as never));
      if (error || !data) throw error || new Error('onboardings_unavailable');
      return data as unknown as Onboardings;
    },
  });
}
