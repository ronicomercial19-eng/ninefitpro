import { createClient } from "npm:@supabase/supabase-js@2.117.2";
const FITPRO_URL = "https://mfrydtrzjxscbkaiwfnw.supabase.co";
const FITPRO_KEY = "sb_publishable_KonOXOIhqkVUAjSXaVr8Xg_QkWplk2R";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info", "Access-Control-Allow-Methods":"POST,OPTIONS" };
const json = (status:number, data:unknown) => new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req => {
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json(405,{error:"method_not_allowed"});
  const authorization=req.headers.get("Authorization");
  if(!authorization?.startsWith("Bearer ")) return json(401,{error:"authentication_required"});
  const userClient=createClient(FITPRO_URL,FITPRO_KEY,{global:{headers:{Authorization:authorization}}});
  const {data:claims,error:authError}=await userClient.auth.getClaims(authorization.slice(7));
  if(authError || !claims?.claims?.sub || claims.claims.is_anonymous===true) return json(401,{error:"invalid_fitpro_session"});
  const {data:athleteId,error:athleteError}=await userClient.rpc("fn_current_athlete_id");
  if(athleteError || !athleteId) return json(403,{error:"athlete_required"});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body=await req.json();
    if(body.action==="professionals" || body.action==="match"){
      const {data,error}=await admin.from("freelancers_cadastro").select("id,nome_completo,principal_funcao_tempo,funcoes_experiencia,localizacao_bairro_cidade,disponibilidade,foto_url,ativo").eq("ativo",true).limit(200);
      if(error) throw error;
      const term=typeof body.method==="string"?body.method.toLowerCase():"";
      const terms:Record<string,string[]>={
        strength:["personal","muscula","strength"],mobility:["mobil","pilates","yoga"],
        recovery:["fisio","massag","recuper"],running:["corrida","running"],rehab:["fisio","reabil"]
      };
      const items=(data||[]).filter(p=>!term || (terms[term]||[term]).some(t=>(p.principal_funcao_tempo+" "+(p.funcoes_experiencia||[]).join(" ")).toLowerCase().includes(t)))
        .map(p=>({id:p.id,name:p.nome_completo,role:p.principal_funcao_tempo,skills:p.funcoes_experiencia,location:p.localizacao_bairro_cidade,availability:p.disponibilidade,photo_url:p.foto_url}));
      return json(200,{ok:true,professionals:items,matches:items,source:"staff_team"});
    }
    if(body.action!=="booking" && body.action!=="status") return json(400,{error:"unsupported_action"});
    if(typeof body.appointment_id!=="string") return json(400,{error:"appointment_id_required"});
    const {data:appointment,error:appointmentError}=await userClient.from("appointments")
      .select("id,student_id,staff_professional_id,staff_method_id,scheduled_at,status,title")
      .eq("id",body.appointment_id).eq("student_id",athleteId).single();
    if(appointmentError || !appointment?.staff_professional_id) return json(403,{error:"appointment_access_denied"});
    const ref="fitpro:"+appointment.id;
    const {data:existing,error:lookupError}=await admin.from("staff_bookings").select("id,status,status_reason").eq("source","fitpro").eq("external_ref",ref).maybeSingle();
    if(lookupError) throw lookupError;
    if(existing) return json(200,{ok:true,booking:{id:existing.id,status:existing.status,reason:existing.status_reason}});
    if(body.action==="status") return json(200,{ok:true,booking:null});
    if(!["scheduled","confirmed"].includes(appointment.status) || Date.parse(appointment.scheduled_at)<=Date.now()) return json(409,{error:"appointment_not_bookable"});
    const {data:professional,error:proError}=await admin.from("freelancers_cadastro").select("id").eq("id",appointment.staff_professional_id).eq("ativo",true).maybeSingle();
    if(proError || !professional) return json(409,{error:"professional_unavailable"});
    const {data:athlete}=await userClient.from("athletes").select("name").eq("id",athleteId).single();
    const {data:booking,error}=await admin.from("staff_bookings").insert({
      freelancer_id:professional.id,method:appointment.staff_method_id||"strength",slot:appointment.scheduled_at,
      client_id:athleteId,client_name:athlete?.name||"Aluno FitPro",source:"fitpro",external_ref:ref,status:"pendente"
    }).select("id,status").single();
    if(error?.code==="23505"){
      const {data:retry}=await admin.from("staff_bookings").select("id,status").eq("source","fitpro").eq("external_ref",ref).single();
      if(retry) return json(200,{ok:true,booking:retry});
    }
    if(error) throw error;
    return json(200,{ok:true,booking});
  } catch { return json(502,{error:"staff_request_failed"}); }
});
