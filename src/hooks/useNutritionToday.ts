import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dietGoals } from '@/services/athleteCardRules';
import type { Tables } from '@/integrations/supabase/types';
import { businessDate } from '@/services/dailyContextRules';

export function useNutritionToday(athleteId: string | null, selectedDate?: string) {
  const [meals,setMeals]=useState<Tables<'nutrition_logs'>[]>([]);
  const [water,setWater]=useState<Tables<'hydration_logs'>[]>([]);
  const [diet,setDiet]=useState<Tables<'student_diet_assignments'> | null>(null);
  const [loading,setLoading]=useState(true), [error,setError]=useState(false), [updatedAt,setUpdatedAt]=useState<Date|null>(null);
  const request=useRef(0);
  const refresh=useCallback(async()=>{
    const id=++request.current;
    if(!athleteId){setLoading(false);setMeals([]);setWater([]);setDiet(null);setUpdatedAt(null);return;}
    const today=selectedDate || businessDate();
    const [m,w,d]=await Promise.all([
      supabase.from('nutrition_logs').select('*').eq('athlete_id',athleteId).eq('date',today).order('created_at'),
      supabase.from('hydration_logs').select('*').eq('athlete_id',athleteId).eq('log_date',today).order('created_at'),
      supabase.from('student_diet_assignments').select('*').eq('student_id',athleteId).eq('is_active',true).lte('start_date',today).or(`end_date.is.null,end_date.gte.${today}`).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    ]);
    if(id!==request.current)return;
    setError(!!(m.error || w.error || d.error));setLoading(false);
    if(m.error || w.error || d.error)return;
    setMeals(m.data ?? []);setWater(w.data ?? []);setDiet(d.data);setUpdatedAt(new Date());
  },[athleteId, selectedDate]);
  useEffect(()=>{
    setLoading(true);setError(false);setMeals([]);setWater([]);setDiet(null);setUpdatedAt(null);void refresh();
    const events=['9fit:nutrition-updated','9fit:hydration-updated'];events.forEach(e=>window.addEventListener(e,refresh));
    const focus=()=>void refresh();window.addEventListener('focus',focus);
    const channel=athleteId ? supabase.channel(`nutrition-panel-${athleteId}-${Math.random()}`).on('postgres_changes',{event:'*',schema:'public',table:'nutrition_logs',filter:`athlete_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'hydration_logs',filter:`athlete_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'student_diet_assignments',filter:`student_id=eq.${athleteId}`},refresh).subscribe():null;
    return()=>{request.current++;events.forEach(e=>window.removeEventListener(e,refresh));window.removeEventListener('focus',focus);if(channel)void supabase.removeChannel(channel);};
  },[athleteId,refresh]);
  const totals=meals.reduce((sum,m)=>({calories:sum.calories+Number(m.calories ?? 0),protein:sum.protein+Number(m.protein ?? 0),carbs:sum.carbs+Number(m.carbs ?? 0)}),{calories:0,protein:0,carbs:0});
  const goals=dietGoals((diet?.diet_data ?? {}) as Record<string,unknown>);
  return {meals,water,diet,totals,goals,waterMl:water.reduce((sum,w)=>sum+w.amount_ml,0),loading,error,updatedAt,refresh};
}
