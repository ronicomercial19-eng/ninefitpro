import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
export interface ReadinessDecision {
 duration_seconds_base?:number|null;duration_seconds_applied?:number|null;
 id:string;decision_date:string;mode:'low'|'balanced'|'power';status:string;
 volume_pct_total:number;volume_pct_applied:number;base_sets:number;applied_sets:number;
 rest_delta_s:number;warmup_add_min:number;gate_level:number;flags:string[];
 inputs:Record<string,number|string|null>;reasons:Array<{signal:string;answer:number;volume_pct:number;message?:string}>;
 applied_workout_id:string|null;rule_set_version:string;
}
export interface ReadinessState {
 preferences:{enabled:boolean;pdi_confirmed_at:string|null}|null;
 decision:ReadinessDecision|null;
 rollout:{version:string;apply_after:string;observing:boolean}|null;
}
export async function readinessRpc(name:string,args:Record<string,unknown>={}) {
 const {data,error}=await withTimeout<{data:any;error:any}>((supabase as any).rpc(name,args));
 if(error)throw error;return data;
}
export async function refreshReadiness(athleteId:string) {
 const value=await readinessRpc('fn_refresh_daily_readiness',{p_athlete_id:athleteId});
 window.dispatchEvent(new Event('9fit:readiness-updated'));return value;
}
