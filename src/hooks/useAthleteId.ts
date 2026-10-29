import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { currentAthleteOptions } from '@/services/currentAthlete';

export function useAthleteId() {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    ...currentAthleteOptions(user?.id),
    enabled: !!user && !authLoading,
  });
  const athlete = user ? query.data : null;
  return {
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    loading: authLoading || (!!user && query.isPending),
    error: !user || authLoading ? null : query.error
      ? 'Não foi possível carregar seu perfil. Tente novamente.'
      : query.isSuccess && !athlete ? 'Perfil de atleta não encontrado' : null,
    retry: () => query.refetch(),
  };
}
