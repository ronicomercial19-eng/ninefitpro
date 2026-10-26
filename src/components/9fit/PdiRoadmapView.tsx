import { useEffect, useState } from 'react';
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useActivationProgress } from '@/hooks/useActivationProgress';

export function PdiRoadmapView() {
  const {athleteId}=useAthleteId();
  const {completed,reload}=useActivationProgress();
  useEffect(()=>{const refresh=()=>void reload();window.addEventListener('9fit:activation-updated',refresh);return()=>window.removeEventListener('9fit:activation-updated',refresh)},[reload]);
  const [count,setCount]=useState<number|null>(null);
  useEffect(()=>{
    let active=true;setCount(null);
    if(!athleteId)return;
    const refresh=async()=>{const {count,error}=await supabase.from('workout_executions').select('id',{count:'exact',head:true}).eq('athlete_id',athleteId).eq('status','completed').eq('completion_valid',true);if(active)setCount(error?null:count??0)};
    void refresh();window.addEventListener('9fit:workout-updated',refresh);
    const channel=supabase.channel(`planning-roadmap-${athleteId}`).on('postgres_changes',{event:'*',schema:'public',table:'workout_executions',filter:`athlete_id=eq.${athleteId}`},refresh).subscribe();
    return()=>{active=false;window.removeEventListener('9fit:workout-updated',refresh);void supabase.removeChannel(channel)};
  },[athleteId]);
  const milestones=[
    {label:'Primeiro plano registrado',completed:completed.has('first_plan')},
    {label:'Primeiro treino concluído',completed:count!=null&&count>=1},
    {label:count==null?'Primeiros 10 treinos · aguardando registros':`Primeiros 10 treinos · ${Math.min(count,10)}/10`,completed:count!=null&&count>=10},
  ];
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Roadmap de Conquistas</h3>
      <div className="space-y-4">
        {milestones.map((m, i) => (
          <div key={i} className="flex items-center gap-3">
            {m.completed ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
            <span className={`text-sm ${m.completed ? "text-foreground" : "text-muted-foreground"}`}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
