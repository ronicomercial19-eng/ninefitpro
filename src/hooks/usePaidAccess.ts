import {useEffect,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {withTimeout} from '@/lib/withTimeout';
import {parsePaidAccess,paidAccessAvailable} from '@/lib/paidAccess';
export function usePaidAccess(){
 const {user}=useAuth();const client=useQueryClient();const [,tick]=useState(0);
 const query=useQuery({queryKey:['paid-access',user?.id],enabled:!!user,staleTime:15000,retry:1,refetchInterval:60000,refetchOnWindowFocus:'always',queryFn:async()=>{
  const {data,error}=await withTimeout(supabase.rpc('fn_fitpro_access_status' as never));if(error)throw error;
  const access=parsePaidAccess(data);return {access,offset:Date.parse(access.server_now)-Date.now()};
 }});
 useEffect(()=>{
  const refresh=()=>void client.invalidateQueries({queryKey:['paid-access',user?.id]});
  window.addEventListener('9fit:access-updated',refresh);window.addEventListener('9fit:profile-updated',refresh);
  return()=>{window.removeEventListener('9fit:access-updated',refresh);window.removeEventListener('9fit:profile-updated',refresh)};
 },[client,user?.id]);
 useEffect(()=>{
  const expires=query.data?.access.expires_at;if(!expires)return;
  const delay=Date.parse(expires)-Date.now()-(query.data?.offset||0);
  if(delay<=0)return;
  const timer=setTimeout(()=>{tick(n=>n+1);void query.refetch()},Math.min(delay+10,2147483647));return()=>clearTimeout(timer);
 },[query.data]);
 return {...query,allowed:!query.isError&&paidAccessAvailable(query.data?.access,Date.now()+(query.data?.offset||0)),access:query.data?.access};
}
