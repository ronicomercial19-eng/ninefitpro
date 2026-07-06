import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "./useAthleteId";

export interface OnboardingProgress {
  perfil_completo: boolean;
  tem_foto: boolean;
  primeiro_treino: boolean;
  tres_dias: boolean;
  sete_dias: boolean;
  tem_plano: boolean;
  prime_ativo: boolean;
}

const EMPTY: OnboardingProgress = {
  perfil_completo: false, tem_foto: false, primeiro_treino: false,
  tres_dias: false, sete_dias: false, tem_plano: false, prime_ativo: false,
};

/**
 * Bloco G — Checklist de ativação + auto-trigger Prime Reward aos 7 dias.
 */
export function useOnboardingCheck() {
  const { athleteId } = useAthleteId();
  const [progress, setProgress] = useState<OnboardingProgress>(EMPTY);
  const [loading, setLoading] = useState(true);
  const claimingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!athleteId) return;
    const { data, error } = await supabase.rpc("fn_check_onboarding_progress" as any, { p_athlete_id: athleteId });
    if (!error && data) setProgress({ ...EMPTY, ...(data as any) });
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Auto-ativa Prime quando atingir 7 dias, uma única vez.
  useEffect(() => {
    if (!athleteId || claimingRef.current) return;
    if (progress.sete_dias && !progress.prime_ativo) {
      const key = `9fit_prime_claimed_${athleteId}`;
      if (localStorage.getItem(key) === "1") return;
      claimingRef.current = true;
      (async () => {
        try {
          const { error } = await supabase.rpc("fn_activate_prime_reward" as any, { p_athlete_id: athleteId });
          if (!error) {
            localStorage.setItem(key, "1");
            await refresh();
          }
        } finally { claimingRef.current = false; }
      })();
    }
  }, [athleteId, progress.sete_dias, progress.prime_ativo, refresh]);

  return { progress, loading, refresh };
}
