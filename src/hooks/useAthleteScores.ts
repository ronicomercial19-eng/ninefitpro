import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";

export interface RadarAxes {
  forca: number;
  resistencia: number;
  core: number;
  cardio: number;
  mobilidade: number;
  global: number;
}

export interface SyncScoreData {
  sync_score: number;
  total_xp: number;
  level: number;
  radar: RadarAxes;
  // Aliases legacy (Hub/HeroSync consomem estes nomes)
  treino: number;
  nutri: number;
  sono: number;
  mob: number;
  hidr: number;
  updated_at: string;
}

const EMPTY: SyncScoreData = {
  sync_score: 0,
  total_xp: 0,
  level: 1,
  radar: { forca: 0, resistencia: 0, core: 0, cardio: 0, mobilidade: 0, global: 0 },
  treino: 0, nutri: 0, sono: 0, mob: 0, hidr: 0,
  updated_at: new Date().toISOString(),
};

function mapPayload(raw: any): SyncScoreData {
  const radar = raw?.radar ?? {};
  return {
    sync_score: Number(raw?.sync_score ?? 0),
    total_xp: Number(raw?.total_xp ?? 0),
    level: Number(raw?.level ?? 1),
    radar: {
      forca: Number(radar.forca ?? 0),
      resistencia: Number(radar.resistencia ?? 0),
      core: Number(radar.core ?? 0),
      cardio: Number(radar.cardio ?? 0),
      mobilidade: Number(radar.mobilidade ?? 0),
      global: Number(radar.global ?? 0),
    },
    // Aliases → 5D visual antigo
    treino: Number(radar.forca ?? 0),
    nutri: Number(radar.global ?? 0),
    sono: Number(radar.mobilidade ?? 0),
    mob: Number(radar.resistencia ?? 0),
    hidr: Number(radar.cardio ?? 0),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Hook central de Sync Score + Radar 5D.
 * Consome fn_get_athlete_scores (fonte da verdade).
 * Subscribe realtime a sync_score_logs (user_id) + workout_executions (athlete_id).
 */
export const useAthleteScores = (athleteId: string | undefined | null) => {
  const [data, setData] = useState<SyncScoreData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchScores = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    try {
      const { data: result, error: err } = await supabase.rpc(
        "fn_get_athlete_scores" as any,
        { p_athlete_id: athleteId }
      );
      if (err) throw err;
      setData(mapPayload(result));
      setError(null);
    } catch (err: any) {
      console.error("[useAthleteScores] error:", err);
      setError(err?.message ?? "Failed to fetch scores");
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    if (!athleteId) return;
    fetchScores();
    supabase.auth.getUser().then(({ data: u }) => { userIdRef.current = u?.user?.id ?? null; });

    const ch = supabase
      .channel(`scores:${athleteId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sync_score_logs" },
        (payload: any) => {
          const uid = payload?.new?.user_id;
          if (!userIdRef.current || uid === userIdRef.current) fetchScores();
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` },
        () => fetchScores())
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "athletes", filter: `id=eq.${athleteId}` },
        () => fetchScores())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [athleteId, fetchScores]);

  return { data, loading, error, refresh: fetchScores };
};

export const getAthleteScores = async (athleteId: string): Promise<SyncScoreData> => {
  const { data, error } = await supabase.rpc("fn_get_athlete_scores" as any, { p_athlete_id: athleteId });
  if (error) throw error;
  return mapPayload(data);
};
