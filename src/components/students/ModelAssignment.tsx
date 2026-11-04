import {useEffect,useMemo,useRef,useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useProfessorWorkspace,type CoachStudent} from '@/contexts/ProfessorWorkspace';
import {useCoachStudentContext} from '@/hooks/useCoachStudentContext';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {businessDate} from '@/services/dailyContextRules';
import {extractModelDays,personalizedModelHtml,type ModelDay,type CatalogExercise} from '@/lib/templatePreparation';
import {validatePrescriptionExercises} from '../../../supabase/functions/_shared/professorContract';
import {toast} from 'sonner';
export type DeliverableModel={id:string;name:string;status:string;source_html:string|null;prescription_schema?:any;updated_at:string};
export function ModelAssignment({model}:{model:DeliverableModel}){
 const w=useProfessorWorkspace(),{user}=useAuth(),qc=useQueryClient();
 const [athleteId,setAthleteId]=useState(w.athleteId||''),[search,setSearch]=useState(''),[originalName,setOriginalName]=useState('');
 const [days,setDays]=useState<ModelDay[]>([]),[day,setDay]=useState(0),[date,setDate]=useState(businessDate()),[saving,setSaving]=useState(false),[replace,setReplace]=useState(false);
 const guard=useRef(false),attempt=useRef<{signature:string;id:string}|null>(null);
 const roster=useQuery({queryKey:['model-students',user?.id,search,athleteId],queryFn:async()=>{const {data,error}=await supabase.rpc('fn_coach_students_page' as any,{p_search:search,p_limit:100,p_offset:0,p_selected_id:athleteId||null});if(error)throw error;return data as unknown as {students:CoachStudent[];selected:CoachStudent|null};}});
 const context=useCoachStudentContext(athleteId||null);
 const catalog=useQuery({queryKey:['model-exercise-catalog'],queryFn:async()=>{const all:CatalogExercise[]=[];for(let offset=0;offset<20000;offset+=1000){const {data,error}=await supabase.from('exercises').select('id,name').order('id').range(offset,offset+999);if(error)throw error;all.push(...(data||[]));if((data?.length||0)<1000)break;}return all;}});
 useEffect(()=>{if(catalog.data)setDays(extractModelDays(model.source_html||'',model.prescription_schema,catalog.data));setDay(0);attempt.current=null;},[model.id,model.updated_at,catalog.data]);
 const session=useQuery({queryKey:['model-target-session',athleteId,date],enabled:!!athleteId,queryFn:async()=>{const {data,error}=await supabase.from('daily_workouts').select('updated_at,created_at,day_name').eq('athlete_id',athleteId).eq('workout_date',date).order('created_at',{ascending:false}).limit(1).maybeSingle();if(error)throw error;return data;}});
 useEffect(()=>setReplace(false),[athleteId,date]);
 const pdi=context.data?.daily_context.profile;
 const variables=useMemo(()=>({athlete_name:context.data?.athlete.name||'Selecione o aluno',goal:context.data?.athlete.goal||String(pdi?.declared.goal||'Não informado'),pdi:pdi?Object.entries(pdi.declared).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):String(v)}`).join(' · '):'Ficha PDI aguardando carregamento',protocol_blocks:days[day]?.exercises.map(e=>`${e.name}: ${e.sets} × ${e.reps_range}, descanso ${e.rest_seconds}s`).join(' · ')||'Prescrição aguardando revisão'}),[context.data,days,day]);
 const preview=useMemo(()=>personalizedModelHtml(model.source_html||'<h1>{{athlete_name}}</h1><p>{{protocol_blocks}}</p>',variables,originalName),[model.source_html,variables,originalName]);
 function patch(i:number,value:Record<string,any>){setDays(old=>old.map((d,n)=>n===day?{...d,exercises:d.exercises.map((e,j)=>j===i?{...e,...value}:e)}:d));}
 async function assign(){
  if(guard.current||!context.data||context.data.athlete.id!==athleteId)return;
  let exercises;try{exercises=validatePrescriptionExercises(days[day]?.exercises,new Set(catalog.data?.map(e=>e.id)));}catch(e){toast.error((e as Error).message);return;}
  if(session.data&&!replace){toast.error('Confirme a substituição da sessão existente.');return;}
  const schedule=[{date,title:days[day].label,exercises,expected_updated_at:session.data?.updated_at||session.data?.created_at||null}];
  const signature=JSON.stringify([athleteId,model.id,model.updated_at,schedule,preview]);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID()};
  guard.current=true;setSaving(true);
  try{const {data,error}=await supabase.rpc('fn_professor_assign_model' as any,{p_template_id:model.id,p_athlete_id:athleteId,p_schedule:schedule,p_html:preview,p_expected_template_update:model.updated_at,p_request_id:attempt.current.id});
   if(error||!(data as any)?.saved)throw error||new Error('Atribuição não confirmada');
   toast.success(`Modelo atribuído a ${context.data.athlete.name}. Treino de ${date} publicado no Train.`);
   void qc.invalidateQueries({queryKey:['coach-student-context']});void qc.invalidateQueries({queryKey:['model-target-session']});window.dispatchEvent(new Event('9fit:workout-updated'));
  }catch(e){const text=(e as Error).message;toast.error(text.includes('workout_already_started')?'Essa sessão já foi iniciada. Escolha uma data futura.':text.includes('prescription_changed')?'A sessão mudou. Atualize a prévia antes de substituir.':text.includes('template_changed')?'O modelo mudou. Atualize a biblioteca.':text);}
  finally{guard.current=false;setSaving(false);}
 }
 return <section className="space-y-4" aria-label="Personalizar e atribuir modelo">
 <fieldset disabled={saving} className="contents"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Buscar aluno<input className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome ou e-mail" /></label><label className="text-sm">Aluno do modelo<select aria-label="Aluno do modelo" className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={athleteId} onChange={e=>setAthleteId(e.target.value)}><option value="">Escolha um aluno</option>{[...(roster.data?.selected&&!roster.data.students.some(row=>row.id===roster.data?.selected?.id)?[roster.data.selected]:[]),...(roster.data?.students||[])].map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
 {(context.isError||catalog.isError||roster.isError||session.isError)&&<p role="alert" className="text-sm text-destructive">Não foi possível confirmar os dados para a atribuição. Atualize a biblioteca.</p>}
 <label className="block text-sm">Nome original no HTML, se houver<input className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={originalName} onChange={e=>setOriginalName(e.target.value)} placeholder="Ex.: Fernando — substituir pelo aluno escolhido" /></label>
 <iframe sandbox="" srcDoc={preview} title={`Prévia personalizada: ${model.name}`} className="h-[420px] w-full rounded-xl border bg-white" />
 <p className="text-sm text-muted-foreground">A prévia usa nome e PDI do aluno. Confira as orientações e revise a dose de cada exercício antes de atribuir.</p>
 {catalog.isPending?<p>Carregando exercícios…</p>:!days.length?<p role="status">O HTML não contém exercícios identificáveis. Estruture a prescrição no editor antes de atribuir ao Train.</p>:<><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Treino do modelo<select className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" value={day} onChange={e=>setDay(Number(e.target.value))}>{days.map((d,i)=><option key={i} value={i}>{d.label}</option>)}</select></label><label className="text-sm">Dia de execução<input aria-label="Dia de execução" type="date" min={businessDate()} value={date} onChange={e=>setDate(e.target.value)} className="mt-1 min-h-11 w-full rounded-lg border bg-background p-2" /></label></div>
 {days[day]?.exercises.map((e,i)=><div key={i} className="rounded-xl border p-3 space-y-2"><p className="text-sm">{i+1}. {e.name}</p><select aria-label={`Exercício ${i+1} do modelo`} className="min-h-11 w-full rounded-lg border bg-background p-2 text-sm" value={e.exercise_id} onChange={event=>patch(i,{exercise_id:event.target.value,name:catalog.data?.find(x=>x.id===event.target.value)?.name||e.name})}><option value="">Associar ao exercício do catálogo</option>{catalog.data?.map(ex=><option key={ex.id} value={ex.id}>{ex.name}</option>)}</select><div className="grid grid-cols-3 gap-2"><label className="text-xs">Séries<input type="number" min={1} max={10} value={e.sets} onChange={event=>patch(i,{sets:Number(event.target.value)})} className="mt-1 w-full rounded border bg-background p-2" /></label><label className="text-xs">Repetições/dose<input value={e.reps_range} onChange={event=>patch(i,{reps_range:event.target.value})} className="mt-1 w-full rounded border bg-background p-2" /></label><label className="text-xs">Descanso (s)<input type="number" min={0} max={600} value={e.rest_seconds} onChange={event=>patch(i,{rest_seconds:Number(event.target.value)})} className="mt-1 w-full rounded border bg-background p-2" /></label></div></div>)}
 {session.data&&<label className="flex gap-2 text-sm"><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)} />Substituir a sessão “{session.data.day_name}” de {date}. A versão anterior ficará no histórico.</label>}
 <Button disabled={saving||!athleteId||model.status!=='approved'||!context.data||context.isError||session.isPending||session.isError||catalog.isError||(!!session.data&&!replace)} onClick={()=>void assign()}>{saving?'Atribuindo…':'Confirmar revisão e atribuir ao aluno'}</Button>
 </>}
 </fieldset></section>;
}
