import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export interface AthleteActivation {
  id: string;
  athlete_id: string;
  days_active: number;
  consistency_score: number;
  missions_completed: number;
  weekly_missions_completed: number;
  monthly_missions_completed: number;
  last_active_at: string | null;
  last_streak_broken_at: string | null;
  activation_events: any[];
  milestone_reached: string | null;
  activated_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para ler dados de ativação do atleta em tempo real (Realtime enabled)
 * Usa para: Tela 8 (Missões), Gamificação, Streaks
 */
export const useAthleteActivation = (athleteId: string | undefined) => {
  const [activation, setActivation] = useState<AthleteActivation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!athleteId) {
      setLoading(false);
      return;
    }

    // 1) Fetch inicial
    const fetchActivation = async () => {
      try {
        const { data, error: err } = await supabase
          .from("athlete_activation")
          .select("*")
          .eq("athlete_id", athleteId)
          .maybeSingle();

        if (err) throw err;

        // Se não existe, criar
        if (!data) {
          const { data: created, error: createErr } = await supabase
            .from("athlete_activation")
            .insert({ athlete_id: athleteId, activated_at: new Date().toISOString() })
            .select()
            .single();

          if (createErr) throw createErr;
          setActivation(created as unknown as AthleteActivation);
        } else {
          setActivation(data as unknown as AthleteActivation);
        }
        setError(null);
      } catch (err) {
        console.error("[useAthleteActivation] fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch activation");
      } finally {
        setLoading(false);
      }
    };

    fetchActivation();

    // 2) Realtime subscription
    const channel = supabase
      .channel(`activation:${athleteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "athlete_activation",
          filter: `athlete_id=eq.${athleteId}`,
        },
        (payload) => {
          if (payload.new) {
            setActivation(payload.new as unknown as AthleteActivation);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [athleteId]);

  return { activation, loading, error };
};

/**
 * Completar uma missão (incrementa counters + streak)
 */
export const completeMission = async (
  athleteId: string,
  missionType: string = "default"
): Promise<{ missions_completed: number; weekly_count: number; consistency_score: number }> => {
  const { data, error } = await supabase.rpc("fn_complete_mission" as any, {
    p_athlete_id: athleteId,
    p_mission_type: missionType,
  });

  if (error) throw error;
  return data[0];
};

/**
 * Incrementar streak (chamado ao treinar/fazer check-in)
 */
export const incrementStreak = async (athleteId: string): Promise<{ new_days_active: number; last_active: string }> => {
  const { data, error } = await supabase.rpc("fn_increment_streak" as any, {
    p_athlete_id: athleteId,
  });

  if (error) throw error;
  return data[0];
};

/**
 * Obter dados brutos de ativação (one-shot, sem realtime)
 */
export const getAthleteActivation = async (athleteId: string): Promise<AthleteActivation | null> => {
  const { data, error } = await supabase
    .from("athlete_activation")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as unknown as AthleteActivation | null;
};