import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { loadEngrenagemContext, getSquadInsights } from '@/services/engrenagem/recommendationEngine';

export function useEngrenagem() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['athlete-profile-state', user?.id], queryFn: loadEngrenagemContext, enabled: !!user?.id, refetchOnWindowFocus: true });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ['athlete-profile-state', user?.id] }); };
    const events = ['9fit:sync_updated', '9fit:workout-updated', '9fit:user-state-invalidated', '9fit:profile-updated', '9fit:xp_awarded', '9fit:protocol_completed', '9fit:mission_completed'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, [client, user?.id]);
  const data = query.isError ? undefined : query.data;
  return { loading: query.isPending, error: query.isError, totalXp: data?.totalXp ?? 0, level: data?.level ?? 1, syncScore: data?.syncScore ?? null, streak: data?.streak ?? 0, isPremium: data?.isPremium ?? false, insights: data ? getSquadInsights(data) : [], refresh: async () => { await query.refetch(); } };
}
