import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteId } from './useAthleteId';
import { businessDate } from '@/services/dailyContextRules';
import { loadActivitySummary } from '@/services/activitySummary';

export function useActivitySummary() {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['activity-summary', user?.id, athleteId, businessDate()], queryFn: () => loadActivitySummary(athleteId!), enabled: !!user?.id && !!athleteId, refetchOnWindowFocus: true });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ['activity-summary', user?.id, athleteId] }); };
    window.addEventListener('9fit:workout-updated', refresh);
    window.addEventListener('9fit:sync_updated', refresh);
    return () => { window.removeEventListener('9fit:workout-updated', refresh); window.removeEventListener('9fit:sync_updated', refresh); };
  }, [client, athleteId, user?.id]);
  return query;
}
