import { supabase } from "@/integrations/supabase/client";

export interface PrimeSnapshot {
  entitlement: "active" | "trial" | "expired" | "unknown";
  syncScore: number | null;
  activeProtocol: string | null;
  nextWorkout: string | null;
  recovery: number | null;
}

export async function loadPrimeSnapshot(userId: string, athleteId: string | null): Promise<PrimeSnapshot> {
  const [sub, hub, perf] = await Promise.all([
    supabase.from("user_subscriptions" as any).select("status,plan_id").eq("user_id", userId).order("activated_at", { ascending: false }).limit(1).maybeSingle(),
    athleteId ? supabase.from("vw_hub_status" as any).select("sync_score").eq("athlete_id", athleteId).maybeSingle() : Promise.resolve({ data: null }),
    // vw_fitpro_performance_overview (Fase 4) só expõe plan_title hoje.
    // next_workout_title e recovery_score não existem nessa view — pedir
    // essas colunas fazia o select inteiro falhar (PostgREST retorna erro
    // pra coluna inexistente) e derrubava junto o plan_title real, que
    // existe. Selecionar só o que é real; os outros dois campos ficam
    // null explícito até existir uma fonte de dado de verdade pra eles —
    // nunca inventar valor.
    athleteId ? supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id", athleteId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const status = (sub.data as any)?.status;
  return {
    entitlement: status === "active" ? "active" : status === "trialing" ? "trial" : status ? "expired" : "unknown",
    syncScore: (hub.data as any)?.sync_score == null ? null : Number((hub.data as any).sync_score),
    activeProtocol: (perf.data as any)?.plan_title || null,
    nextWorkout: null,
    recovery: null,
  };
}
