import { supabase } from "@/integrations/supabase/client";
import { getAthleteScores } from "@/hooks/useAthleteScores";
import { confirmedAccess } from "@/lib/customerEntry";
import { businessDate } from '@/services/dailyContextRules';
export interface PrimeSnapshot {
  subscription: { status: string; plan_id: string | null; expires_at: string | null } | null;
  entitlement: "active" | "trial" | "expired" | "unknown";
  syncScore: number | null;
  activeProtocol: string | null;
  nextWorkout: string | null;
  recovery: number | null;
}
export async function loadPrimeSnapshot(userId: string, athleteId: string | null): Promise<PrimeSnapshot> {
  const [sub, sync, perf, recovery, next] = await Promise.all([
    supabase.from("user_subscriptions" as any).select("status,plan_id,expires_at").eq("user_id",userId).order("activated_at",{ascending:false}),
    getAthleteScores().then(data => ({ data, error: null })),
    athleteId ? supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id",athleteId).maybeSingle() : Promise.resolve({data:null,error:null}),
    supabase.from("bio_recovery_state").select("recovery_score,evaluated_at").eq("user_id",userId).order("evaluated_at",{ascending:false}).limit(1).maybeSingle(),
    athleteId ? supabase.from("daily_workouts").select("day_name,workout_date").eq("athlete_id",athleteId).gte("workout_date",businessDate()).order("workout_date").limit(1).maybeSingle() : Promise.resolve({data:null,error:null}),
  ]);
  for(const result of [sub,sync,perf,recovery,next]) if(result.error) throw result.error;
  const subscriptions=(sub.data || []) as any[];
  const subscription=subscriptions.find(row=>confirmedAccess(row)) || subscriptions[0] || null;
  const snapshot=sync.data as {athlete?:{id?:string};sync?:{value?:number|null;status?:string}}|null;
  const hasOwnSnapshot=!!athleteId && snapshot?.athlete?.id===athleteId;
  const currentSync=hasOwnSnapshot && snapshot?.sync?.status === "available" ? snapshot?.sync?.value ?? null : null;
  const valid=confirmedAccess(subscription);
  return {
    subscription: subscription ? { status: subscription.status, plan_id: subscription.plan_id, expires_at: subscription.expires_at } : null,
    entitlement: valid ? subscription.status==='trialing' ? 'trial' : 'active' : subscription ? 'expired' : 'unknown',
    syncScore: currentSync,
    activeProtocol:(perf.data as any)?.plan_title || null,
    nextWorkout:next.data ? `${next.data.day_name} · ${next.data.workout_date}` : null,
    recovery:recovery.data?.evaluated_at && new Date(recovery.data.evaluated_at).getTime()>Date.now()-36*3600000 ? recovery.data.recovery_score : null,
  };
}
