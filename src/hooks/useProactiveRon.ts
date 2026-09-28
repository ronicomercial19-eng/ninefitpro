import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProactiveTip {
  id: string;          // chave única (controle de dismiss por dia)
  text: string;
  cta?: string;
}

/**
 * Triggers contextuais do RON proativo:
 *  · 07h-09h e Sync<60          → "Seu sistema acordou abaixo da média."
 *  · 17h-19h e sem treino hoje  → "Ainda dá tempo. 35 min mudam seu estado."
 *  · 21h-22h e sem mobilidade   → "Recuperação é parte do protocolo."
 *  · 22h-23h59 e streak em risco → "Seu streak está em risco."
 */
export function useProactiveRon() {
  const { user } = useAuth();
  const [tip, setTip] = useState<ProactiveTip | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const run = async () => {
      const hour = new Date().getHours();
      const today = new Date().toISOString().slice(0, 10);

      // Carrega contexto mínimo
      const { data: athlete } = await supabase
        .from('athletes')
        .select('sync_score')
        .eq('user_id', user.id)
        .maybeSingle();
      const sync = (athlete as any)?.sync_score ?? 100;

      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { data: events } = await supabase
        .from('master_registry' as any)
        .select('event_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since);
      const has = (k: string) => (events as any[] | null)?.some((e) => e.event_type === k) ?? false;
      const trainedToday = has('workout_completed');
      const mobToday     = has('mobility_log');
      const protocolStep = has('daily_protocol_step');

      // Dismiss store por dia
      const dismissedKey = `9fit_ron_dismissed_${today}`;
      const dismissed: string[] = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

      const candidates: ProactiveTip[] = [];
      if (hour >= 7 && hour < 10 && sync < 60) {
        candidates.push({ id: 'morning-low-sync', text: 'Seu sistema acordou abaixo da média. Vamos calibrar?', cta: 'Conversar' });
      }
      if (hour >= 17 && hour < 20 && !trainedToday) {
        candidates.push({ id: 'afternoon-no-workout', text: 'Ainda dá tempo. 35 min é tudo que você precisa hoje.', cta: 'Ver treino' });
      }
      if (hour >= 21 && hour < 23 && !mobToday) {
        candidates.push({ id: 'night-no-mob', text: 'Recuperação é parte do protocolo.', cta: 'Mobilidade' });
      }
      if (hour >= 22 && !protocolStep) {
        candidates.push({ id: 'late-streak-risk', text: 'Faltam minutos para preservar sua sequência.', cta: 'Abrir protocolo' });
      }

      const next = candidates.find((c) => !dismissed.includes(c.id)) || null;
      setTip(next);
    };

    run();
    const itv = setInterval(run, 5 * 60 * 1000); // re-check a cada 5 min
    return () => clearInterval(itv);
  }, [user?.id]);

  const dismiss = (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `9fit_ron_dismissed_${today}`;
    const cur: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!cur.includes(id)) cur.push(id);
    localStorage.setItem(key, JSON.stringify(cur));
    setTip(null);
  };

  return { tip, dismiss };
}
