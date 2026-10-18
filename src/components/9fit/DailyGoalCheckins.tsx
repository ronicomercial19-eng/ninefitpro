import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from '@/hooks/useAthleteId';
import { toast } from "sonner";

// Padrão Nine Pro v2: pendente = calmo (neutro); concluído = laranja. Sem verde.
export function DailyGoalCheckins() {
  const {user}=useAuth(); const {athleteId}=useAthleteId();
  const [done,setDone]=useState<string[]>([]); const [saving,setSaving]=useState<string|null>(null);
  const date=format(new Date(),'yyyy-MM-dd'), hour=new Date().getHours();
  const slot=hour<10?'Café da manhã':hour<15?'Almoço':hour<18?'Lanche':'Jantar';
  useEffect(()=>{
    let active=true;
    async function refresh(){
      if(!user || !athleteId) { if(active) setDone([]); return; }
      const [registry,workouts,meals]=await Promise.all([
        supabase.from('master_registry').select('payload').eq('user_id',user.id).eq('source','fitpro_daily_checkin').contains('payload',{date}),
        supabase.from('workout_executions').select('id').eq('athlete_id',athleteId).eq('workout_date',date).eq('status','completed').limit(1),
        supabase.from('nutrition_logs').select('meal_name').eq('athlete_id',athleteId).eq('date',date),
      ]);
      if(!active || registry.error || workouts.error || meals.error) return;
      const keys=(registry.data || []).map(row=>{const p=row.payload as Record<string,string>; return p.kind==='nutri'?`nutri:${p.slot}`:p.kind;});
      if(workouts.data?.length) keys.push('treino');
      if(meals.data?.some(meal=>meal.meal_name.toLocaleLowerCase('pt-BR').includes(slot.toLocaleLowerCase('pt-BR')))) keys.push(`nutri:${slot}`);
      setDone([...new Set(keys)]);
    }
    void refresh(); const events=['9fit:sync_updated','9fit:workout-updated','9fit:nutrition-updated'];events.forEach(event=>window.addEventListener(event,refresh));
    return ()=>{active=false;events.forEach(event=>window.removeEventListener(event,refresh));};
  },[user?.id,athleteId,date,slot]);
  async function complete(kind:string){
    const key=kind==='nutri'?`nutri:${slot}`:kind; if(saving || done.includes(key)) return;
    setSaving(key);
    try {
      const {data,error}=await supabase.rpc('fn_fitpro_daily_checkin' as any,{p_kind:kind,p_date:date,p_slot:kind==='nutri'?slot:''});
      if(error) throw error; if(!(data as any)?.success) throw new Error('Não foi possível salvar');
      setDone(values=>[...values,key]); window.dispatchEvent(new Event('9fit:sync_updated')); toast.success('Conclusão registrada');
    }catch(error:any){toast.error(error.message || 'Falha ao registrar conclusão');}finally{setSaving(null);}
  }
  return <section className="space-y-2" aria-label="Metas diárias"><p className="font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">Confirme o que você já fez hoje</p><div className="grid grid-cols-3 gap-2">{['move','nutri','treino'].map(kind=>{
    const key=kind==='nutri'?`nutri:${slot}`:kind;
    const isDone=done.includes(key);
    return <button key={kind} type="button" disabled={!athleteId || !!saving || isDone} onClick={()=>void complete(kind)} className={`rounded-2xl border p-3 text-left transition-all active:scale-95 disabled:cursor-default ${isDone?'border-primary/50 bg-primary/15':'border-white/10 bg-black/60 hover:border-primary/40 disabled:opacity-60'}`}><strong className={`block font-data text-[9px] uppercase tracking-[0.25em] ${isDone?'text-primary':'text-muted-foreground'}`}>{kind}</strong><span className="mt-1 block font-display text-xs font-black uppercase leading-tight tracking-tight text-foreground">{saving===key?'Salvando…':isDone?'✓ Concluído':kind==='nutri'?slot:kind==='move'?'Fiz minha meta':'Fiz o treino'}</span></button>;
  })}</div></section>;
}
