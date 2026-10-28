import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import {createAccessGuard} from './accessGuard.ts';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
export function withPaidAccess(handler:(req:Request)=>Response|Promise<Response>,options:{maxBodyBytes?:number;bucket?:'ai'|'content'}={}){
 return createAccessGuard(handler,{...options,authorize:async authorization=>{
  if(authorization===`Bearer ${serviceKey}`)return {allowed:true};
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user||user.is_anonymous)return null;
  const access=await db.rpc('fn_fitpro_backend_access',{p_user_id:user.id});
  if(access.error||typeof access.data?.allowed!=='boolean')throw new Error('access_lookup_failed');
  return {allowed:access.data.allowed,consumeBudget:async()=>{
   const result=await db.rpc('fn_fitpro_claim_api_request',{p_user_id:user.id,p_bucket:options.bucket||'ai'});
   if(result.error||typeof result.data?.allowed!=='boolean')throw new Error('budget_unavailable');return result.data;
  },validateTargets:async targets=>{
   const result=await db.rpc('fn_fitpro_validate_paid_targets',{p_user_id:user.id,p_targets:targets});
   if(result.error)throw new Error('target_lookup_failed');return result.data===true;
  }};
 }});
}
