import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface SyncScoreData {
  sync_score: number;        // Score composto (0-100)
  treino: number;            // Eixo treino
  nutri: number;             // Eixo nutrição
  sono: number;              // Eixo sono
  mob: number;               // Mobilidade/recovery
  hidr: number;              // HRV/hidratação
  updated_at: string;
}

/**
 * Hook para obter Radar 5D (sync_score) em tempo real
 * Usa get_athlete_scores() para calcular composição
 */
export const useAthleteScores = (athleteId: string | undefined) => {
  const [data, setData] = useState<SyncScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }

    const fetchScores = async () => {
      try {
        const { data: result, error: err } = await supabase.rpc(
          "get_athlete_scores",
          { p_athlete_id: athleteId }
        );

        if (err) throw err;
        setData(result as SyncScoreData);
        setError(null);
      } catch (err) {
        console.error("[useAthleteScores] error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch scores");
      } finally {
        setLoading(false);
      }
    };

    fetchScores();

    // Realtime subscription para sync_score_logs
    const channel = supabase
      .channel(`scores:${athleteId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sync_score_logs",
          filter: `athlete_id=eq.${athleteId}`,
        },
        () => {
          // Recalcular ao inserir novo log
          fetchScores();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [athleteId]);

  return { data, loading, error };
};

/**
 * Get one-shot sem realtime
 */
export const getAthleteScores = async (athleteId: string): Promise<SyncScoreData> => {
  const { data, error } = await supabase.rpc("get_athlete_scores", {
    p_athlete_id: athleteId,
  });

  if (error) throw error;
  return data as SyncScoreData;
};