import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from './useAthleteId';

export type ActivationStep =
  | 'not_started'
  | 'assessment'
  | 'generation'
  | 'execute'
  | 'consistency'
  | 'finished';

export interface ActivationRow {
  athlete_id: string;
  assessment_done_at: string | null;
  plan_generated_at: string | null;
  first_workout_at: string | null;
  consistency_days: number | null;
  fully_activated: boolean | null;
  finished_at: string | null;
  activation_events?: any[] | null;
}

/**
 * Fluxo único de ativação. Consome apenas RPCs do backend
 * (activation_advance / activation_finish) — nunca escreve direto em tabela.
 */
export function useActivationFlow() {
  const { athleteId, loading: idLoading } = useAthleteId();
  const [row, setRow] = useState<ActivationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);

  const refresh = useCallback(async () => {
    if (!athleteId) return;
    const { data } = await supabase
      .from('athlete_activation' as any)
      .select('*')
      .eq('athlete_id', athleteId)
      .maybeSingle();
    setRow((data as any) ?? null);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    if (!idLoading) refresh();
  }, [idLoading, refresh]);

  const advanceStep = useCallback(
    async (
      step: 'assessment' | 'generation' | 'execute' | 'consistency',
      payload: Record<string, any> = {},
    ) => {
      if (!athleteId) return null;
      setAdvancing(true);
      try {
        const { data, error } = await supabase.rpc('activation_advance' as any, {
          p_athlete_id: athleteId,
          p_step: step,
          p_payload: payload,
        });
        if (error) {
          console.error('[activation_advance]', step, error);
        }
        await refresh();
        return data;
      } finally {
        setAdvancing(false);
      }
    },
    [athleteId, refresh],
  );

  const finishActivation = useCallback(async () => {
    if (!athleteId) return null;
    setAdvancing(true);
    try {
      const { data, error } = await supabase.rpc('activation_finish' as any, {
        p_athlete_id: athleteId,
      });
      if (error) console.error('[activation_finish]', error);
      await refresh();
      return data;
    } finally {
      setAdvancing(false);
    }
  }, [athleteId, refresh]);

  // Deriva o passo atual a partir da linha persistida
  const derivedStep: ActivationStep = row?.finished_at
    ? 'finished'
    : row?.first_workout_at
    ? 'consistency'
    : row?.plan_generated_at
    ? 'execute'
    : row?.assessment_done_at
    ? 'generation'
    : 'not_started';

  return {
    athleteId,
    row,
    loading: loading || idLoading,
    advancing,
    derivedStep,
    advanceStep,
    finishActivation,
    refresh,
  };
}
