import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Pencil } from 'lucide-react';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useNutritionToday } from '@/hooks/useNutritionToday';
import { supabase } from '@/integrations/supabase/client';
import { NutritionLogForm } from './NutritionLogForm';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { businessDate } from '@/services/dailyContextRules';

type DietMeal = Pick<Tables<'diet_meals'>, 'id' | 'nome' | 'horario_previsto' | 'kcal' | 'ordem'>;

export function NutritionTodaySummary({ interactive = false, date }: {interactive?:boolean; date?:string}) {
  const {athleteId}=useAthleteId();const navigate=useNavigate();
  const data=useNutritionToday(athleteId, date);
  const [form,setForm]=useState(false),[editing,setEditing]=useState<Tables<'nutrition_logs'>|null>(null);
  const [waterAmount,setWaterAmount]=useState('250'),[savingWater,setSavingWater]=useState(false);
  const [waterEditing,setWaterEditing]=useState<string|null>(null);
  const [plannedMeals,setPlannedMeals]=useState<DietMeal[]>([]);
  const dietId=data.diet?.id ?? null;
  useEffect(()=>{setForm(false);setEditing(null);setWaterEditing(null);setWaterAmount('250');},[athleteId]);
  useEffect(()=>{
    let alive=true;
    if(!dietId){setPlannedMeals([]);return;}
    supabase.from('diet_meals').select('id,nome,horario_previsto,kcal,ordem').eq('diet_assignment_id',dietId).order('ordem').then(({data:rows,error})=>{
      if(!alive)return; setPlannedMeals(error?[]:(rows ?? []));
    });
    return()=>{alive=false;};
  },[dietId]);

  async function saveWater(){
    const amount=Number(waterAmount);
    if(!athleteId || savingWater)return;
    if(!Number.isInteger(amount)||amount<=0||amount>5000)return toast.error('Informe entre 1 e 5000 ml.');
    setSavingWater(true);
    try{
      const query=waterEditing ? supabase.from('hydration_logs').update({amount_ml:amount}).eq('id',waterEditing).eq('athlete_id',athleteId) : supabase.from('hydration_logs').insert({athlete_id:athleteId,log_date:date || businessDate(),amount_ml:amount});
      const {error}=await query.select('id').single();if(error)throw error;
      setWaterEditing(null);setWaterAmount('250');window.dispatchEvent(new Event('9fit:hydration-updated'));window.dispatchEvent(new Event('9fit:water-updated'));window.dispatchEvent(new Event('9fit:sync_updated'));toast.success('Hidratação atualizada');
    }catch{toast.error('Não foi possível salvar a hidratação.');}finally{setSavingWater(false);}
  }

  if(!athleteId)return <section className="nine-card"><p className="nine-label">Nutrição</p><p className="mt-2 text-sm text-muted-foreground">Conecte seu perfil para liberar a nutrição.</p></section>;

  const logged=data.meals.length;
  const total=plannedMeals.length;
  const next=total>0 && logged<total ? plannedMeals[logged] : null;
  const progress=total>0 ? Math.min(100,(logged/total)*100) : data.goals.calories ? Math.min(100,(data.totals.calories/data.goals.calories)*100) : 0;
  const openLog=()=>{ if(interactive){setEditing(null);setForm(true);} else navigate('/9fit/dieta?action=log'); };
  const headline = data.loading ? 'Lendo seu dia…' : data.error ? 'Leitura indisponível' : next ? next.nome : total>0 ? 'Dia fechado' : logged===0 ? 'Primeira refeição' : 'Próxima refeição';
  const sub = data.loading ? '' : data.error ? 'Toque para tentar de novo.' : next ? `${next.horario_previsto ? next.horario_previsto.slice(0,5)+' · ' : ''}${Math.round(Number(next.kcal||0))} kcal previstas` : total>0 ? 'Todas as refeições do plano registradas.' : data.diet ? data.diet.diet_name : 'Sem plano ativo. Registre e o RON aprende seu padrão.';

  return <section className="space-y-4" aria-label="Sua alimentação hoje">
    <div className="nine-card pb-6">
      <div className="flex items-start justify-between gap-3">
        <p className="nine-label">Nutrição · Hoje</p>
        {data.updatedAt&&!data.error&&<span className="font-mono text-[10px] text-muted-foreground">{format(data.updatedAt,'HH:mm')}</span>}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{next ? 'Próxima refeição' : 'Agora'}</p>
          <h3 className="nine-title mt-1 truncate text-3xl">{headline}</h3>
          {sub&&<p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="nine-title nine-outline text-5xl tabular-nums">{logged}{total>0&&<span className="text-2xl">/{total}</span>}</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">refeições</p>
        </div>
      </div>

      {!data.loading&&!data.error&&<div className="mt-5 grid grid-cols-3 divide-x divide-primary/15 border-y border-primary/15 py-3 text-center">
        <Metric label="Proteína" value={`${Math.round(data.totals.protein)}g`} hint={data.goals.protein?`/ ${data.goals.protein}g`:'livre'} />
        <Metric label="Carbo" value={`${Math.round(data.totals.carbs)}g`} hint={`${Math.round(data.totals.calories)} kcal`} />
        <Metric label="Água" value={`${data.waterMl}ml`} hint={data.goals.water?`/ ${data.goals.water}ml`:'livre'} />
      </div>}

      <div className="mt-5 flex flex-wrap gap-2">
        {data.error
          ? <button className="nine-btn" onClick={()=>void data.refresh()}>Tentar de novo <ArrowRight className="h-4 w-4"/></button>
          : <button className="nine-btn" onClick={openLog}>{next?`Registrar ${next.nome}`:'Registrar refeição'} <ArrowRight className="h-4 w-4"/></button>}
        {!interactive&&<button className="nine-btn-outline" onClick={()=>navigate('/9fit/dieta')}>Abrir dieta</button>}
      </div>
      <div className="nine-progress" style={{width:`${progress}%`}} aria-hidden />
    </div>

    {interactive&&<>
      <fieldset id="hydration" className="nine-panel space-y-3" disabled={savingWater}>
        <legend className="nine-label px-1">{waterEditing?'Corrigir água':'Água'}</legend>
        <div className="flex items-center gap-2">
          <input aria-label="Quantidade de água em mililitros" type="number" min="1" max="5000" value={waterAmount} onChange={e=>setWaterAmount(e.target.value)} className="h-11 w-24 min-w-0 rounded-full border border-primary/25 bg-background px-4 text-sm tabular-nums"/>
          <span className="font-mono text-xs text-muted-foreground">ml</span>
          <button className="nine-btn-outline ml-auto" onClick={()=>void saveWater()}>{savingWater?'Salvando…':waterEditing?'Salvar':'Registrar'}</button>
        </div>
        {waterEditing&&<button className="nine-link" onClick={()=>{setWaterEditing(null);setWaterAmount('250');}}>Cancelar edição</button>}
      </fieldset>

      {!data.loading&&!data.error&&<div className="nine-panel space-y-2">
        <p className="nine-label">Registros do dia</p>
        {logged===0&&data.water.length===0&&<p className="text-xs text-muted-foreground">Nada por aqui ainda. Comece pela próxima refeição.</p>}
        {data.meals.map(m=><div key={m.id} className="flex items-center justify-between gap-3 border-b border-primary/10 py-2 last:border-0">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{m.meal_name}</p><p className="font-mono text-[10px] text-muted-foreground">{Math.round(Number(m.calories??0))} kcal · P {Number(m.protein??0)}g · C {Number(m.carbs??0)}g{m.adherence_status==='off_plan'?' · fora do plano':m.adherence_status==='on_plan'?' · no plano':''}</p></div>
          <button aria-label="Editar refeição" className="p-2 text-primary" onClick={()=>{setEditing(m);setForm(true);}}><Pencil className="h-4 w-4"/></button>
        </div>)}
        {data.water.map(w=><div key={w.id} className="flex items-center justify-between border-b border-primary/10 py-2 text-xs last:border-0"><span className="font-mono">Água · {w.amount_ml} ml</span><button aria-label="Editar água" className="p-2 text-primary" onClick={()=>{setWaterEditing(w.id);setWaterAmount(String(w.amount_ml));}}><Pencil className="h-4 w-4"/></button></div>)}
      </div>}

      <div className="nine-panel space-y-3">
        <p className="nine-label">Ajuste de rota</p>
        <p className="text-xs text-muted-foreground">Mudanças na prescrição passam por revisão profissional.</p>
        <div className="flex flex-wrap gap-2">
          <button className="nine-btn-outline" onClick={()=>window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge',{detail:{prompt:`Quero revisar minha alimentação e discutir um ajuste. Plano: ${data.diet?.diet_name || 'nenhum'}. Hoje registrei ${data.meals.length} refeições, ${data.totals.calories} kcal, ${data.totals.protein} g proteína e ${data.waterMl} ml água. Metas prescritas: ${JSON.stringify(data.goals)}. Ajude a preparar a revisão, sem alterar a prescrição nem inventar metas.`}}))}>Revisar com RON</button>
          <button className="nine-btn-outline" onClick={()=>navigate('/9fit/staff?context=diet_review',{state:{nutritionReview:{dietName:data.diet?.diet_name || 'Sem dieta ativa',summary:`Revisão alimentar: ${data.meals.length} refeições hoje, ${data.totals.calories} kcal, ${data.totals.protein} g proteína e ${data.waterMl} ml água. Metas prescritas: ${JSON.stringify(data.goals)}.`}}})}>Falar com profissional</button>
        </div>
      </div>
      <NutritionLogForm open={form} onClose={()=>setForm(false)} athleteId={athleteId} meal={editing} onSaved={()=>void data.refresh()}/>
    </>}
  </section>;
}

function Metric({label,value,hint}:{label:string;value:string;hint:string}){
  return <div className="px-2"><p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{label}</p><p className="nine-title mt-1 text-lg tabular-nums">{value}</p><p className="font-mono text-[10px] text-muted-foreground">{hint}</p></div>;
}
