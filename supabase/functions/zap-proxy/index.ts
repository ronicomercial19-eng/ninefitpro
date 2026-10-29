import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const CORE_ORIGIN="https://hmppvtdlzsnxyiaozssu.supabase.co";
const CHAT_BASE=CORE_ORIGIN+"/functions/v1/zap-api/api/public/zap";
const tenant=Deno.env.get("NINEZAP_TENANT")||"fitpro";
class ChatError extends Error { constructor(public status:number,public code:string){super(code);} }
async function core(path:string,method:"GET"|"POST",body?:unknown) {
 const secret=Deno.env.get("NINEZAP_SHARED_SECRET");
 if(!secret)throw new ChatError(503,"chat_not_configured");
 const material=method==="GET"?(path.includes("?")?path.slice(path.indexOf("?")):""):JSON.stringify(body??{});
 const ts=String(Math.floor(Date.now()/1000));
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const mac=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(ts+"."+material));
 const signature=Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,"0")).join("");
 const r=await fetch(CHAT_BASE+path,{method,headers:{"Content-Type":"application/json","X-Zap-Tenant":tenant,"X-Zap-Timestamp":ts,"X-Zap-Signature":signature},body:method==="POST"?material:undefined,signal:AbortSignal.timeout(15_000),redirect:"error"});
 if(!r.ok){await r.body?.cancel();throw new ChatError(r.status===401||r.status===503?503:502,"core_unavailable");}
 try{return await r.json();}catch{throw new ChatError(502,"invalid_core_response");}
}
function phoneBR(value:unknown) {
 let p=String(value??"").replace(/\D/g,"");
 if(p.length===10||p.length===11)p="55"+p;
 return /^55[1-9]\d{9,10}$/.test(p)?"+"+p:null;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(!["GET","POST"].includes(req.method))return json(405,{error:"method_not_allowed"});
 const authorization=req.headers.get("Authorization");
 if(!authorization?.startsWith("Bearer "))return json(401,{error:"unauthorized"});
 const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError||!user||user.is_anonymous)return json(401,{error:"unauthorized"});
 const action=new URL(req.url).searchParams.get("action")||"thread.ensure";
 try {
  const {data:athleteId,error:idError}=await sb.rpc("fn_current_athlete_id");
  if(idError)throw new ChatError(503,"identity_unavailable");
  if(!athleteId)throw new ChatError(409,"student_profile_required");
  const {data:athlete,error:athleteError}=await sb.from("athletes").select("id,name,phone").eq("id",athleteId).single();
  if(athleteError||!athlete)throw new ChatError(503,"identity_unavailable");
  const phone=phoneBR(athlete.phone);
  if(!phone)throw new ChatError(422,"profile_phone_required");
  const {data:saved,error:readError}=await admin.from("core_chat_threads").select("thread_id,phone,athlete_id").eq("user_id",user.id).maybeSingle();
  if(readError)throw new ChatError(503,"chat_storage_unavailable");
  let threadId=saved?.thread_id;
  if(action==="thread.ensure"||!threadId||saved?.phone!==phone||saved?.athlete_id!==athlete.id){
   const result=await core("/threads","POST",{external_key:"fitpro:"+user.id,subject:"Atendimento FitPro",context:{user_id:user.id,athlete_id:athlete.id,name:athlete.name||"Aluno",phone}});
   threadId=result.thread_id??result.thread?.id??result.id;
   if(typeof threadId!=="string"||!threadId||threadId.length>200)throw new ChatError(502,"invalid_core_thread");
   const {error}=await admin.from("core_chat_threads").upsert({user_id:user.id,athlete_id:athlete.id,thread_id:threadId,phone,updated_at:new Date().toISOString()},{onConflict:"user_id"});
   if(error)throw new ChatError(503,"chat_storage_unavailable");
  }
  if(action==="thread.ensure"&&req.method==="POST")return json(200,{thread_id:threadId});
  const thread=encodeURIComponent(threadId);
  if(action==="messages.list"&&req.method==="GET"){
   const result=await core("/threads/"+thread+"/messages?limit=100","GET");
   return json(200,{messages:Array.isArray(result)?result:result.messages??result.data??[]});
  }
  if(action==="messages.send"&&req.method==="POST"){
   const raw=await req.text();
   if(new TextEncoder().encode(raw).length>16_384)throw new ChatError(413,"message_too_large");
   let input:any;try{input=JSON.parse(raw);}catch{throw new ChatError(400,"invalid_body");}
   if(typeof input.body!=="string"||!input.body.trim()||input.body.length>4000||typeof input.external_id!=="string"||!input.external_id||input.external_id.length>200)throw new ChatError(400,"invalid_message");
   return json(200,await core("/threads/"+thread+"/messages","POST",{body:input.body,external_id:input.external_id,sender_type:"user"}));
  }
  return json(400,{error:"unknown_action"});
 }catch(error){
  const status=error instanceof ChatError?error.status:502;
  const code=error instanceof ChatError?error.code:"core_unavailable";
  // Persist only operational metadata. Never log message bodies, phone or HMAC.
  await admin.from("integration_events_log").insert({source:"core-os",event_type:"chat.error",entity_type:"user",entity_id:user.id,payload:{action,status,code},delivered:false});
  return json(status,{error:code});
 }
});
