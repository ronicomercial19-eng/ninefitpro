import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { inferUserState, type StateResult } from '@/services/adaptiveState';

let cache: { uid: string; at: number; result: StateResult } | null = null;
const TTL = 5 * 60 * 1000;

export function useUserState() {
  const { user } = useAuth();
  const [result, setResult] = useState<StateResult>({ state: 'balanced', reasoning: 'Carregando...', confidence: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const now = Date.now();
    if (cache && cache.uid === user.id && now - cache.at < TTL) {
      setResult(cache.result);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: logs } = await supabase
          .from('sync_score_logs' as any)
          .select('score, feedback_text, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        const arr = (logs as any[]) || [];
        const scores = arr.map((l) => Number(l.score)).reverse();
        const latest = arr[0];

        // Consistência: últimos 7 dias com pelo menos 1 log/dia
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const { count } = await supabase
          .from('sync_score_logs' as any)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());
        const consistency = Math.min(100, ((count || 0) / 7) * 100);

        const inferred = inferUserState({
          syncScore: latest ? Number(latest.score) : 5.5,
          recentScores: scores,
          recentConsistencyPct: consistency,
          feedbackText: latest?.feedback_text,
        });
        if (cancelled) return;
        cache = { uid: user.id, at: Date.now(), result: inferred };
        setResult(inferred);
      } catch (e) {
        console.debug('[useUserState]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const invalidate = () => { cache = null; };
  return { ...result, loading, invalidate };
}
