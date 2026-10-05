import { useCallback, useEffect, useRef, useState } from 'react';
import { format,subDays,startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { comparableLoadProgress } from '@/services/athleteCardRules';
export type RonResultCard={id:string;title:string;description:string;action:string;route:string};
export function useRonResultCards(athleteId:string|null){
  const [cards,setCards]=useState<RonResultCard[]>([]),[failed,setFailed]=useState(false);const request=useRef(0);
  const refresh=useCallback(async()=>{
    const version=++request.current;if(!athleteId){setCards([]);return;}
    const today=format(new Date(),'yyyy-MM-dd'),week=format(startOfWeek(new Date(),{weekStartsOn:1}),'yyyy-MM-dd');
    const [sessions,sets,meals,next]=await Promise.all([
      supabase.from('workout_executions').select('workout_date,duration_minutes').eq('athlete_id',athleteId).eq('status','completed').gte('workout_date',week).lte('workout_date',today),
      supabase.from('workout_exercise_sets').select('exercise_name,actual_weight,actual_reps,completed,workout_executions!inner(workout_date,status,athlete_id)').eq('workout_executions.athlete_id',athleteId).eq('workout_executions.status','completed').eq('completed',true).gte('workout_executions.workout_date',format(subDays(new Date(),30),'yyyy-MM-dd')).lte('workout_executions.workout_date',today).order('created_at',{ascending:false}).limit(1000),
      supabase.from('nutrition_logs').select('date').eq('athlete_id',athleteId).gte('date',week).lte('date',today),
      supabase.from('appointments').select('title,scheduled_at').eq('student_id',athleteId).in('status',['scheduled','confirmed']).gte('scheduled_at',new Date().toISOString()).order('scheduled_at').limit(1).maybeSingle(),
    ]);
    if(version!==request.current)return;const error=!!(sessions.error||sets.error||meals.error||next.error);setFailed(error);if(error){setCards([]);return;}
    const results:RonResultCard[]=[{id:'week',title:`${sessions.data?.length??0} treinos concluídos nesta semana`,description:`${(sessions.data??[]).reduce((sum,s)=>sum+(s.duration_minutes??0),0)} minutos com duração registrada. Consulte as sessões para conferir os detalhes.`,action:'Ver histórico',route:'/9fit/train'}];
    const progress=comparableLoadProgress(sets.data??[]);
    if(progress)results.push({id:'progress',title:`Sua carga evoluiu em ${progress.exercise}`,description:`${progress.previous} → ${progress.latest} kg, em séries de ${progress.reps} repetições. Comparação entre ${progress.previousDate.split('-').reverse().join('/')} e ${progress.date.split('-').reverse().join('/')}.`,action:'Ver evolução',route:'/9fit/progresso'});
    results.push({id:'nutrition',title:`Alimentação registrada em ${new Set((meals.data??[]).map(m=>m.date)).size} dias nesta semana`,description:`${meals.data?.length??0} refeições no diário. Acompanhe os registros e as metas da sua dieta.`,action:'Abrir dieta',route:'/9fit/dieta'});
    if(next.data)results.push({id:'appointment',title:next.data.title||'Seu próximo compromisso',description:format(new Date(next.data.scheduled_at),"dd/MM 'às' HH:mm"),action:'Ver reserva',route:'/9fit/aulas-creditos?tab=upcoming'});
    setCards(results);
  },[athleteId]);
  useEffect(()=>{setCards([]);void refresh();const events=['9fit:workout-updated','9fit:nutrition-updated','9fit:appointments-updated'];events.forEach(e=>window.addEventListener(e,refresh));window.addEventListener('focus',refresh);const ch=athleteId?supabase.channel(`ron-results-${athleteId}`).on('postgres_changes',{event:'*',schema:'public',table:'workout_executions',filter:`athlete_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'nutrition_logs',filter:`athlete_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'appointments',filter:`student_id=eq.${athleteId}`},refresh).subscribe():null;return()=>{request.current++;events.forEach(e=>window.removeEventListener(e,refresh));window.removeEventListener('focus',refresh);if(ch)void supabase.removeChannel(ch);};},[athleteId,refresh]);
  return {cards,failed,refresh};
}
