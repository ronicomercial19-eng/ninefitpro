import { useEffect, useState } from "react";
import { planWeek, pickWorkoutOfTheDay, type PlannedSession } from "@/services/training/workoutPlanner";
import { useAthleteId } from "@/hooks/useAthleteId";

export function useWorkoutOfTheDay() {
  const { athleteId } = useAthleteId();
  const [week, setWeek] = useState<PlannedSession[]>([]);
  const [today, setToday] = useState<PlannedSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!athleteId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const w = await planWeek(athleteId);
      if (cancelled) return;
      setWeek(w);
      setToday(pickWorkoutOfTheDay(w));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  return { week, today, loading };
}
