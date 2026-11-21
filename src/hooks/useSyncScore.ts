import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { businessDate, type DailyContext } from '@/services/dailyContextRules';
import { parseDailyContext } from '@/lib/dailyContextContract';
import { syncReading, SYNC_UPDATE_EVENTS } from '@/services/syncReading';
import { withTimeout } from '@/lib/withTimeout';
import type { HubScoreStatus } from './useAthleteScores';

/** One cached, atomic display reading for Inicio, Train and Hub. Training readiness remains independent. */
export function useSyncScore(athleteId:string|null|undefined) {
  const {user}=useAuth();const client=useQueryClient();
  const [date,setDate]=useState(businessDate);
  const [online,setOnline]=useState(()=>navigator.onLine);
  const key=['sync-display',user?.id,athleteId,date];
  const query=useQuery({queryKey:key,enabled:!!user?.id&&!!athleteId,staleTime:30_000,retry:1,refetchOnWindowFocus:'always',queryFn:async({signal})=>{
    const [context,quick]=await withTimeout(Promise.all([
      supabase.rpc('fn_get_daily_context' as never).abortSignal(signal),
      supabase.from('master_registry').select('payload').eq('user_id',user!.id).eq('source','fitpro_hub_quick').eq('payload->>athlete_id',athleteId!).eq('payload->>date',date).abortSignal(signal),
    ]));
    if(context.error||quick.error)throw context.error||quick.error;
    signal.throwIfAborted();
    const current=parseDailyContext(context.data);
    const records=(quick.data||[]).flatMap(row=>{const payload=row.payload as {category?:string}|null;return payload?.category?[payload.category]:[]});
    return {context:current,routine:syncReading(current,date,records)};
  }});
  useEffect(()=>{
    const refresh=()=>{setDate(businessDate());void client.invalidateQueries({queryKey:['sync-display',user?.id,athleteId]});};
    const connection=()=>{setOnline(navigator.onLine);if(navigator.onLine)refresh();};
    const visible=()=>{if(!document.hidden)refresh();};
    SYNC_UPDATE_EVENTS.forEach(event=>window.addEventListener(event,refresh));
    window.addEventListener('online',connection);window.addEventListener('offline',connection);document.addEventListener('visibilitychange',visible);
    const now=Date.now();let lower=now,upper=now+86_400_000;
    while(upper-lower>1000){const middle=Math.floor((lower+upper)/2);if(businessDate(new Date(middle))===date)lower=middle;else upper=middle;}
    const timer=window.setTimeout(refresh,Math.max(1000,upper-now+1000));
    const channel=user?.id&&athleteId?supabase.channel(`sync-display:${user.id}:${athleteId}:${Math.random()}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'master_registry',filter:`user_id=eq.${user.id}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'daily_checkins',filter:`athlete_id=eq.${athleteId}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'hydration_logs',filter:`athlete_id=eq.${athleteId}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'nutrition_logs',filter:`athlete_id=eq.${athleteId}`},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'workout_executions',filter:`athlete_id=eq.${athleteId}`},refresh).subscribe():null;
    return()=>{window.clearTimeout(timer);SYNC_UPDATE_EVENTS.forEach(event=>window.removeEventListener(event,refresh));window.removeEventListener('online',connection);window.removeEventListener('offline',connection);document.removeEventListener('visibilitychange',visible);if(channel)void supabase.removeChannel(channel);};
  },[client,user?.id,athleteId,date]);
  const routine=query.data?.routine??syncReading(null,date,[]);
  const status:HubScoreStatus=!online?'offline':query.isPending?'loading':query.isError?(query.data?'stale':'error'):routine.value===null?'calibrating':'available';
  return {routine,value:routine.value,status,context:query.data?.context as DailyContext|undefined,refresh:()=>client.invalidateQueries({queryKey:['sync-display',user?.id,athleteId]})};
}
