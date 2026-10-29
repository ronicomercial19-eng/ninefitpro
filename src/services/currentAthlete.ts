import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';

export const currentAthleteKey = (userId: string | undefined) => ['current-athlete', userId] as const;

/** All student surfaces resolve the same authenticated athlete, never by email. */
export async function loadCurrentAthlete(signal?: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  try {
    const { data: id, error } = await withTimeout(
      supabase.rpc('fn_current_athlete_id').abortSignal(controller.signal),
    );
    if (error) throw error;
    if (!id) return null;
    const { data, error: profileError } = await withTimeout(
      supabase.from('athletes').select('id,name,email,phone,activated,coach_id')
        .eq('id', id).abortSignal(controller.signal).single(),
    );
    if (profileError) throw profileError;
    return data;
  } finally {
    signal?.removeEventListener('abort', cancel);
    controller.abort();
  }
}

export const currentAthleteOptions = (userId: string | undefined) => ({
  queryKey: currentAthleteKey(userId),
  queryFn: ({ signal }: { signal: AbortSignal }) => loadCurrentAthlete(signal),
  staleTime: 60_000,
  retry: false as const,
  retryOnMount: false,
});
