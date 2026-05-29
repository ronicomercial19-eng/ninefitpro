import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const ACTIVATION_EVENTS = [
  { key: 'profile_complete',  label: 'Perfil completo + foto',  day: 3 },
  { key: 'first_assessment',  label: 'Avaliação inicial feita',  day: 5 },
  { key: 'first_plan',        label: 'Primeiro plano gerado',    day: 7 },
  { key: 'first_workout',     label: 'Primeiro treino registrado', day: 7 },
  { key: 'hub_engagement',    label: '3+ dias no Hub',           day: 7 },
  { key: 'streak_7d',         label: '7 dias de consistência',   day: 14 },
] as const;

export type ActivationKey = typeof ACTIVATION_EVENTS[number]['key'];

export function useActivationProgress() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('activation_events' as any)
      .select('event_key')
      .eq('user_id', user.id);
    setCompleted(new Set(((data as any[]) || []).map((r) => r.event_key)));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const mark = useCallback(async (key: ActivationKey, metadata: Record<string, any> = {}) => {
    if (!user?.id || completed.has(key)) return;
    await supabase.from('activation_events' as any).upsert(
      { user_id: user.id, event_key: key, metadata },
      { onConflict: 'user_id,event_key' } as any
    );
    setCompleted((s) => new Set([...s, key]));
  }, [user?.id, completed]);

  const total = ACTIVATION_EVENTS.length;
  const done = completed.size;
  const percent = Math.round((done / total) * 100);
  const next = ACTIVATION_EVENTS.find((e) => !completed.has(e.key));

  return { completed, mark, total, done, percent, next, loading, reload: load };
}
