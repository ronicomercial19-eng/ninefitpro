import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestRonChat } from '@/services/ronChat';
import { ASSISTANCE_LEVELS } from '@/hooks/useWorkoutAssistance';

type Props={level:number;onLevelChange:(level:number)=>void;trainingName:string;exercise:{name?:string;sets?:number;reps?:string|number;rest_seconds?:number;tempo?:string;notes?:string};completedSets:boolean[];weight:number|null;actualReps:number|null;executionId:string|null;onPain:()=>void;onReviewed:()=>void;paused:boolean};
export function WorkoutRonAssistance({level,onLevelChange,trainingName,exercise,completedSets,weight,actualReps,executionId,onPain,onReviewed,paused}:Props){
  const navigate=useNavigate();const [reply,setReply]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const request=useRef(0),inFlight=useRef(false);
  useEffect(()=>{request.current++;setReply('');setError('');setBusy(false);inFlight.current=false;return()=>{request.current++;};},[executionId,exercise.name]);
  async function ask(question:string){
    if(inFlight.current)return;const version=++request.current;inFlight.current=true;setBusy(true);setError('');
    const context={execution_id:executionId,training:trainingName,exercise:exercise.name,sets:exercise.sets,planned_reps:exercise.reps,actual_reps:actualReps,rest_seconds:exercise.rest_seconds,tempo:exercise.tempo || null,notes:exercise.notes || null,sets_completed:completedSets.filter(Boolean).length,actual_weight:weight,paused};
    try{const data=await requestRonChat(`${question}\nContexto da execução atual: ${JSON.stringify(context)}\nUse estes dados. Não invente cadência, carga, repetições ou capacidade clínica. Explique a prescrição; alterações devem seguir revisão do treino.`,[]);if(version===request.current)setReply(data.content);}catch(e){if(version===request.current)setError(e instanceof Error?e.message:'RON indisponível. Tente novamente.');}finally{if(version===request.current){setBusy(false);inFlight.current=false;}}
  }
  const style='rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary disabled:opacity-50';
  return <section className="space-y-3 rounded-xl border border-primary/25 bg-[#101116] p-4" aria-label="Assistência durante o treino">
    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Assistência · RON</h3><select aria-label="Modo de assistência" className="rounded-lg border border-border bg-card p-2 text-xs" value={level} onChange={e=>onLevelChange(Number(e.target.value))}>{ASSISTANCE_LEVELS.map((item,i)=><option key={item.label} value={i}>{item.label}</option>)}</select></div>
    {level>0&&<p className="text-sm leading-relaxed">{exercise.name} · {completedSets.filter(Boolean).length}/{exercise.sets??'—'} séries registradas. {exercise.reps?`${exercise.reps} repetições prescritas. `:''}{exercise.rest_seconds?`Descanso: ${exercise.rest_seconds}s. `:'Descanso não informado. '}{exercise.tempo?`Cadência prescrita: ${exercise.tempo}.`:'Cadência não informada na prescrição.'}</p>}
    {level===2&&<p className="text-xs text-muted-foreground">Informe a dificuldade para receber uma orientação contextual. O RON não altera sua prescrição automaticamente.</p>}
    <div className="flex flex-wrap gap-2"><button className={style} disabled={busy} onClick={()=>void ask('Como executar este exercício de acordo com a prescrição?')}>Como executar?</button>{level>0&&<button className={style} disabled={busy} onClick={()=>void ask('Explique a cadência e o descanso prescritos para esta série.')}>Cadência e descanso</button>}{level===2&&<button className={style} disabled={busy} onClick={()=>void ask('Esta série está difícil. Ajude a avaliar a dificuldade e a preparar uma revisão, sem modificar a prescrição.')}>Está difícil</button>}<button className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs text-rose-300" onClick={onPain}>Senti dor · pausar</button></div>
    {busy&&<p role="status" className="text-xs">RON está analisando o exercício atual…</p>}{error&&<p role="alert" className="text-xs text-rose-300">{error}</p>}{reply&&<p className="whitespace-pre-wrap text-sm leading-relaxed">{reply}</p>}
    {paused&&<div role="alert" className="space-y-2"><p className="text-sm">Registro de séries pausado após relato de dor. Abra a revisão do treino ou procure apoio profissional.</p><button className={style} onClick={()=>navigate('/9fit/ajuste-treino?source=workout_pain')}>Revisar treino</button><button className={style} onClick={()=>navigate('/9fit/native-system?app=staff')}>Apoio profissional</button><button className={style} onClick={onReviewed}>Já revisei · retomar registro</button></div>}
  </section>;
}
