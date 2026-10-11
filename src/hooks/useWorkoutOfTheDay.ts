import { useEffect, useState } from "react";
import { planWeek, pickWorkoutOfTheDay, type PlannedSession } from "@/services/training/workoutPlanner";
import { useAthleteId } from "@/hooks/useAthleteId";

export function useWorkoutOfTheDay() {
  const { athleteId } = useAthleteId();
  const [week, setWeek] = useState<PlannedSession[]>([]);
  const [today, setToday] = useState<PlannedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => { const refresh = () => setRevision(value => value + 1); window.addEventListener("9fit:workout-updated", refresh); return () => window.removeEventListener("9fit:workout-updated", refresh); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!athleteId) {
        setWeek([]); setToday(null); setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
      const w = await planWeek(athleteId);
      if (cancelled) return;
      setWeek(w);
      setToday(pickWorkoutOfTheDay(w));
      setLoading(false);
      } catch { if (!cancelled) { setWeek([]); setToday(null); setError("Não foi possível carregar o planejamento de sessões."); setLoading(false); } }
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId, revision]);

  return { week, today, loading, error };
}
