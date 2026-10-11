import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserParameters = {
  recovery_rate: "fast" | "medium" | "slow";
  volume_tolerance: number;
  peak_window: "morning" | "afternoon" | "night";
  injury_zones: string[];
  consistency_30d: number;
  stress_sensitivity: number;
  goal: "performance" | "aesthetics" | "longevity" | "recomposition";
  time_horizon: number;
  discomfort_tolerance: "aggressive" | "moderate" | "conservative";
  base_location_sp: string | null;
  dietary_restrictions: string[];
};

const DEFAULTS: UserParameters = {
  recovery_rate: "medium",
  volume_tolerance: 5,
  peak_window: "morning",
  injury_zones: [],
  consistency_30d: 0,
  stress_sensitivity: 5,
  goal: "performance",
  time_horizon: 12,
  discomfort_tolerance: "moderate",
  base_location_sp: null,
  dietary_restrictions: [],
};

/**
 * Hook PDI — Perfil Dinâmico Individual.
 * Lê/escreve user_parameters. Os thresholds são RELATIVOS ao histórico
 * do próprio usuário (ver fn_compute_user_thresholds no banco).
 */
export function useUserParameters() {
  const { user } = useAuth();
  const [params, setParams] = useState<UserParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_parameters" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setExists(true);
      setParams({ ...DEFAULTS, ...(data as any) });
    } else {
      setExists(false);
      setParams(DEFAULTS);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { reload(); }, [reload]);

  const save = useCallback(
    async (patch: Partial<UserParameters>) => {
      if (!user?.id) return { error: "no_user" };
      const merged = { ...(params || DEFAULTS), ...patch, user_id: user.id };
      const { error } = await supabase
        .from("user_parameters" as any)
        .upsert(merged, { onConflict: "user_id" });
      if (!error) {
        setExists(true);
        setParams(merged as UserParameters);
      }
      return { error };
    },
    [params, user?.id]
  );

  return { params: params || DEFAULTS, loading, exists, save, reload };
}
