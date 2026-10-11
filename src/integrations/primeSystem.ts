import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
export interface PrimeSnapshot {
  entitlement: "active" | "trial" | "expired" | "unknown";
  syncScore: number | null;
  activeProtocol: string | null;
  nextWorkout: string | null;
  recovery: number | null;
}
export async function loadPrimeSnapshot(userId: string, athleteId: string | null): Promise<PrimeSnapshot> {
  const [sub, athlete, perf, recovery, next] = await Promise.all([
    supabase.from("user_subscriptions" as any).select("status,plan_id,expires_at").eq("user_id",userId).order("activated_at",{ascending:false}).limit(1).maybeSingle(),
    athleteId ? supabase.from("athletes").select("sync_score").eq("id",athleteId).maybeSingle() : Promise.resolve({data:null,error:null}),
    athleteId ? supabase.from("vw_fitpro_performance_overview" as any).select("plan_title").eq("athlete_id",athleteId).maybeSingle() : Promise.resolve({data:null,error:null}),
    supabase.from("bio_recovery_state").select("recovery_score,evaluated_at").eq("user_id",userId).order("evaluated_at",{ascending:false}).limit(1).maybeSingle(),
    athleteId ? supabase.from("daily_workouts").select("day_name,workout_date").eq("athlete_id",athleteId).gte("workout_date",format(new Date(),'yyyy-MM-dd')).order("workout_date").limit(1).maybeSingle() : Promise.resolve({data:null,error:null}),
  ]);
  for(const result of [sub,athlete,perf,recovery,next]) if(result.error) throw result.error;
  const subscription=sub.data as any;
  const expired=subscription?.expires_at && new Date(subscription.expires_at).getTime()<=Date.now();
  return {
    entitlement: expired ? 'expired' : subscription?.status==='active' ? 'active' : subscription?.status==='trialing' ? 'trial' : subscription?.status ? 'expired' : 'unknown',
    syncScore: athlete.data?.sync_score ?? null,
    activeProtocol:(perf.data as any)?.plan_title || null,
    nextWorkout:next.data ? `${next.data.day_name} · ${next.data.workout_date}` : null,
    recovery:recovery.data?.evaluated_at && new Date(recovery.data.evaluated_at).getTime()>Date.now()-36*3600000 ? recovery.data.recovery_score : null,
  };
}
