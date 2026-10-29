import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.50.2';
import {withPaidAccess} from '../_shared/paidAccess.ts';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
function mediaUrl(value:unknown){if(typeof value!=='string'||value.length>2048)return null;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
Deno.serve(withPaidAccess(async req=>{
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 let id:string;
 try{id=(await req.json()).exercise_id;}catch{return reply({error:'invalid_body'},400);}
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return reply({error:'invalid_exercise'},400);
 const {data:exercise,error}=await db.from('exercises').select('id,name,video_url,gif_url,external_video_id').eq('id',id).maybeSingle();
 if(error)return reply({error:'catalog_unavailable'},503);
 if(!exercise)return reply({error:'exercise_not_found'},404);
 if(exercise.video_url||exercise.gif_url||!exercise.external_video_id)return reply({exercise});
 const endpoint=Deno.env.get('EXERCISE_VIDEO_API_URL');const key=Deno.env.get('EXERCISE_VIDEO_API_KEY');
 if(!endpoint||!key)return reply({exercise});
 try{
  const base=new URL(endpoint);if(base.protocol!=='https:'||base.username||base.password)return reply({exercise});
  const target=endpoint.replace(/\/$/,'')+'/videos/'+encodeURIComponent(exercise.external_video_id);
  const response=await fetch(target,{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)return reply({exercise});
  const body=await response.text();if(body.length>65536)return reply({exercise});
  const external=JSON.parse(body);const video=mediaUrl(external.url);const gif=mediaUrl(external.gif_url);
  if(!video&&!gif)return reply({exercise});
  const saved=await db.from('exercises').update({video_url:video,gif_url:gif,video_cached_at:new Date().toISOString()}).eq('id',id).select('id,name,video_url,gif_url,external_video_id').single();
  return reply({exercise:saved.error?{...exercise,video_url:video,gif_url:gif}:saved.data});
 }catch{return reply({exercise});}
},{bucket:'content',maxBodyBytes:2048}));
