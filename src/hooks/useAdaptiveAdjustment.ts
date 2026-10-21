import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from "@/hooks/useAthleteId";
import {
  persistAcceptedAdjustment,
  requestAdaptiveAdjustment,
  type AdaptiveAdjustment,
} from "@/services/training/trainingAgent";

export function useAdaptiveAdjustment() {
  const { user } = useAuth();
  const { athleteId } = useAthleteId();
  const [adjustment, setAdjustment] = useState<AdaptiveAdjustment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reset = useCallback(() => {
    requestId.current += 1;
    setAdjustment(null);
    setLoading(false);
    setError(null);
  }, []);

  const generate = useCallback(
    async (params: { workoutName?: string; workoutType?: string; recentRPE?: number; exercises?: string[]; prescription?: Array<{ name: string; sets: number; reps: string; restSeconds: number; rpe?: number }>; date?: string; request?: string; sync?: number | null; dayNumber?: number | null; focusMuscles?: string[]; safetyReason?: string | null; painRegion?: string | null; periodization?: { model?: string | null; status?: string | null; notes?: string | null } }) => {
      if (!user?.id) return;
      const currentRequest = ++requestId.current;
      setLoading(true);
      setError(null);
      const result = await requestAdaptiveAdjustment({
        userId: user.id,
        athleteId: athleteId ?? undefined,
        ...params,
      });
      if (currentRequest !== requestId.current) return null;
      if (!result) setError("FitCopilot indisponível agora.");
      setAdjustment(result);
      setLoading(false);
      return result;
    },
    [user?.id, athleteId],
  );

  const apply = useCallback(async () => {
    if (adjustment && user?.id) await persistAcceptedAdjustment(user.id, adjustment);
  }, [adjustment, user?.id]);

  return { adjustment, loading, error, generate, apply, reset };
}
