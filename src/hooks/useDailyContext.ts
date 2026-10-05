import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { businessDate, fetchDailyContext } from '@/services/dailyContext';

export const DAILY_CONTEXT_EVENTS = ['9fit:sync_updated', '9fit:workout-updated', '9fit:nutrition-updated', '9fit:water-updated', '9fit:profile-updated', '9fit:day-reviewed', '9fit:user-state-invalidated'];

export function useDailyContext() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => { const changed = () => setOnline(navigator.onLine); window.addEventListener('online', changed); window.addEventListener('offline', changed); return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); }; }, []);
  const query = useQuery({ queryKey: ['daily-context', user?.id], queryFn: fetchDailyContext, enabled: !!user?.id, staleTime: 30_000, retry: 1, refetchOnWindowFocus: 'always' });
  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => void client.invalidateQueries({ queryKey: ['daily-context', user.id] });
    const visible = () => { if (!document.hidden) refresh(); };
    DAILY_CONTEXT_EVENTS.forEach(event => window.addEventListener(event, refresh));
    document.addEventListener('visibilitychange', visible);
    // No polling. Re-read once at business-day rollover, even while the screen stays open.
    let timer: number;
    const schedule = () => {
      const current = Date.now(); const today = businessDate(new Date(current));
      let lower = current; let upper = current + 86_400_000;
      while (upper - lower > 1000) { const mid = Math.floor((lower + upper) / 2); if (businessDate(new Date(mid)) === today) lower = mid; else upper = mid; }
      timer = window.setTimeout(() => { refresh(); schedule(); }, upper - current + 1000);
    };
    schedule();
    return () => { clearTimeout(timer); DAILY_CONTEXT_EVENTS.forEach(event => window.removeEventListener(event, refresh)); document.removeEventListener('visibilitychange', visible); };
  }, [client, user?.id]);
  return { ...query, online };
}
