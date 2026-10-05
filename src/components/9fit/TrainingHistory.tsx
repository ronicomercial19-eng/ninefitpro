import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { isPreviousPrescription } from '@/services/athleteCardRules';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Tables } from '@/integrations/supabase/types';

export function TrainingHistory(){
  const {athleteId}=useAthleteId();const request=useRef(0);
  const [previous,setPrevious]=useState<Tables<'student_training_assignments'>[]>([]),[sessions,setSessions]=useState<Tables<'workout_executions'>[]>([]);
  const [limit,setLimit]=useState(20),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
  const [selected,setSelected]=useState<Tables<'workout_executions'>|null>(null),[sets,setSets]=useState<Tables<'workout_exercise_sets'>[]>([]),[detailsLoading,setDetailsLoading]=useState(false),[detailsError,setDetailsError]=useState(false);
  const [prescription,setPrescription]=useState<Tables<'student_training_assignments'>|null>(null);
  useEffect(()=>{setSelected(null);setPrescription(null);setSets([]);setPrevious([]);setSessions([]);setLimit(20);},[athleteId]);
  const refresh=useCallback(async()=>{
    const version=++request.current;if(!athleteId){setLoading(false);return;}
    const [p,e]=await Promise.all([
      supabase.from('student_training_assignments').select('*').eq('student_id',athleteId).order('start_date',{ascending:false}),
      supabase.from('workout_executions').select('*').eq('athlete_id',athleteId).eq('status','completed').order('workout_date',{ascending:false}).order('started_at',{ascending:false}).limit(limit+1),
    ]);
    if(version!==request.current)return;setLoading(false);setFailed(!!(p.error||e.error));if(p.error||e.error)return;
    setPrevious((p.data??[]).filter(row=>isPreviousPrescription(row,format(new Date(),'yyyy-MM-dd'))));setHasMore((e.data??[]).length>limit);setSessions((e.data??[]).slice(0,limit));
  },[athleteId,limit]);
  useEffect(()=>{setLoading(true);void refresh();window.addEventListener('9fit:workout-updated',refresh);const ch=athleteId?supabase.channel(`history-${athleteId}`).on('postgres_changes',{event:'*',schema:'public',table:'workout_executions',filter:`athlete_id=eq.${athleteId}`},refresh).on('postgres_changes',{event:'*',schema:'public',table:'student_training_assignments',filter:`student_id=eq.${athleteId}`},refresh).subscribe():null;return()=>{request.current++;window.removeEventListener('9fit:workout-updated',refresh);if(ch)void supabase.removeChannel(ch);};},[refresh,athleteId]);
  useEffect(()=>{let active=true;setSets([]);setDetailsError(false);if(!selected)return;setDetailsLoading(true);supabase.from('workout_exercise_sets').select('*').eq('execution_id',selected.id).order('exercise_order').order('set_number').then(({data,error})=>{if(!active)return;setSets(data??[]);setDetailsError(!!error);setDetailsLoading(false);});return()=>{active=false;};},[selected]);
  if(loading)return <p className="text-sm text-muted-foreground">Carregando treinos anteriores e histórico…</p>;
  if(failed)return <div role="alert"><p className="text-sm">Não foi possível carregar o histórico.</p><button className="text-primary text-sm" onClick={()=>void refresh()}>Tentar novamente</button></div>;
  const rowStyle='w-full rounded-xl border border-white/10 bg-[#0c0d10] p-4 text-left hover:border-primary/40';
  return <div className="space-y-6">
    <section className="space-y-2"><h3 className="text-xs font-semibold uppercase tracking-widest">Treinos anteriores · {previous.length} prescrições</h3>{previous.length===0?<p className="text-sm text-muted-foreground">Nenhuma prescrição anterior disponível.</p>:previous.map(p=><button key={p.id} className={rowStyle} onClick={()=>setPrescription(p)}><strong className="block text-sm">{p.training_name}</strong><span className="text-xs text-muted-foreground">{p.start_date.split('-').reverse().join('/')} {p.end_date&&`até ${p.end_date.split('-').reverse().join('/')}`} · Consultar prescrição</span></button>)}</section>
    <section className="space-y-2"><h3 className="text-xs font-semibold uppercase tracking-widest">Histórico dos treinos feitos</h3>{sessions.length===0?<p className="text-sm text-muted-foreground">As sessões concluídas aparecerão aqui.</p>:sessions.map(s=><button key={s.id} className={rowStyle} onClick={()=>setSelected(s)}><strong className="block text-sm">{s.phase_name || 'Treino concluído'}</strong><span className="text-xs text-muted-foreground">{s.workout_date.split('-').reverse().join('/')} · {s.duration_minutes===null?'Duração não registrada':`${s.duration_minutes} min`}{s.total_volume_kg!==null&&` · ${s.total_volume_kg} kg de volume`}</span></button>)}{hasMore&&<button className="text-sm text-primary" onClick={()=>setLimit(n=>n+20)}>Carregar mais sessões</button>}</section>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Treino realizado · {selected?.workout_date.split('-').reverse().join('/')}</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">Dados registrados nesta execução; alterações no plano atual não mudam estas séries.</p>{detailsLoading?<p>Carregando séries…</p>:detailsError?<p role="alert">Não foi possível carregar as séries. Feche e tente novamente.</p>:sets.length===0?<p>Esta sessão não possui séries registradas.</p>:sets.map(s=><div key={s.id} className="rounded-lg border border-white/10 p-3 text-sm"><strong>{s.exercise_name} · série {s.set_number}</strong><p className="text-xs text-muted-foreground">{s.completed?'Concluída':'Não concluída'} · {s.actual_reps??'—'} repetições · {s.actual_weight??'—'} kg{s.tempo&&` · cadência ${s.tempo}`}</p></div>)}</DialogContent></Dialog>
    <Dialog open={!!prescription} onOpenChange={open=>{if(!open)setPrescription(null);}}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{prescription?.training_name}</DialogTitle></DialogHeader><p className="text-sm">{prescription?.training_description || 'Prescrição anterior'}</p>{Array.isArray((prescription?.training_data as any)?.exercises)?(prescription?.training_data as any).exercises.map((e:any,i:number)=><div key={i} className="rounded-lg border border-white/10 p-3 text-sm"><strong>{e.name||e.nome||'Exercício'}</strong><p>{e.sets??e.series??'—'} × {e.reps??'—'} · descanso {e.rest_seconds??'—'} s</p></div>):<p className="text-xs text-muted-foreground">Esta prescrição não possui exercícios estruturados para visualização.</p>}{prescription?.html_file_url&&/^https:\/\//i.test(prescription.html_file_url)&&<a href={prescription.html_file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm">Consultar documento original</a>}</DialogContent></Dialog>
  </div>;
}
