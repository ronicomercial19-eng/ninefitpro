import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { X, Loader2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';
import { ExerciseVideoPlayer } from '@/components/exercises/ExerciseVideoPlayer';
import { loadTrainingContent, type TrainingContent } from '@/services/quickTrainingContent';

type Stage = 'loading' | 'calibration' | 'pain' | 'review' | 'choice' | 'questions' | 'result';
type Exercise = { id: string; name: string; video_url?: string; gif_url?: string; instructions?: string; description?: string; target_muscles?: string[]; sets: number; reps_range: string; rest_seconds: number };
type Payload = { daily_workout_id: string; exercises: Exercise[]; estimated_duration_min: number; preparation_minutes: number };
type Profile = { experience_level: string | null; injuries_limitations: string | null; primary_goal: string | null };
const goals = [{ value: 'strength', label: 'Força' }, { value: 'cardio', label: 'Condicionamento / cardio' }, { value: 'mobility', label: 'Mobilidade' }, { value: 'recovery', label: 'Recuperação leve' }];
const resources = [{ value: 'bodyweight', label: 'Peso corporal' }, { value: 'dumbbells', label: 'Halteres' }, { value: 'bands', label: 'Elásticos' }, { value: 'gym', label: 'Academia completa' }];
const field = 'w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-primary/60';
const primary = 'w-full rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-50';

export function QuickTrainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { athleteId } = useAthleteId();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('loading');
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState('');
  const [minutes, setMinutes] = useState(0);
  const [equipment, setEquipment] = useState<string[]>(['bodyweight']);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlan] = useState<{ name: string; phase: string | null } | null>(null);
  const [ongoing, setOngoing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Payload | null>(null);
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [contentStatus, setContentStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [region, setRegion] = useState('');
  const requestRef = useRef(0), busyRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  async function loadContext() {
    if (!athleteId) { setError('Perfil de atleta não encontrado. Feche e tente novamente.'); return; }
    const request = ++requestRef.current;
    setStage('loading'); setError('');
    try {
      const [athlete, calibration, periodization, daily, executions] = await Promise.all([
        supabase.from('athletes').select('experience_level,injuries_limitations,primary_goal').eq('id',athleteId).single(),
        supabase.from('daily_checkins').select('*').eq('athlete_id',athleteId).eq('checkin_date',today).maybeSingle(),
        supabase.from('vw_athlete_periodizacao_ativa').select('plan_name,current_phase').eq('athlete_id',athleteId).maybeSingle(),
        supabase.from('daily_workouts').select('day_name').eq('athlete_id',athleteId).eq('workout_date',today).neq('workout_type','quick').limit(1),
        supabase.from('workout_executions').select('id').eq('athlete_id',athleteId).eq('workout_date',today).in('status',['in_progress','paused','started']).limit(1),
      ]);
      for (const response of [athlete,calibration,periodization,daily,executions]) if (response.error) throw response.error;
      if (request !== requestRef.current) return;
      setProfile(athlete.data);
      const current = periodization.data;
      const currentPlan = current ? { name: current.plan_name || 'Seu planejamento', phase: current.current_phase != null ? String(current.current_phase) : null } : daily.data?.[0] ? { name: daily.data[0].day_name || 'Treino de hoje', phase: null } : null;
      setPlan(currentPlan); setOngoing(!!executions.data?.length);
      const check = calibration.data;
      const complete = check && [check.sono,check.energia,check.humor,check.motivacao,check.dor].every(value => value !== null);
      if (!complete) setStage('calibration');
      else if (Number(check.dor)>1 && !check.dor_local) setStage('pain');
      else if (Number(check.dor)>=3 || check.dor_local || (athlete.data.injuries_limitations?.trim() && !/^(nenhum[a]?|n[aã]o|none|sem restri[cç][oõ]es)$/i.test(athlete.data.injuries_limitations.trim()))) setStage('review');
      else setStage(currentPlan || executions.data?.length ? 'choice' : 'questions');
    } catch (failure) { if (request === requestRef.current) setError(failure instanceof Error ? failure.message : 'Não foi possível consultar sua rotina.'); }
  }

  useEffect(() => {
    ++requestRef.current; busyRef.current=false; setBusy(false);
    setStep(0); setGoal(''); setMinutes(0); setEquipment(['bodyweight']); setResult(null); setContent([]); setExpanded(null); setRegion('');
    if (open) void loadContext();
    return () => { ++requestRef.current; };
  }, [open,athleteId]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow='hidden'; dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (event: KeyboardEvent) => { if (event.key==='Escape') onClose(); if (event.key==='Tab') { const controls=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,a[href],iframe') || []).filter(item=>item.getClientRects().length); const first=controls[0],last=controls[controls.length-1]; if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();} } };
    window.addEventListener('keydown',key);
    return () => { document.body.style.overflow=overflow; window.removeEventListener('keydown',key);previous?.focus(); };
  }, [open,onClose]);

  function go(route: string) { onClose(); navigate(route); }
  async function generate() {
    if (!athleteId || busyRef.current || !goal || !minutes || !equipment.length) return;
    busyRef.current=true;setBusy(true);setError('');const request=++requestRef.current;
    try {
      // The canonical RPC applies profile, calibration, equipment and recent-history constraints.
      const response = await supabase.rpc('fn_treino_rapido',{p_athlete_id:athleteId,p_objetivo:goal,p_tempo_min:minutes,p_equipamento:`resources:${equipment.join(',')}`});
      if(response.error) throw response.error;
      if(request!==requestRef.current)return;
      const payload=response.data as unknown as Payload;
      if(!payload?.daily_workout_id || !payload.exercises?.length) throw new Error('Nenhum treino compatível foi retornado.');
      setResult(payload);setStage('result');setContentStatus('Consultando conteúdos relacionados…');
      void loadTrainingContent(athleteId,goal,equipment,profile?.experience_level || '').then(items=>{if(request===requestRef.current){setContent(items);setContentStatus('');}}).catch(()=>{if(request===requestRef.current)setContentStatus('Conteúdos complementares indisponíveis. Seu treino continua disponível.');});
    } catch(failure) { if(request===requestRef.current) setError(failure instanceof Error ? failure.message : (failure as {message?:string})?.message || 'Não foi possível gerar o treino.'); }
    finally {if(request===requestRef.current){busyRef.current=false;setBusy(false);}}
  }
  async function start() {
    if(!athleteId || !result || busyRef.current)return;
    busyRef.current=true;setBusy(true);setError('');const request=++requestRef.current;
    try {
      const response=await supabase.rpc('fn_start_daily_workout_execution',{p_daily_workout_id:result.daily_workout_id});
      if(response.error || !response.data)throw response.error || new Error('Não foi possível iniciar a execução.');
      if(request!==requestRef.current)return;
      const quickTraining={id:result.daily_workout_id,daily_workout_id:result.daily_workout_id,execution_id:String(response.data),training_name:`Treino Rápido · ${goals.find(item=>item.value===goal)?.label}`,training_type:'structured',is_active:true,start_date:today,training_data:{estimated_duration:result.estimated_duration_min,requested_duration_min:minutes,exercises:result.exercises.map(item=>({exercise_id:item.id,name:item.name,sets:item.sets,reps:item.reps_range,rest_seconds:item.rest_seconds,video_url:item.video_url,gif_url:item.gif_url,target_muscles:item.target_muscles,notes:item.instructions || item.description}))}};
      onClose();navigate('/9fit/train',{state:{quickTraining}});
    }catch(failure){if(request===requestRef.current)setError((failure as {message?:string})?.message || 'Não foi possível iniciar o treino.');}
    finally{if(request===requestRef.current){busyRef.current=false;setBusy(false);}}
  }
  async function saveRegion() {
    if(!athleteId || !region || busyRef.current)return;
    busyRef.current=true;setBusy(true);const request=++requestRef.current;
    try { const response=await supabase.from('daily_checkins').update({dor_local:region}).eq('athlete_id',athleteId).eq('checkin_date',today).select('id').single();if(response.error)throw response.error;if(request===requestRef.current){setStage('review');window.dispatchEvent(new Event('9fit:sync_updated'));} }
    catch {if(request===requestRef.current)setError('Não foi possível salvar a região. Tente novamente.');}
    finally {if(request===requestRef.current){busyRef.current=false;setBusy(false);}}
  }
  if(!open)return null;
  return <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"><div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Treino rápido" className="w-full max-w-lg rounded-3xl border border-primary/40 bg-card p-5 max-h-[90vh] overflow-y-auto">
    <header className="flex items-center justify-between mb-4"><div><p className="text-[10px] uppercase tracking-widest text-primary font-bold">Treino Rápido</p><h2 className="font-display text-xl">Uma sessão para o seu momento</h2></div><button type="button" onClick={onClose} aria-label="Fechar treino rápido" className="p-2"><X className="h-5 w-5" /></button></header>
    {error && <p role="alert" className="mb-3 rounded-lg border border-red-400/40 p-3 text-sm">{error}{stage==='loading' && <button className={field} onClick={()=>void loadContext()}>Tentar novamente</button>}</p>}
    {stage==='loading' && !error && <p role="status" className="py-6 text-sm"><Loader2 className="inline h-4 w-4 animate-spin" /> Consultando seu perfil e sua rotina…</p>}
    {stage==='calibration' && <><p className="mb-3 text-sm">Antes de escolher a sessão, complete sua calibração de hoje.</p><EmojiCalibrationQuiz onComplete={()=>void loadContext()} /></>}
    {stage==='pain' && <div className="space-y-3"><h3>Em qual região está o desconforto?</h3><select className={field} value={region} onChange={event=>setRegion(event.target.value)} aria-label="Região do desconforto"><option value="">Selecione</option>{['Pescoço','Ombro / braço','Costas','Quadril','Joelho','Tornozelo / pé','Desconforto geral','Prefiro conversar com meu treinador'].map(value=><option key={value}>{value}</option>)}</select><button className={primary} disabled={busy || !region} onClick={()=>void saveRegion()}>Continuar</button></div>}
    {stage==='review' && <div className="space-y-3"><h3 className="font-bold">Vamos revisar seu treino primeiro</h3><p className="text-sm text-muted-foreground">Há desconforto ou restrições cadastradas. O acervo ainda não possui contraindicações suficientes para adaptar uma nova sessão automaticamente. Use Ajuste de Treino ou converse com seu profissional.</p><button className={primary} onClick={()=>go('/9fit/ajuste-treino')}>Revisar treino com FitCopilot</button><button className={field} onClick={()=>go('/9fit/staff')}>Falar com um profissional</button></div>}
    {stage==='choice' && <div className="space-y-3"><h3 className="font-bold">{ongoing?'Você tem uma sessão em andamento.':'Você já tem um planejamento.'}</h3>{plan && <p className="text-sm">{plan.name}{plan.phase?` · Fase ${plan.phase}`:''}</p>}<button className={primary} onClick={()=>go('/9fit/train')}>{ongoing?'Retomar meu treino':'Seguir meu treino previsto'}</button>{!ongoing && <button className={field} onClick={()=>setStage('questions')}>Montar uma sessão rápida separada</button>}<p className="text-xs text-muted-foreground">Seu planejamento não será substituído.</p></div>}
    {stage==='questions' && <div className="space-y-3"><p className="text-xs text-muted-foreground">Pergunta {step+1} de 3</p>{step>0 && <button className="text-xs text-primary" disabled={busy} onClick={()=>setStep(value=>value-1)}>Voltar</button>}<h3 className="font-display text-lg">{['O que você quer fazer agora?','Quanto tempo tem disponível?','Quais recursos você tem aí?'][step]}</h3>
      {step===0 && goals.map(item=><button key={item.value} className={field} onClick={()=>{setGoal(item.value);setStep(1);}}>{item.label}</button>)}
      {step===1 && [15,30,45,60].map(value=><button key={value} className={field} onClick={()=>{setMinutes(value);setStep(2);}}>{value} minutos</button>)}
      {step===2 && <>{resources.map(item=><label key={item.value} className={`${field} flex gap-3`}><input type="checkbox" checked={equipment.includes(item.value)} disabled={busy} onChange={()=>setEquipment(values=>values.includes(item.value)?values.filter(value=>value!==item.value):[...values,item.value])} />{item.label}</label>)}<p className="text-xs text-muted-foreground">Pode selecionar halteres e elásticos juntos. Ar livre não pressupõe equipamento.</p><button className={primary} disabled={busy || !equipment.length} onClick={()=>void generate()}>{busy?'Montando sessão compatível…':'Montar meu treino'}</button></>}
    </div>}
    {stage==='result' && result && <div className="space-y-4"><div><h3 className="font-bold text-lg">Seu treino rápido</h3><p className="text-xs text-muted-foreground">{result.exercises.length} exercícios · cerca de {result.estimated_duration_min} min · inclui {result.preparation_minutes} min de preparação</p><p className="text-xs text-muted-foreground">Volume ajustado por experiência e energia. Seu histórico recente participa da seleção. A duração é uma estimativa.</p></div>
      {result.exercises.map((item,index)=><article key={item.id} className="rounded-xl border border-white/10 p-3"><h4 className="font-semibold">{index+1}. {item.name}</h4><p className="text-xs text-muted-foreground">{item.sets} × {item.reps_range} · descanso {item.rest_seconds} s</p><button className="mt-2 text-xs text-primary" onClick={()=>setExpanded(expanded===item.id?null:item.id)}>{expanded===item.id?'Ocultar execução':'Como executar'}</button>{expanded===item.id && <div className="mt-3 space-y-2">{(item.video_url || item.gif_url)?<ExerciseVideoPlayer key={item.id} exerciseId={item.id} exerciseName={item.name} className="h-48 w-full" />:<p className="text-xs">Este exercício não possui vídeo disponível. Consulte a instrução abaixo.</p>}<p className="text-xs whitespace-pre-wrap">{item.instructions || item.description || 'Peça orientação ao seu profissional para executar este movimento.'}</p></div>}</article>)}
      <button className={primary} disabled={busy} onClick={()=>void start()}><Play className="inline h-4 w-4" /> {busy?'Iniciando…':'Iniciar treino guiado'}</button>
      <div className="space-y-3 border-t border-white/10 pt-4"><h3 className="font-bold">Conteúdo complementar · opcional</h3>{contentStatus && <p className="text-xs text-muted-foreground">{contentStatus}</p>}{([{kind:'protocol',label:'Protocolos relacionados'},{kind:'learn',label:'Aprenda mais · cursos e aulas'},{kind:'ebook',label:'Leitura complementar · ebooks'}] as const).map(section=>{const items=content.filter(item=>item.kind===section.kind);return <section key={section.kind} className="rounded-xl bg-white/5 p-3"><h4 className="font-semibold text-sm">{section.label}</h4>{items[0]?<><p className="mt-2 text-sm">{items[0].title}</p><p className="text-xs text-muted-foreground">{items[0].description}</p>{items[0].url && <a className="mt-2 block text-xs text-primary" href={items[0].url} target="_blank" rel="noreferrer">Abrir na biblioteca →</a>}{items[0].locked && <p className="text-xs">A biblioteca informa acesso restrito para este conteúdo.</p>}{items.length>1 && <details className="mt-2 text-xs"><summary>Ver mais ({items.length-1})</summary>{items.slice(1).map(item=><p className="mt-2" key={item.id}>{item.url?<a href={item.url} target="_blank" rel="noreferrer">{item.title} →</a>:item.title}</p>)}</details>}</>:!contentStatus && <p className="mt-2 text-xs text-muted-foreground">Nenhum conteúdo relacionado encontrado neste campo.</p>}</section>;})}<p className="text-xs text-muted-foreground">Sugestões relacionadas ao objetivo; metadados incompletos não comprovam adequação individual. Acesso conforme a biblioteca.</p></div>
    </div>}
  </div></div>;
}
