import {estimateWorkoutMinutes} from '../_shared/workoutDose.ts';
import {withPaidAccess} from "../_shared/paidAccess.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
Deno.serve(withPaidAccess(async(req:Request)=>{
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,"Content-Type":"application/json"}});
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({success:false,error:'method_not_allowed'},405);
 try{
  const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return reply({success:false,error:'unauthorized'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json();const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());
  if(body.data && body.data!==today)return reply({success:false,error:'O treino rápido só pode ser preparado para hoje.'},400);
  if(!body.objetivo || !Number.isInteger(body.tempo_min) || !Array.isArray(body.equipamentos) || !body.equipamentos.length || body.equipamentos.some((x:unknown)=>typeof x!=='string'||!['gym','bodyweight','dumbbells','bands'].includes(x)))return reply({success:false,error:'Informe objetivo, tempo_min e equipamentos disponíveis.'},400);
  const identity=await db.rpc('fn_resolve_progress_athlete',{p_identifier:body.athlete_id || body.aluno_id || null});
  if(identity.error)throw identity.error;if(!identity.data)return reply({success:false,error:'Perfil de atleta não encontrado.'},404);
  const generated=await db.rpc('fn_treino_rapido',{p_athlete_id:identity.data,p_objetivo:body.objetivo,p_tempo_min:body.tempo_min,p_equipamento:'resources:'+body.equipamentos.join(',')});
  if(generated.error)throw generated.error;
  if(!generated.data?.daily_workout_id)return reply({success:false,error:'Não foi possível confirmar a sessão.'},409);
  const adjustment=await db.rpc('fn_apply_readiness_to_workout',{p_daily_workout_id:generated.data.daily_workout_id});
  if(adjustment.error)throw adjustment.error;
  const doses=await db.from('workout_exercises').select('exercise_id,sets,reps_range,rest_seconds').eq('daily_workout_id',generated.data.daily_workout_id);
  if(doses.error)throw doses.error;
  const workout={...generated.data,exercises:generated.data.exercises.map((e:{id:string})=>({...e,...(doses.data??[]).find(d=>d.exercise_id===e.id)}))};
  workout.preparation_minutes=3+(adjustment.data?.status==='applied'?Number(adjustment.data.warmup_add_min)||0:0);
  workout.estimated_duration_min=estimateWorkoutMinutes(workout.exercises,workout.preparation_minutes);
  return reply({success:true,daily_workout_id:workout.daily_workout_id,prescrição:workout,readiness:adjustment.data,delivery:{success:true,channel:'shared_database',daily_workout_id:workout.daily_workout_id}});
 }catch(failure){const e=failure as {code?:string;message?:string};return reply({success:false,error:e.message || 'Não foi possível preparar o treino rápido.'},e.code==='42501'?403:400);}
},{bucket:'ai'}));
