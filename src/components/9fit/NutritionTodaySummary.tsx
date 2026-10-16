import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useNutritionToday } from '@/hooks/useNutritionToday';
import { supabase } from '@/integrations/supabase/client';
import { NutritionLogForm } from './NutritionLogForm';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { businessDate } from '@/services/dailyContextRules';

// Padrão Nine Pro v2 (referência: card TRIBOS em Destaques)
// interactive (tela Dieta / splash) = hero (glow + número vazado).
// Hub (não interativo) = modo calmo, para não competir com o Foco atual.
const label = 'font-data text-[9px] uppercase tracking-[0.3em] text-primary/80';
const pillPrimary = 'inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-95';
const pillGhost = 'inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 active:scale-95';
const outlineStyle: React.CSSProperties = { WebkitTextStroke: '1.5px hsl(20 100% 50%)', color: 'transparent' };

function Metric({ name, value, hint }: { name: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="font-data text-[8px] uppercase tracking-widest text-muted-foreground truncate">{name}</p>
      <p className="mt-1 font-display text-base font-black leading-none text-foreground">{value}</p>
      <p className="mt-1 text-[10px] text-muted-foreground truncate">{hint}</p>
    </div>
  );
}

export function NutritionTodaySummary({ interactive = false, date }: {interactive?:boolean; date?:string}) {
  const hero = interactive;
  const {athleteId}=useAthleteId();const navigate=useNavigate();
  const data=useNutritionToday(athleteId, date);
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
      const query=waterEditing ? supabase.from('hydration_logs').update({amount_ml:amount}).eq('id',waterEditing).eq('athlete_id',athleteId) : supabase.from('hydration_logs').insert({athlete_id:athleteId,log_date:date || businessDate(),amount_ml:amount});
      const {error}=await query.select('id').single();if(error)throw error;
      setWaterEditing(null);setWaterAmount('250');window.dispatchEvent(new Event('9fit:hydration-updated'));window.dispatchEvent(new Event('9fit:water-updated'));window.dispatchEvent(new Event('9fit:sync_updated'));toast.success('Hidratação atualizada');
    }catch{toast.error('Não foi possível salvar a hidratação.');}finally{setSavingWater(false);}
  }
  if(!athleteId)return <p className="text-sm text-muted-foreground">Conecte seu perfil para acessar os registros nutricionais.</p>;

  const kcal = Math.round(data.totals.calories);
  const kcalGoal = data.goals.calories ? Number(data.goals.calories) : null;
  const pct = kcalGoal ? Math.min(100, (kcal / kcalGoal) * 100) : 0;
  const subtitle = data.loading ? 'Carregando…' : data.error ? 'Leitura indisponível' : (data.diet?.diet_name || 'Sem plano alimentar ativo');

  return <section className={`relative overflow-hidden rounded-2xl border p-5 ${hero ? 'border-primary/20 bg-black' : 'border-white/10 bg-black/60'}`} aria-label="Sua alimentação hoje">
    {hero && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsla(20,100%,50%,0.18),transparent_60%)]" />}
    <div className="relative z-10 space-y-5">
      <div>
        <p className={label}>Alimentação do dia</p>
        <h3 className="mt-1 font-display text-lg font-black uppercase leading-tight tracking-tight text-foreground">Sua alimentação hoje</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}{data.updatedAt&&!data.error&&` · atualizado às ${format(data.updatedAt,'HH:mm')}`}</p>
      </div>

      {data.error ? <div role="alert" className="space-y-3"><p className="text-sm">Não foi possível atualizar seus dados.</p><button className={pillGhost} onClick={()=>void data.refresh()}>Tentar novamente</button></div> : !data.loading && <>
        <div>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={label}>Kcal hoje</p>
              {hero
                ? <p className="font-display font-black leading-none tracking-tighter" style={{ ...outlineStyle, fontSize: 'clamp(56px, 20vw, 96px)' }}>{kcal}</p>
                : <p className="font-display text-3xl font-black leading-none tracking-tighter text-foreground">{kcal}</p>}
            </div>
            <p className="pb-2 text-right font-data text-[10px] uppercase tracking-widest text-muted-foreground">{kcalGoal ? `Meta ${kcalGoal} kcal` : 'Sem meta prescrita'}</p>
          </div>
          <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Metric name="Refeições" value={String(data.meals.length)} hint={data.meals.length===0?'Nenhuma ainda':'registradas hoje'} />
          <Metric name="Proteína" value={`${Math.round(data.totals.protein)} g`} hint={data.goals.protein?`Meta ${data.goals.protein} g`:'Sem meta prescrita'} />
          <Metric name="Água" value={`${data.waterMl} ml`} hint={data.goals.water?`Meta ${data.goals.water} ml`:'Sem meta definida'} />
          <Metric name="Carboidratos" value={`${Math.round(data.totals.carbs)} g`} hint="registrados hoje" />
        </div>

        <p className="text-xs text-muted-foreground">{data.meals.length===0?'Registre sua primeira refeição do dia.':'Confira seus registros ou adicione a próxima refeição.'}</p>
      </>}

      <div className="flex flex-wrap gap-2">
        {interactive
          ? <button className={pillPrimary} onClick={()=>{setEditing(null);setForm(true);}}>Registrar refeição <ArrowUpRight className="h-3.5 w-3.5" /></button>
          : <button className={pillGhost} onClick={()=>navigate('/9fit/dieta?action=log')}>Registrar refeição <ArrowUpRight className="h-3.5 w-3.5" /></button>}
        <button className={pillGhost} onClick={()=>navigate('/9fit/dieta')}>Abrir dieta</button>
      </div>

      {interactive&&<>
        <fieldset id="hydration" className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3" disabled={savingWater}>
          <legend className={`${label} px-1`}>{waterEditing?'Corrigir registro de água':'Registrar água'}</legend>
          <div className="flex items-center gap-2">
            <input aria-label="Quantidade de água em mililitros" type="number" min="1" max="5000" value={waterAmount} onChange={e=>setWaterAmount(e.target.value)} className="min-w-0 w-24 rounded-xl border border-primary/20 bg-black p-2 text-sm text-foreground"/>
            <span className="text-sm text-muted-foreground">ml</span>
            <button className={pillGhost} onClick={()=>void saveWater()}>{savingWater?'Salvando…':waterEditing?'Salvar':'Registrar'}</button>
          </div>
          {waterEditing&&<button className="text-xs text-muted-foreground" onClick={()=>{setWaterEditing(null);setWaterAmount('250');}}>Cancelar edição</button>}
        </fieldset>

        {!data.loading&&!data.error&&<div className="space-y-2">
          <p className={label}>Registros de hoje</p>
          {data.meals.length===0&&data.water.length===0&&<p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>}
          {data.meals.map(m=><div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="min-w-0"><p className="text-sm text-foreground">{m.meal_name}</p><p className="text-xs text-muted-foreground">{Math.round(Number(m.calories??0))} kcal · {Number(m.protein??0)} g proteína · {Number(m.carbs??0)} g carboidrato{m.adherence_status==='off_plan'?' · fora do plano':m.adherence_status==='on_plan'?' · dentro do plano':''}</p></div><button className="shrink-0 font-data text-[10px] uppercase tracking-widest text-primary" onClick={()=>{setEditing(m);setForm(true);}}>Editar</button></div>)}
          {data.water.map(w=><div key={w.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs"><span className="text-foreground">Água · {w.amount_ml} ml</span><button className="font-data text-[10px] uppercase tracking-widest text-primary" onClick={()=>{setWaterEditing(w.id);setWaterAmount(String(w.amount_ml));}}>Editar</button></div>)}
        </div>}

        <div className="flex flex-wrap gap-2">
          <button className={pillGhost} onClick={()=>window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge',{detail:{prompt:`Quero revisar minha alimentação e discutir um ajuste. Plano: ${data.diet?.diet_name || 'nenhum'}. Hoje registrei ${data.meals.length} refeições, ${data.totals.calories} kcal, ${data.totals.protein} g proteína e ${data.waterMl} ml água. Metas prescritas: ${JSON.stringify(data.goals)}. Ajude a preparar a revisão, sem alterar a prescrição nem inventar metas.`}}))}>Revisar com RON</button>
          <button className={pillGhost} onClick={()=>navigate('/9fit/staff?context=diet_review',{state:{nutritionReview:{dietName:data.diet?.diet_name || 'Sem dieta ativa',summary:`Revisão alimentar: ${data.meals.length} refeições hoje, ${data.totals.calories} kcal, ${data.totals.protein} g proteína e ${data.waterMl} ml água. Metas prescritas: ${JSON.stringify(data.goals)}.`}}})}>Buscar ajuste profissional</button>
        </div>
        <p className="text-xs text-muted-foreground">A dieta completa contém as refeições prescritas. Mudanças na prescrição precisam de revisão profissional.</p>
        <NutritionLogForm open={form} onClose={()=>setForm(false)} athleteId={athleteId} meal={editing} onSaved={()=>void data.refresh()}/>
      </>}
    </div>
  </section>;
}
