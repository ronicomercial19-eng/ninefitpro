import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAthleteId } from '@/hooks/useAthleteId';
import { supabase } from '@/integrations/supabase/client';

export function NutritionTodaySummary() {
  const { athleteId } = useAthleteId();
  const navigate=useNavigate();
  const [total,setTotal]=useState<{meals:number;calories:number;protein:number;carbs:number;fat:number}|null>(null);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let active=true;
    async function refresh(){
      if(!athleteId) { setTotal(null); return; }
      const {data,error}=await supabase.from('nutrition_logs').select('calories,protein,carbs,fat').eq('athlete_id',athleteId).eq('date',format(new Date(),'yyyy-MM-dd'));
      if(!active) return;
      setFailed(!!error);
      if(error) return;
      setTotal((data || []).reduce<{meals:number;calories:number;protein:number;carbs:number;fat:number}>((sum,row)=>({meals:sum.meals+1,calories:sum.calories+Number(row.calories || 0),protein:sum.protein+Number(row.protein || 0),carbs:sum.carbs+Number(row.carbs || 0),fat:sum.fat+Number(row.fat || 0)}),{meals:0,calories:0,protein:0,carbs:0,fat:0}));
    }
    void refresh();
    window.addEventListener('9fit:nutrition-updated',refresh);
    const channel=athleteId ? supabase.channel(`nutrition-summary-${athleteId}`).on('postgres_changes',{event:'*',schema:'public',table:'nutrition_logs',filter:`athlete_id=eq.${athleteId}`},refresh).subscribe() : null;
    return ()=>{active=false;window.removeEventListener('9fit:nutrition-updated',refresh);if(channel) void supabase.removeChannel(channel);};
  },[athleteId]);
  return <section className="rounded-xl border border-white/10 p-3 space-y-2"><p className="text-sm font-semibold">Alimentação de hoje</p>
    {failed ? <p className="text-xs text-muted-foreground">Não foi possível atualizar seus registros.</p> : total ? <><p className="text-xs">{total.meals} refeições · {Math.round(total.calories)} kcal</p><p className="text-xs text-muted-foreground">Proteína {Math.round(total.protein)} g · Carboidratos {Math.round(total.carbs)} g · Gorduras {Math.round(total.fat)} g</p></> : <p className="text-xs">Carregando…</p>}
    <button onClick={()=>navigate('/9fit/foods')} className="text-xs font-semibold text-primary">Abrir dieta e registrar refeição</button>
  </section>;
}
