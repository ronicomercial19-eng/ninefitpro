import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";

export type HubMetricStatus = "not_collected" | "available" | "stale" | "error" | "offline";
export type HubScoreStatus = "loading" | "available" | "calibrating" | "stale" | "error" | "offline";

export interface HubMetric {
  value: number | null;
  status: HubMetricStatus;
  source: string | string[] | null;
  observed_at: string | null;
}

export interface HubSnapshot {
  version: number;
  status: string;
  generated_at: string | null;
  athlete?: { id: string; name: string | null };
  sync: HubMetric;
  dimensions: {
    treino: HubMetric;
    nutri: HubMetric;
    sono: HubMetric;
    mob: HubMetric;
    hidr: HubMetric;
  };
  weekly: { treinos: number; nutri: number; minutos: number };
  vitals: {
    water: HubMetric;
    hrv: HubMetric;
    calories: HubMetric;
    heart_rate: HubMetric;
  };
}

const emptyMetric = (): HubMetric => ({
  value: null,
  status: "not_collected",
  source: null,
  observed_at: null,
});

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapMetric(raw: unknown): HubMetric {
  if (!raw || typeof raw !== "object") return emptyMetric();
  const value = raw as Record<string, unknown>;
  const allowed: HubMetricStatus[] = ["not_collected", "available", "stale", "error", "offline"];
  const status = allowed.includes(value.status as HubMetricStatus)
    ? value.status as HubMetricStatus
    : numericOrNull(value.value) === null ? "not_collected" : "available";

  return {
    value: status === "not_collected" ? null : numericOrNull(value.value),
    status,
    source: typeof value.source === "string" || Array.isArray(value.source)
      ? value.source as string | string[]
      : null,
    observed_at: typeof value.observed_at === "string" ? value.observed_at : null,
  };
}

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function mapPayload(raw: unknown): HubSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, any>;
  const dimensions = value.dimensions ?? {};
  const vitals = value.vitals ?? {};
  const weekly = value.weekly ?? {};

  return {
    version: count(value.version) || 1,
    status: typeof value.status === "string" ? value.status : "calibrating",
    generated_at: typeof value.generated_at === "string" ? value.generated_at : null,
    athlete: value.athlete && typeof value.athlete === "object"
      ? { id: String(value.athlete.id ?? ""), name: typeof value.athlete.name === "string" ? value.athlete.name : null }
      : undefined,
    sync: mapMetric(value.sync),
    dimensions: {
      treino: mapMetric(dimensions.treino),
      nutri: mapMetric(dimensions.nutri),
      sono: mapMetric(dimensions.sono),
      mob: mapMetric(dimensions.mob),
      hidr: mapMetric(dimensions.hidr),
    },
    weekly: {
      treinos: count(weekly.treinos),
      nutri: count(weekly.nutri),
      minutos: count(weekly.minutos),
    },
    vitals: {
      water: mapMetric(vitals.water),
      hrv: mapMetric(vitals.hrv),
      calories: mapMetric(vitals.calories),
      heart_rate: mapMetric(vitals.heart_rate),
    },
  };
}

function scoreStatus(snapshot: HubSnapshot | null): HubScoreStatus {
  if (!snapshot || snapshot.sync.value === null || snapshot.sync.status === "not_collected") return "calibrating";
  if (snapshot.sync.status === "stale") return "stale";
  if (snapshot.sync.status === "offline") return "offline";
  if (snapshot.sync.status === "error") return "error";
  return "available";
}

/**
 * Single read-model for the Hub. The authenticated RPC resolves the athlete
 * server-side; no user or athlete identity is trusted from the browser.
 */
export const useAthleteScores = (athleteId: string | undefined | null) => {
  const [data, setData] = useState<HubSnapshot | null>(null);
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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      setError("Sem conexão. Exibindo o último estado disponível.");
      return;
    }

    setStatus("loading");
    try {
      const { data: result, error: rpcError } = await supabase.rpc("fn_get_hub_snapshot" as any);
      if (rpcError) throw rpcError;

      const mapped = mapPayload(result);
      setData(mapped);
      setStatus(scoreStatus(mapped));
      setError(null);
    } catch (err: any) {
      console.error("[useAthleteScores] error:", err);
      setStatus("error");
      setError(err?.message ?? "Não foi possível carregar o Hub.");
    }
  }, [athleteId]);

  useEffect(() => {
    fetchScores();
    if (!athleteId) return;

    void supabase.auth.getUser().then(({ data: authData }) => {
      userIdRef.current = authData.user?.id ?? null;
    });

    const onOffline = () => setStatus("offline");
    const onOnline = () => void fetchScores();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const channelName = `hub-snapshot:${athleteId}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sync_score_logs" },
        (payload: any) => {
          const userId = payload?.new?.user_id;
          if (!userIdRef.current || userId === userIdRef.current) void fetchScores();
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "workout_executions", filter: `athlete_id=eq.${athleteId}` },
        () => void fetchScores())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "master_registry" },
        (payload: any) => {
          const userId = payload?.new?.user_id ?? payload?.old?.user_id;
          if (!userIdRef.current || userId === userIdRef.current) void fetchScores();
        })
      .subscribe();

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      void supabase.removeChannel(channel);
    };
  }, [athleteId, fetchScores]);

  return { data, status, loading: status === "loading", error, refresh: fetchScores };
};

export const getAthleteScores = async (): Promise<HubSnapshot | null> => {
  const { data, error } = await supabase.rpc("fn_get_hub_snapshot" as any);
  if (error) throw error;
  return mapPayload(data);
};
