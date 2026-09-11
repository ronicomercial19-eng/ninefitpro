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
    athleteId ? supabase.from("vw_fitpro_performance_overview" as any).select("plan_title,next_workout_title,recovery_score").eq("athlete_id", athleteId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const status = (sub.data as any)?.status;
  return {
    entitlement: status === "active" ? "active" : status === "trialing" ? "trial" : status ? "expired" : "unknown",
    syncScore: (hub.data as any)?.sync_score == null ? null : Number((hub.data as any).sync_score),
    activeProtocol: (perf.data as any)?.plan_title || null,
    nextWorkout: (perf.data as any)?.next_workout_title || null,
    recovery: (perf.data as any)?.recovery_score == null ? null : Number((perf.data as any).recovery_score),
  };
}
