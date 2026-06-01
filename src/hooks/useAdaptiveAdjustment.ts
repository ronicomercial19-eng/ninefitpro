import { useCallback, useState } from "react";
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

  const generate = useCallback(
    async (params: { workoutName?: string; workoutType?: string; recentRPE?: number }) => {
      if (!user?.id) return;
      setLoading(true);
      setError(null);
      const result = await requestAdaptiveAdjustment({
        userId: user.id,
        athleteId: athleteId ?? undefined,
        ...params,
      });
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

  return { adjustment, loading, error, generate, apply };
}
