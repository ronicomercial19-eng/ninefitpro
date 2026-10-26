import { createClient } from "npm:@supabase/supabase-js@2.117.2";
const STAFF_GATEWAY="https://xtexysqtfsofdohujtfr.supabase.co/functions/v1/fitpro-staff-gateway";
const STAFF_PUBLIC="https://xtexysqtfsofdohujtfr.supabase.co/functions/v1/staff-api";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const url=new URL(req.url);
 const body=req.method==="POST"?await req.json().catch(()=>({})):Object.fromEntries(url.searchParams);
 const action=body.action || url.pathname.split("/").filter(Boolean).at(-1);
 if(req.method==="GET" && ["methods","hubs"].includes(action)){
  const response=await fetch(STAFF_PUBLIC+"/"+action,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)return json(502,{error:"staff_unavailable"});
  return json(200,await response.json());
 }
 const authorization=req.headers.get("Authorization");
 if(!authorization?.startsWith("Bearer "))return json(401,{error:"authentication_required"});
 const userClient=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}}});
 const {data:claims,error:authError}=await userClient.auth.getClaims(authorization.slice(7));
 if(authError||!claims?.claims?.sub||claims.claims.is_anonymous===true)return json(401,{error:"invalid_session"});
 if(!["professionals","match","booking","status"].includes(action))return json(400,{error:"unsupported_action"});
 try{
  const response=await fetch(STAFF_GATEWAY,{method:"POST",headers:{"Content-Type":"application/json",Authorization:authorization},
    body:JSON.stringify({...body,action}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(!response.ok || !result.ok)return json(response.status>=400?response.status:502,{error:result.error||"staff_request_failed"});
  if(["booking","status"].includes(action)&&result.booking){
   const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
   const {error}=await admin.rpc("fn_record_staff_sync",{p_appointment_id:body.appointment_id,p_booking_id:result.booking.id,p_status:result.booking.status});
   if(error)return json(502,{error:"staff_receipt_pending",retryable:true});
  }
  return json(200,result);
 }catch{return json(502,{error:"staff_temporarily_unavailable",retryable:true});}
});
