import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadPredictiveSnapshot, PredictiveSnapshot } from "@/services/predictiveEngine";
import { cacheManager } from "@/utils/cacheManager";

export function usePredictiveContext(): { snapshot: PredictiveSnapshot; loading: boolean } {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<PredictiveSnapshot>({
    context: "morning",
    flags: [],
    priorityModule: null,
    insights: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      const key = `predictive:${user.id}`;
      const cached = cacheManager.get<PredictiveSnapshot>(key);
      if (cached) {
        setSnapshot(cached);
        setLoading(false);
        return;
      }
      const snap = await loadPredictiveSnapshot(user.id);
      if (!cancel) {
        cacheManager.set(key, snap, 60_000);
        setSnapshot(snap);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  return { snapshot, loading };
}
