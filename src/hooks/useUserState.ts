import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { inferUserState, type StateResult } from '@/services/adaptiveState';

let cache: { uid: string; at: number; result: StateResult } | null = null;
const TTL = 5 * 60 * 1000;

export function useUserState() {
  const { user } = useAuth();
  const [result, setResult] = useState<StateResult>({ state: 'unknown', reasoning: 'Carregando dados...', confidence: 0 });
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refreshState = () => {
      cache = null;
      setRevision((value) => value + 1);
    };
    ["9fit:user-state-invalidated","9fit:sync_updated","9fit:workout-updated"].forEach(event=>window.addEventListener(event,refreshState));
    return () => ["9fit:user-state-invalidated","9fit:sync_updated","9fit:workout-updated"].forEach(event=>window.removeEventListener(event,refreshState));
  }, []);

  useEffect(() => {
    if (!user?.id) { cache=null; setResult({ state:'unknown', reasoning:'Entre para acompanhar sua recuperação.', confidence:0 }); setLoading(false); return; }
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
          .select('score, feedback_text, created_at, source')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        const arr = (logs as any[]) || [];
        const normalized = (l: any) => l.source === "hub_mood" ? Number(l.score)*10 : l.source === "post_workout" ? Math.max(0,100-Number(l.score)*10) : Number(l.score);
        const scores = arr.map(normalized).reverse();
        const latest = arr[0];

        // Consistência: últimos 7 dias com pelo menos 1 log/dia
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
        const { data: consistencyLogs } = await supabase
          .from('sync_score_logs' as any)
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());
        const consistency = Math.min(100, (new Set((consistencyLogs || []).map((entry: any) => new Date(entry.created_at).toLocaleDateString('pt-BR'))).size / 7) * 100);

        const inferred: StateResult = latest
          ? inferUserState({
              syncScore: normalized(latest),
              scoreScale: 100,
              recentScores: scores,
              recentConsistencyPct: consistency,
              feedbackText: latest.feedback_text,
            })
          : {
              state: 'unknown',
              reasoning: 'Ainda não há sinais suficientes para uma leitura confiável.',
              confidence: 0,
            };
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
  }, [user?.id, revision]);

  const invalidate = () => {
    cache = null;
    window.dispatchEvent(new Event("9fit:user-state-invalidated"));
  };
  return { ...result, loading, invalidate };
}
