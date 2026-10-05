import { useEffect, useState, useCallback, useRef } from "react";
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
  const requestRef = useRef(0);
  const [exists, setExists] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const request = ++requestRef.current;
    if (!user?.id) {
      setParams(null); setExists(false); setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setParams(null); setExists(false); setError(null);
    const { data, error: readError } = await supabase
      .from("user_parameters" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (request !== requestRef.current) return;
    if (readError) { setError('Não foi possível ler sua ficha. Tente novamente.'); setLoading(false); return; }
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
      const merged = { ...(params || DEFAULTS), ...patch };
      const { error } = await supabase.rpc("fn_save_pdi" as any, { p_patch: patch });
      if (!error) {
        setExists(true);
        setParams(merged as UserParameters);
        window.dispatchEvent(new Event('9fit:profile-updated'));
      }
      return { error };
    },
    [params, user?.id]
  );

  return { params: params || DEFAULTS, loading, error, exists, save, reload };
}
