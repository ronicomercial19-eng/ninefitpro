import { useCallback, useEffect, useRef, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { serviceCreditBalance } from '@/services/athleteCardRules';
export type PhysicalCommitment={id:string;title:string;at:string;type:string;status:string;route:string;duration:number;location?:string|null;appointmentId?:string;calendarStatus?:string};
export function usePhysicalCommitments(athleteId:string|null,month:Date){
  const {user}=useAuth();const [items,setItems]=useState<PhysicalCommitment[]>([]),[balance,setBalance]=useState<number|null>(null),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);const request=useRef(0);
  const monthKey=format(month,'yyyy-MM');
  const refresh=useCallback(async()=>{
    const version=++request.current;if(!athleteId || !user){setItems([]);setBalance(null);setLoading(false);return;}
    const date=new Date(`${monthKey}-01T12:00:00`),start=startOfMonth(date).toISOString(),end=endOfMonth(date).toISOString();
    const [appointments,credits,plans,classes]=await Promise.all([
      supabase.from('appointments').select('id,title,scheduled_at,duration,status,appointment_type,location,google_calendar_status').eq('student_id',athleteId).in('status',['scheduled','confirmed','pending']).gte('scheduled_at',start).lte('scheduled_at',end).order('scheduled_at'),
      supabase.from('student_credits').select('total_credits,used_credits,expires_at').eq('student_id',athleteId).maybeSingle(),
      supabase.from('student_training_assignments').select('id,training_name,start_date').eq('student_id',athleteId).eq('is_active',true).gt('start_date',format(new Date(),'yyyy-MM-dd')).gte('start_date',format(startOfMonth(date),'yyyy-MM-dd')).lte('start_date',format(endOfMonth(date),'yyyy-MM-dd')),
      supabase.from('class_bookings').select('id,class_id,status,gym_classes(class_name,class_datetime,location)').or(`user_id.eq.${user.id},user_email.eq.${user.email}`).in('status',['confirmed','scheduled']),
    ]);
    if(version!==request.current)return;setLoading(false);setFailed(!!(appointments.error||credits.error||plans.error||classes.error));if(appointments.error||credits.error||plans.error||classes.error)return;
    const now=Date.now();
    const next:PhysicalCommitment[]=(appointments.data??[]).filter(a=>new Date(a.scheduled_at).getTime()>=now).map(a=>({id:a.id,appointmentId:a.id,title:a.title||'Compromisso',at:a.scheduled_at,type:a.appointment_type||'Sessão',status:a.status,route:'/9fit/aulas-creditos?tab=upcoming',duration:a.duration??60,location:a.location,calendarStatus:a.google_calendar_status}));
    for(const c of classes.data??[]){const gym=c.gym_classes;if(!gym?.class_datetime)continue;const at=new Date(gym.class_datetime);if(at.getTime()<now||format(at,'yyyy-MM')!==monthKey)continue;next.push({id:`class-${c.id}`,title:gym.class_name,at:gym.class_datetime,type:'Aula em grupo',status:c.status,route:'/9fit/staff?from=checkin',duration:60,location:gym.location});}
    for(const p of plans.data??[])next.push({id:`plan-${p.id}`,title:`Início do treino: ${p.training_name}`,at:`${p.start_date}T12:00:00`,type:'Nova prescrição',status:'planned',route:'/9fit/train',duration:0});
    setItems(next.sort((a,b)=>a.at.localeCompare(b.at)));setBalance(serviceCreditBalance(credits.data,format(new Date(),'yyyy-MM-dd')));
  },[athleteId,user?.id,user?.email,monthKey]);
  useEffect(()=>{setLoading(true);setFailed(false);setItems([]);setBalance(null);void refresh();window.addEventListener('9fit:appointments-updated',refresh);window.addEventListener('focus',refresh);const ch=athleteId?supabase.channel(`commitments-${athleteId}-${Math.random()}`).on('postgres_changes',{event:'*',schema:'public',table:'appointments',filter:`student_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'student_credits',filter:`student_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'student_training_assignments',filter:`student_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'class_bookings',filter:`user_id=eq.${user?.id}`},refresh).subscribe():null;return()=>{request.current++;window.removeEventListener('9fit:appointments-updated',refresh);window.removeEventListener('focus',refresh);if(ch)void supabase.removeChannel(ch);};},[refresh,athleteId,user?.id]);
  return {items,balance,loading,failed,refresh};
}
