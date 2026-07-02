import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CreditState = {
  total: number;
  used: number;
  remaining: number;
  plan_type: string;
};

const empty: CreditState = { total: 0, used: 0, remaining: 0, plan_type: "base_2990" };

export function useCredits(athleteId?: string | null) {
  const [state, setState] = useState<CreditState>(empty);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!athleteId) { setLoading(false); return; }
    const { data } = await supabase
      .from("athlete_credits" as any)
      .select("credits_total, credits_used, credits_remaining, plan_type")
      .eq("athlete_id", athleteId)
      .maybeSingle();
    const row: any = data;
    if (row) setState({
      total: row.credits_total ?? 0,
      used: row.credits_used ?? 0,
      remaining: row.credits_remaining ?? 0,
      plan_type: row.plan_type ?? "base_2990",
    });
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!athleteId) return;
    const ch = supabase
      .channel(`credits-${athleteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "athlete_credits", filter: `athlete_id=eq.${athleteId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [athleteId, refresh]);

  /**
   * Envolve uma ação de IA — debita 1 ficha antes de executar.
   * Se saldo insuficiente → mostra toast e retorna null (bloqueia).
   */
  const withCredit = useCallback(async <T,>(reason: string, fn: () => Promise<T>, cost = 1): Promise<T | null> => {
    if (!athleteId) return await fn();
    const { data, error } = await supabase.rpc("fn_consume_credit" as any, {
      p_athlete_id: athleteId, p_amount: cost, p_reason: reason,
    });
    const res: any = data;
    if (error || !res?.ok) {
      toast.error("Fichas insuficientes. Recarregue para continuar.");
      return null;
    }
    try { return await fn(); }
    catch (e) {
      // reembolsa em caso de erro real
      await supabase.rpc("fn_add_credits" as any, { p_athlete_id: athleteId, p_amount: cost, p_reason: `refund:${reason}` });
      throw e;
    }
  }, [athleteId]);

  return { ...state, loading, refresh, withCredit };
}
