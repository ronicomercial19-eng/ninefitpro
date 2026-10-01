import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteId } from '@/hooks/useAthleteId';
import { loadPrimeSnapshot } from '@/integrations/primeSystem';

export const usePrimeState = () => {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  return useQuery({
    queryKey: ['prime-snapshot', user?.id, athleteId],
    queryFn: () => loadPrimeSnapshot(user!.id, athleteId),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchInterval: 60000,
  });
};
