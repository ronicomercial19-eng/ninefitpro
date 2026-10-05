import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useNutritionToday } from '@/hooks/useNutritionToday';
import { supabase } from '@/integrations/supabase/client';
import { NutritionLogForm } from './NutritionLogForm';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export function NutritionTodaySummary({ interactive = false }: {interactive?:boolean}) {
  const {athleteId}=useAthleteId();const navigate=useNavigate();
  const data=useNutritionToday(athleteId);
  const [form,setForm]=useState(false),[editing,setEditing]=useState<Tables<'nutrition_logs'>|null>(null);
  const [waterAmount,setWaterAmount]=useState('250'),[savingWater,setSavingWater]=useState(false);
  const [waterEditing,setWaterEditing]=useState<string|null>(null);
  useEffect(()=>{setForm(false);setEditing(null);setWaterEditing(null);setWaterAmount('250');},[athleteId]);
  async function saveWater(){
    const amount=Number(waterAmount);
    if(!athleteId || savingWater)return;
    if(!Number.isInteger(amount)||amount<=0||amount>5000)return toast.error('Informe entre 1 e 5000 ml.');
    setSavingWater(true);
    try{
      const query=waterEditing ? supabase.from('hydration_logs').update({amount_ml:amount}).eq('id',waterEditing).eq('athlete_id',athleteId) : supabase.from('hydration_logs').insert({athlete_id:athleteId,log_date:format(new Date(),'yyyy-MM-dd'),amount_ml:amount});
      const {error}=await query.select('id').single();if(error)throw error;
      setWaterEditing(null);setWaterAmount('250');window.dispatchEvent(new Event('9fit:hydration-updated'));window.dispatchEvent(new Event('9fit:water-updated'));window.dispatchEvent(new Event('9fit:sync_updated'));toast.success('Hidratação atualizada');
    }catch{toast.error('Não foi possível salvar a hidratação.');}finally{setSavingWater(false);}
  }
  const button='rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary';
  if(!athleteId)return <p className="text-sm text-muted-foreground">Conecte seu perfil para acessar os registros nutricionais.</p>;
  return <section className="rounded-xl border border-white/10 p-4 space-y-4" aria-label="Sua alimentação hoje">
    <div><h3 className="text-base font-semibold">Sua alimentação hoje</h3><p className="text-xs text-muted-foreground mt-1">{data.loading?'Carregando…':data.error?'Leitura indisponível':data.diet?.diet_name || 'Sem plano alimentar ativo'}{data.updatedAt&&!data.error&&` · atualizado às ${format(data.updatedAt,'HH:mm')}`}</p></div>
    {data.error ? <div role="alert"><p className="text-sm">Não foi possível atualizar seus dados.</p><button className={button} onClick={()=>void data.refresh()}>Tentar novamente</button></div> : !data.loading && <>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Refeições</p><strong>{data.meals.length}</strong><p className="text-xs">{Math.round(data.totals.calories)} kcal{data.goals.calories?` / ${data.goals.calories}`:''}</p></div>
        <div><p className="text-xs text-muted-foreground">Proteína</p><strong>{Math.round(data.totals.protein)} g</strong><p className="text-xs">{data.goals.protein?`Meta ${data.goals.protein} g`:'Sem meta prescrita'}</p></div>
        <div><p className="text-xs text-muted-foreground">Água</p><strong>{data.waterMl} ml</strong><p className="text-xs">{data.goals.water?`Meta ${data.goals.water} ml`:'Sem meta definida'}</p></div>
      </div>
      <p className="text-sm text-neutral-300">{data.meals.length===0?'Comece registrando sua primeira refeição do dia.':'Confira seus registros ou adicione a próxima refeição.'}</p>
    </>}
    <div className="flex flex-wrap gap-2">
      {interactive?<button className={button} onClick={()=>{setEditing(null);setForm(true);}}>Registrar refeição</button>:<button className={button} onClick={()=>navigate('/9fit/dieta?action=log')}>Registrar refeição</button>}
      <button className={button} onClick={()=>navigate('/9fit/dieta')}>Abrir dieta</button>
    </div>
    {interactive&&<>
      <fieldset className="space-y-2 rounded-lg border border-white/10 p-3" disabled={savingWater}>
        <legend className="text-sm">{waterEditing?'Corrigir registro de água':'Registrar água'}</legend>
        <div className="flex gap-2"><input aria-label="Quantidade de água em mililitros" type="number" min="1" max="5000" value={waterAmount} onChange={e=>setWaterAmount(e.target.value)} className="min-w-0 w-24 rounded-lg bg-card border border-border p-2 text-sm"/><span className="self-center text-sm">ml</span><button className={button} onClick={()=>void saveWater()}>{savingWater?'Salvando…':waterEditing?'Salvar':'Registrar'}</button></div>
        {waterEditing&&<button className="text-xs" onClick={()=>{setWaterEditing(null);setWaterAmount('250');}}>Cancelar edição</button>}
      </fieldset>
      {!data.loading&&!data.error&&<div className="space-y-2"><h4 className="text-sm font-semibold">Registros de hoje</h4>{data.meals.length===0&&data.water.length===0&&<p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>}{data.meals.map(m=><div key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3"><div><p className="text-sm">{m.meal_name}</p><p className="text-xs text-muted-foreground">{Math.round(Number(m.calories??0))} kcal · {Number(m.protein??0)} g proteína</p></div><button className="text-xs text-primary" onClick={()=>{setEditing(m);setForm(true);}}>Editar</button></div>)}{data.water.map(w=><div key={w.id} className="flex justify-between rounded-lg bg-white/5 p-3 text-xs"><span>Água · {w.amount_ml} ml</span><button className="text-primary" onClick={()=>{setWaterEditing(w.id);setWaterAmount(String(w.amount_ml));}}>Editar</button></div>)}</div>}
      <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge',{detail:{prompt:`Quero revisar minha alimentação e discutir um ajuste. Plano: ${data.diet?.diet_name || 'nenhum'}. Hoje registrei ${data.meals.length} refeições, ${data.totals.calories} kcal, ${data.totals.protein} g proteína e ${data.waterMl} ml água. Metas prescritas: ${JSON.stringify(data.goals)}. Ajude a preparar a revisão, sem alterar a prescrição nem inventar metas.`}}))}>Revisar com RON</button><button className={button} onClick={()=>navigate('/9fit/staff?context=diet_review',{state:{nutritionReview:{dietName:data.diet?.diet_name || 'Sem dieta ativa',summary:`Revisão alimentar: ${data.meals.length} refeições hoje, ${data.totals.calories} kcal, ${data.totals.protein} g proteína e ${data.waterMl} ml água. Metas prescritas: ${JSON.stringify(data.goals)}.`}}})}>Buscar ajuste profissional</button></div>
      <p className="text-xs text-muted-foreground">A dieta completa contém as refeições prescritas. Mudanças na prescrição precisam de revisão profissional.</p>
      <NutritionLogForm open={form} onClose={()=>setForm(false)} athleteId={athleteId} meal={editing} onSaved={()=>void data.refresh()}/>
    </>}
  </section>;
}
