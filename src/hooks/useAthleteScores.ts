import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AthleteScores = {
  sync_score: number;
  treino: number;
  nutri: number;
  sono: number;
  mob: number;
  hidr: number;
  updated_at: string;
};

const empty: AthleteScores = {
  sync_score: 0, treino: 0, nutri: 0, sono: 0, mob: 0, hidr: 0,
  updated_at: new Date().toISOString(),
};

/**
 * Sync Score + Radar 5D via RPC get_athlete_scores.
 * Realtime nas tabelas sync_score_logs, ninefit_checkins, workout_executions.
 */
export function useAthleteScores(athleteId?: string | null) {
  const [data, setData] = useState<AthleteScores>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    const { data: res, error } = await supabase.rpc("get_athlete_scores" as any, { p_athlete_id: athleteId });
    if (!error && res) setData({ ...empty, ...(res as any) });
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!athleteId) return;
    const channel = supabase
      .channel(`scores-${athleteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "sync_score_logs", filter: `athlete_id=eq.${athleteId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "ninefit_checkins", filter: `athlete_id=eq.${athleteId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [athleteId, refresh]);

  return { data, loading, refresh };
}
