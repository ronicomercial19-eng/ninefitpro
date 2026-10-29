import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {withTimeout} from '@/lib/withTimeout';
import {businessDate} from '@/services/dailyContextRules';
import {readinessRpc} from '@/services/readiness';
export function CapacityResetEditor({athleteId}:{athleteId:string}) {
 const [search,setSearch]=useState(''),[term,setTerm]=useState(''),[workout,setWorkout]=useState(''),[exercise,setExercise]=useState(''),[dose,setDose]=useState(''),[rest,setRest]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setTerm(search.trim()),300);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{setWorkout('');setExercise('');setSearch('');setDose('');setRest('');setMessage('');},[athleteId]);
 const capacity=useQuery({queryKey:['capacity-reset-profile',athleteId],staleTime:30_000,queryFn:()=>readinessRpc('fn_athlete_capacity_profile',{p_athlete_id:athleteId})});
 const weak=capacity.data?.weakest_pillar;const eligible=weak&&['core','cardio','mobilidade'].includes(weak.key)&&Number(weak.value)<50;
 const days=useQuery({queryKey:['capacity-reset-days',athleteId,businessDate()],enabled:!!eligible,queryFn:async()=>{const r=await withTimeout(supabase.from('daily_workouts').select('id,day_name').eq('athlete_id',athleteId).eq('workout_date',businessDate()).eq('override_locked',false).order('created_at',{ascending:false}).limit(5));if(r.error)throw r.error;return r.data;}});
 const catalog=useQuery({queryKey:['capacity-reset-catalog',term],enabled:!!eligible&&term.length>=2,staleTime:60_000,queryFn:async({signal})=>{const r=await withTimeout(supabase.from('exercises').select('id,name').ilike('name',`%${term}%`).order('name').limit(20).abortSignal(signal));if(r.error)throw r.error;return r.data;}});
 async function save(){if(busy||!exercise||!dose.trim()||rest==='')return;setBusy(true);setMessage('');try{await readinessRpc('fn_add_capacity_reset',{p_daily_workout_id:workout||days.data?.[0]?.id,p_exercise_id:exercise,p_dose:dose.trim(),p_rest_seconds:Number(rest)});setMessage('Bloco de preparação salvo na prescrição do aluno.');window.dispatchEvent(new Event('9fit:workout-updated'));}catch{setMessage('Não foi possível incluir o bloco. Confira a dose, a compatibilidade do exercício e se há dor, bloqueio ou sessão iniciada.');}finally{setBusy(false);}}
 if(!eligible)return null;
 return <section className="rounded-3xl border border-primary/25 p-5 space-y-3"><h3 className="font-semibold">Ênfase por capacidade · {weak.key}</h3><p className="text-sm text-muted-foreground">Pilar em {weak.value} pontos. Você pode incluir um exercício no bloco de preparação. O bloco principal e a periodização são preservados.</p>
 {days.isError?<button onClick={()=>void days.refetch()}>Recarregar treinos</button>:!days.data?.length?<p className="text-sm">Não há sessão desbloqueada para hoje.</p>:<>
 <label className="block text-sm">Sessão<select className="mt-1 w-full rounded-xl border bg-background p-2" value={workout||days.data[0].id} onChange={e=>setWorkout(e.target.value)}>{days.data.map(d=><option key={d.id} value={d.id}>{d.day_name}</option>)}</select></label>
 <label className="block text-sm">Buscar exercício compatível<input className="mt-1 w-full rounded-xl border bg-background p-2" value={search} onChange={e=>{setSearch(e.target.value);setExercise('');}} placeholder="Digite pelo menos duas letras"/></label>
 {catalog.data&&<select aria-label="Exercício do bloco de preparação" className="w-full rounded-xl border bg-background p-2" value={exercise} onChange={e=>setExercise(e.target.value)}><option value="">Selecione um exercício</option>{catalog.data.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>}
 <div className="grid grid-cols-2 gap-3"><label className="text-sm">Dose · uma série<input className="mt-1 w-full rounded-xl border bg-background p-2" value={dose} onChange={e=>setDose(e.target.value)} placeholder="Ex.: 12 reps ou 30 s"/></label><label className="text-sm">Descanso em segundos<input className="mt-1 w-full rounded-xl border bg-background p-2" type="number" min="0" max="300" value={rest} onChange={e=>setRest(e.target.value)}/></label></div>
 <button type="button" disabled={busy||!exercise||!dose||rest===''} onClick={()=>void save()} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy?'Salvando...':'Confirmar exercício de preparação'}</button>
 </>}{message&&<p role="status" className="text-sm">{message}</p>}</section>;
}
