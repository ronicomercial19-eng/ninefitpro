import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Footprints, Dumbbell, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteId } from '@/hooks/useAthleteId';
import { toast } from "sonner";

// Linha de CTAs do Hub: topo = estado (HubFloatingMetrics), aqui = ação (iniciar).
// O auto-relato "Já fiz hoje" continua disponível (fn_fitpro_daily_checkin) porque alimenta o Sync Score.
const CTAS = [
  { key: 'run', label: 'Correr', hint: 'GPS e ritmo', route: '/9fit/move', Icon: Footprints },
  { key: 'train', label: 'Treinar', hint: 'Treino do dia', route: '/9fit/train', Icon: Dumbbell },
  { key: 'diet', label: 'Dieta', hint: 'Plano e refeições', route: '/9fit/dieta', Icon: Utensils },
] as const;
export function DailyGoalCheckins() {
  const navigate = useNavigate();
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
  const selfReport=[
    {kind:'treino',key:'treino',label:'Treino',doneLabel:'Treino feito'},
    {kind:'nutri',key:`nutri:${slot}`,label:slot,doneLabel:`${slot} feito`},
  ];
  return <section className="space-y-3" aria-label="Ações rápidas">
    <div className="grid grid-cols-3 gap-2">
      {CTAS.map(({key,label,hint,route,Icon})=>(
        <button key={key} type="button" onClick={()=>navigate(route)} className="flex flex-col items-center justify-center gap-1 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs transition-transform active:scale-95">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          <strong className="block uppercase">{label}</strong>
          <span className="text-[10px] text-muted-foreground">{hint}</span>
        </button>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Já fiz hoje</span>
      {selfReport.map(({kind,key,label,doneLabel})=>{
        const isDone=done.includes(key);
         return <button key={key} type="button" disabled={!athleteId || !!saving || isDone} onClick={()=>void complete(kind)} className={`rounded-full border px-3 py-1.5 text-[11px] disabled:opacity-70 ${isDone?'border-primary/50 bg-primary/15 text-primary':'border-white/10 bg-white/[0.03]'}`}>{saving===key?'Salvando…':isDone?`✓ ${doneLabel}`:label}</button>;
      })}
    </div>
  </section>;
}
