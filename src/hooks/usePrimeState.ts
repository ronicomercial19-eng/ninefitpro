import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePrimeState = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Biomarkers
  const { data: biomarkers } = useQuery({
    queryKey: ['biometrics', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('biometrics').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(1).single();
      return data || { testosterone: 840, cortisol: 9.2, glucose: 84, hrv: 104 };
    },
    enabled: !!user?.id,
  });

  const updateBiometrics = useMutation({
    mutationFn: async (newBio: any) => {
      await supabase.from('biometrics').insert({ ...newBio, user_id: user?.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['biometrics', user?.id] })
  });

  // Macros
  const { data: macros } = useQuery({
    queryKey: ['nutrition_goals', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('nutrition_goals').select('*').eq('user_id', user?.id).single();
      return data || { protein: 210, proteinMax: 240, fats: 75, fatsMax: 90, carbs: 290, carbsMax: 350 };
    },
    enabled: !!user?.id,
  });

  const updateMacros = useMutation({
    mutationFn: async (newMacros: any) => {
      await supabase.from('nutrition_goals').upsert({ ...newMacros, user_id: user?.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nutrition_goals', user?.id] })
  });

  return { biomarkers, updateBiometrics, macros, updateMacros };
};
