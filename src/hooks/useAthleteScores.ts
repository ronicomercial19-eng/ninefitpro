import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";

export interface RadarAxes {
  forca?: number;
  resistencia?: number;
  core?: number;
  cardio?: number;
  mobilidade?: number;
  global?: number;
}

export interface SyncScoreData {
  sync_score: number;
  total_xp: number;
  level: number;
  radar?: RadarAxes;
  treino: number;
  nutri: number;
  sono: number;
  mob: number;
  hidr: number;
  updated_at: string | null;
}

export type HubScoreStatus = "loading" | "available" | "calibrating" | "error";

function numeric(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function mapPayload(raw: any): SyncScoreData | null {
  if (!raw || typeof raw !== "object") return null;

  // The Hub's five dimensions must come from fields with the same meaning.
  // Do not derive nutrition/sleep/mobility/hydration from a performance radar.
  return {
    sync_score: numeric(raw.sync_score),
    total_xp: numeric(raw.total_xp),
    level: numeric(raw.level) || 1,
    radar: raw.radar && typeof raw.radar === "object" ? raw.radar : undefined,
    treino: numeric(raw.treino),
    nutri: numeric(raw.nutri),
    sono: numeric(raw.sono),
    mob: numeric(raw.mob),
    hidr: numeric(raw.hidr),
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

function hasMeasuredSignal(data: SyncScoreData): boolean {
  return [data.sync_score, data.treino, data.nutri, data.sono, data.mob, data.hidr]
    .some((value) => value > 0);
}

/**
 * Reads the Hub score snapshot. A missing or all-zero snapshot is calibration,
 * not a low physiological state. The UI can therefore be honest about data
 * availability instead of creating a fallback score.
 */
export const useAthleteScores = (athleteId: string | undefined | null) => {
  const [data, setData] = useState<SyncScoreData | null>(null);
  const [status, setStatus] = useState<HubScoreStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const fetchScores = useCallback(async () => {
    if (!athleteId) {
      setData(null);
      setStatus("calibrating");
      setError(null);
      return;
    }

    setStatus("loading");
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "fn_get_athlete_scores" as never,
        { p_athlete_id: athleteId } as never,
      );
      if (rpcError) throw rpcError;

      const mapped = mapPayload(result);
      setData(mapped);
      setStatus(mapped && hasMeasuredSignal(mapped) ? "available" : "calibrating");
      setError(null);
    } catch (err: any) {
      console.error("[useAthleteScores] error:", err);
      setData(null);
      setStatus("error");
      setError(err?.message ?? "Não foi possível carregar o Sync.");
    }
  }, [athleteId]);

  useEffect(() => {
    fetchScores();
    if (!athleteId) return;

    void supabase.auth.getUser().then(({ data: authData }) => {
      userIdRef.current = authData.user?.id ?? null;
    });

    const channel = supabase
      .channel(`scores:${athleteId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sync_score_logs" },
        (payload: any) => {
          const userId = payload?.new?.user_id;
          if (!userIdRef.current || userId === userIdRef.current) void fetchScores();
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` },
        () => void fetchScores())
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "athletes", filter: `id=eq.${athleteId}` },
        () => void fetchScores())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [athleteId, fetchScores]);

  return { data, status, loading: status === "loading", error, refresh: fetchScores };
};

export const getAthleteScores = async (athleteId: string): Promise<SyncScoreData | null> => {
  const { data, error } = await supabase.rpc(
    "fn_get_athlete_scores" as never,
    { p_athlete_id: athleteId } as never,
  );
  if (error) throw error;
  return mapPayload(data);
};
