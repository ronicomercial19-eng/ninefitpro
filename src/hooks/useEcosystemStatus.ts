import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";

export interface EcosystemStatus {
  smarttreino: boolean;
  planejamento: boolean;
  progresso: boolean;
  healthflix: boolean;
  mensagens: boolean;
  biblioteca: boolean;
}

export function useEcosystemStatus(): { status: EcosystemStatus; loading: boolean } {
  const { athleteId } = useAthleteId();
  const [status, setStatus] = useState<EcosystemStatus>({
    smarttreino: false, planejamento: false, progresso: false,
    healthflix: false, mensagens: false, biblioteca: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;
    let cancelled = false;
    (async () => {
      const safeCount = async (table: string, col: string) => {
        try {
          const { count } = await supabase
            .from(table as any).select("*", { count: "exact", head: true }).eq(col, athleteId);
          return (count ?? 0) > 0;
        } catch { return false; }
      };
      const [smart, plan, prog, hf, lib] = await Promise.all([
        safeCount("student_training_assignments", "athlete_id"),
        safeCount("periodization_plans_remote", "athlete_id"),
        safeCount("workout_logs", "athlete_id"),
        safeCount("healthflix_progress", "athlete_id"),
        safeCount("content_progress", "athlete_id"),
      ]);
      if (!cancelled) {
        setStatus({
          smarttreino: smart, planejamento: plan, progresso: prog,
          healthflix: hf, mensagens: false, biblioteca: lib,
        });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [athleteId]);

  return { status, loading };
}
