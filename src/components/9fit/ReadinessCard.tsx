import { withAthlete } from '@/lib/professorWorkspace';
import { PDIWizard } from './PDIWizard';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { useReadiness } from '@/hooks/useReadiness';
import { readinessRpc, refreshReadiness } from '@/services/readiness';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
const labels:Record<string,string>={sleep:'Sono',energy:'Energia',mood:'Humor',motivation:'Motivação',pain:'Conforto corporal',pain_location:'Local da dor',increase_authorized:'Aumento autorizado pelo professor',capacity_pillar:'Pilar para revisar',capacity_value:'Score do pilar',capacity_source:'Origem da avaliação',time_budget_seconds:'Tempo disponível em segundos',alert_reported:'Sinal de alerta relatado'};
const duration=(seconds:number)=>seconds<120?`${Math.round(seconds)} s`:`${(seconds/60).toFixed(1)} min`;
const modes={low:'Sessão conservadora · recuperação',balanced:'Sessão equilibrada',power:'Sessão com estímulo adicional'};
const flags:Record<string,string>={training_alert_reported:'Há um sinal de alerta relatado. Interrompa o treino e procure atendimento.',timed_session_review:'A sessão usa tempo ou ritmo: o professor precisa confirmar essas doses; a Sync não converte duração em séries.',persistent_pain_review:'Dor alta em três dias: procure orientação do professor e avaliação profissional.',no_failure_sets:'Hoje, evite séries até a falha.',capacity_focus_review:'O histórico aponta um pilar para reforço. O professor pode incluir esse trabalho no bloco de preparação, preservando o treino principal.',reconfirm_energy:'Confirme como está sua energia agora.',confirm_repeated_answers:'Suas respostas se repetem há cinco dias. Confira se ainda descrevem você.',coach_review_trend:'Seus sinais permaneceram baixos. Converse com o professor.',returning_to_training:'Retorno ao treino: progressão conservadora.',pdi_not_confirmed:'O perfil de recuperação ainda não foi confirmado e não entra nos ajustes.',increase_not_authorized:'Aumento de volume depende da confirmação da periodização pelo professor.'};

// Estilos compartilhados (direção de arte 9FIT: chips/botões com borda laranja fina, eyebrow mono).
const eyebrow='text-[9px] font-data tracking-[0.3em] text-primary/80';
const ghostBtn='inline-flex min-h-10 items-center rounded-xl border border-primary/30 px-3 text-[11px] font-display uppercase tracking-widest text-primary disabled:opacity-50';
const primaryBtn='min-h-11 w-full rounded-xl bg-primary px-4 text-[11px] font-display uppercase tracking-widest text-primary-foreground disabled:opacity-50';
const mutedBtn='text-[11px] text-muted-foreground underline underline-offset-2 disabled:opacity-50';

export function ReadinessCard({athleteId,coach=false}:{athleteId:string;coach?:boolean}) {
 const query=useReadiness(athleteId);const [consent,setConsent]=useState(false);const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [details,setDetails]=useState(false);const [original,setOriginal]=useState<any[]|null>(null);
 const [reviewPdi,setReviewPdi]=useState(false);
 const state=query.data;const d=state?.decision;
 async function action(fn:()=>Promise<unknown>){if(busy)return;setBusy(true);setError('');try{await fn();await refreshReadiness(athleteId);await query.refetch();window.dispatchEvent(new Event('9fit:workout-updated'));}catch{setError('Não foi possível confirmar a alteração. Confira a ficha e tente novamente.');await query.refetch();}finally{setBusy(false);}}
 async function viewOriginal(){if(!d?.applied_workout_id)return;setError('');try{const {data,error}=await withTimeout(supabase.from('daily_workouts').select('changes_json').eq('id',d.applied_workout_id).single());if(error)throw error;const saved=(data?.changes_json as any)?.readiness?.base_exercises;setOriginal(Array.isArray(saved)?saved:[]);}catch{setError('Não foi possível consultar o treino original.');}}
 if(query.isPending)return <p className="text-sm text-muted-foreground" role="status">Consultando a Sync do treino…</p>;
 if(query.isError)return <button type="button" className={ghostBtn} onClick={()=>void query.refetch()}>Não foi possível ler os ajustes da Sync. Tentar novamente</button>;

 const statusText=!d?'':d.status==='applied'?(d.duration_seconds_base&&d.duration_seconds_applied!=null?`Duração prescrita: ${duration(d.duration_seconds_base)} → ${duration(d.duration_seconds_applied)} · ${d.volume_pct_applied}%. Séries preservadas.`:`${d.applied_sets-d.base_sets} séries · ${d.volume_pct_applied}% de volume em relação ao treino original.`):d.status==='shadow'?`Proposta de ${d.volume_pct_total}% de volume registrada. O treino original foi mantido.`:d.status==='skipped_locked'?'Seu treino está iniciado ou protegido pelo professor. A Sync fica como orientação, sem alterar a sessão.':d.status==='skipped_review'?'Esta sessão pede revisão do professor antes de aplicar ajustes.':d.status==='skipped_changed'?'O professor modificou esta prescrição. Revise com ele antes de aplicar outro ajuste.':'Sua Sync está registrada. O ajuste será considerado quando houver treino disponível.';
 const reasonsText=!d?'':d.reasons.filter(r=>d.volume_pct_total<0?r.volume_pct<0:r.volume_pct>0).slice(0,2).map(r=>`${r.message||labels[r.signal]||r.signal} (${r.answer}/5)`).join(' · ');

 return <section className="glass-mission rounded-3xl border border-primary/25 p-5 space-y-4">
 <div className="flex items-start justify-between gap-3">
  <div><p className={eyebrow}>SYNC // SESSÃO DE HOJE</p><h3 className="mt-1 text-editorial text-lg text-foreground">Ajuste da sessão</h3></div>
  <button type="button" className={ghostBtn} disabled={busy} onClick={()=>void action(()=>Promise.resolve())}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy?'animate-spin':''}`}/>Atualizar</button>
 </div>
 {!state?.preferences?.enabled?<div className="space-y-3"><p className="text-sm text-muted-foreground">{coach?'O aluno ainda não autorizou a personalização pela Sync.':'Use seus sinais de sono, energia, humor, motivação e dor para personalizar o treino. Você pode desativar quando quiser.'}</p>{!coach&&<><label className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5 accent-[#EF7A45]" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autorizo o uso desses sinais para os ajustes explicados no meu treino e acompanhamento pelo meu professor.</label><button className={primaryBtn} disabled={!consent||busy} onClick={()=>void action(()=>readinessRpc('fn_set_readiness_preferences',{p_enabled:true}))}>Ativar personalização pela Sync</button></>}</div>:<>
 {d?<div className="space-y-4">
  <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-4 space-y-1.5">
   <p className={eyebrow}>MODO DE HOJE</p>
   <p className="font-display text-base text-foreground">{modes[d.mode]}</p>
   <p className="text-xs leading-relaxed text-muted-foreground">{statusText}</p>
   {d.status==='applied'&&(d.rest_delta_s>0||d.warmup_add_min>0)&&<p className="text-xs text-muted-foreground">Descanso adicional: {d.rest_delta_s}s · aquecimento adicional: {d.warmup_add_min} min.</p>}
   {reasonsText&&<p className="text-[11px] text-muted-foreground">{reasonsText}</p>}
  </div>
  <p className="text-[11px] leading-relaxed text-muted-foreground">O SYNC resume os sinais e registros do dia. A decisão desta sessão também considera o histórico recente, a recuperação e as regras da prescrição.</p>
  <div className="flex flex-wrap gap-2">
   {(d.gate_level>0||d.flags.includes('timed_session_review'))&&<Link className={ghostBtn} to={coach?withAthlete('/app/acompanhamento',athleteId):'/9fit/ajuste-treino'}>Revisar a sessão</Link>}
   {d.status==='applied'&&d.applied_workout_id&&<button type="button" disabled={busy} className={ghostBtn} onClick={()=>void action(()=>readinessRpc('fn_revert_readiness_workout',{p_daily_workout_id:d.applied_workout_id}))}>Restaurar original</button>}
   {d.applied_workout_id&&<button type="button" className={ghostBtn} onClick={()=>void viewOriginal()}>Ver treino original</button>}
  </div>
  <button type="button" className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 min-h-10 text-[11px] font-display uppercase tracking-widest text-muted-foreground" aria-expanded={details} onClick={()=>setDetails(!details)}>{details?'Ocultar detalhes':'Motivos e dados usados hoje'}<ChevronDown className={`h-4 w-4 transition-transform ${details?'rotate-180':''}`}/></button>
  {details&&<div className="space-y-3">
   <dl className="divide-y divide-white/[0.06] rounded-xl border border-white/10 px-3">{Object.entries(d.inputs).map(([k,v])=><div key={k} className="flex items-center justify-between gap-3 py-2 text-xs"><dt className="text-muted-foreground">{labels[k]||k}</dt><dd className="font-mono tabular-nums text-foreground">{v==null?'Não informado':v===true||v==='true'?'Sim':v===false||v==='false'?'Não':String(v)}</dd></div>)}</dl>
   {d.flags.filter(f=>flags[f]).map(f=><p key={f} className="rounded-xl border border-primary/20 bg-primary/[0.05] p-3 text-xs text-muted-foreground">{flags[f]}</p>)}
   <p className="text-[10px] font-mono text-muted-foreground">Regras: {d.rule_set_version}. Os ajustes partem sempre do treino original.</p>
  </div>}
  {coach&&d.applied_workout_id&&<label className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5 accent-[#EF7A45]" disabled={busy} checked={d.inputs.increase_authorized==='true'} onChange={e=>void action(()=>readinessRpc('fn_allow_readiness_increase',{p_daily_workout_id:d.applied_workout_id,p_allowed:e.target.checked}))}/>Confirmo que a periodização permite até uma série adicional hoje, dentro do teto de 10%.</label>}
  {original&&<div className="space-y-2 rounded-2xl border border-white/10 p-3"><p className={eyebrow}>PRESCRIÇÃO ORIGINAL</p>{original.length?original.map((e,i)=><p className="text-xs text-foreground" key={e.id||i}>{e.exercise_name||`Exercício ${i+1}`} · {e.sets} séries · {e.reps_range} · descanso {e.rest_seconds??60}s</p>):<p className="text-xs text-muted-foreground">A prescrição original continua vigente; ainda não houve ajuste aplicado.</p>}<button type="button" className={mutedBtn} onClick={()=>setOriginal(null)}>Fechar</button></div>}
 </div>:<p className="text-sm text-muted-foreground">Complete o check-in de hoje para receber a devolutiva do seu treino.</p>}
 {!coach&&<button type="button" className={mutedBtn} disabled={busy} onClick={()=>void action(()=>readinessRpc('fn_set_readiness_preferences',{p_enabled:false}))}>Desativar próximos ajustes</button>}
 </>}
 <div className="space-y-1 border-t border-white/[0.06] pt-3">
  <p className="text-[11px] text-muted-foreground">{state?.rollout?.observing?`Observação inicial até ${new Date(state.rollout.apply_after).toLocaleDateString('pt-BR')}. As decisões ficam registradas sem alterar a prescrição.`:'Treinos iniciados e bloqueios do professor são preservados.'}</p>
  {state?.preferences?.pdi_confirmed_at?<p className="text-[11px] text-muted-foreground">Perfil de recuperação confirmado em {new Date(state.preferences.pdi_confirmed_at).toLocaleDateString('pt-BR')}.</p>:<button type="button" disabled={busy} className={ghostBtn} onClick={()=>coach?void action(()=>readinessRpc('fn_confirm_readiness_pdi',{p_athlete_id:athleteId})):setReviewPdi(true)}>{coach?'Confirmar a ficha de recuperação deste aluno':'Revisar e confirmar minha ficha de recuperação'}</button>}
 </div>
 {!coach&&<PDIWizard open={reviewPdi} onClose={()=>setReviewPdi(false)} onComplete={()=>{setReviewPdi(false);void action(()=>readinessRpc('fn_confirm_readiness_pdi',{p_athlete_id:athleteId}));}}/>}
 {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
 </section>;
}
