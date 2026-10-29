import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
import type { ReadinessState } from '@/services/readiness';
export function useReadiness(athleteId:string|null) {
 const {user}=useAuth();const client=useQueryClient();const key=['daily-readiness',user?.id,athleteId];
 const query=useQuery({queryKey:key,enabled:!!user&&!!athleteId,staleTime:30_000,retry:false,queryFn:async({signal})=>{
  const {data,error}=await withTimeout<{data:any;error:any}>((supabase as any).rpc('fn_get_daily_readiness',{p_athlete_id:athleteId}).abortSignal(signal));
  if(error)throw error;return data as ReadinessState;
 }});
 useEffect(()=>{
  if(!user||!athleteId)return;
  const refresh=()=>void client.invalidateQueries({queryKey:['daily-readiness',user.id,athleteId]}, {cancelRefetch:false});
  const events=['9fit:sync_updated','9fit:profile-updated','9fit:workout-updated','9fit:readiness-updated'];
  events.forEach(e=>window.addEventListener(e,refresh));return()=>events.forEach(e=>window.removeEventListener(e,refresh));
 },[client,user?.id,athleteId]);
 return query;
}
