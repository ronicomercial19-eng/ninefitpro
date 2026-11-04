import {lazy,Suspense} from "react";
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useSearchParams} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {supabase} from '@/integrations/supabase/client';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {StudentPersonalData} from './tabs/StudentPersonalData';
import {StudentTraining} from './tabs/StudentTraining';
import {StudentDiet} from './tabs/StudentDiet';
import {StudentHistory} from './tabs/StudentHistory';
import {StudentMeasurements} from './tabs/StudentMeasurements';
import {StudentAnamnesis} from './tabs/StudentAnamnesis';
import {StudentPhotos} from './tabs/StudentPhotos';
import {StudentPayments} from './tabs/StudentPayments';
import {CoachStudentPanel} from './CoachStudentPanel';
import {useCoachStudentContext} from '@/hooks/useCoachStudentContext';
import {Button} from '@/components/ui/button';
const PosturaPro = lazy(() => import("@/pages/admin/PosturaProPage"));
const sections=[['dados-pessoais','Dados'],['treino','Treino'],['dieta','Dieta'],['historico','Histórico'],['medidas','Medidas'],['anamneses','Anamneses'],['fotos','Fotos'],['postura-pro','Postura Pro'],['mensalidade','Mensalidade']];
export function SelectedStudentFile({athleteId}:{athleteId:string}){
 const {user}=useAuth(),qc=useQueryClient(),[params,setParams]=useSearchParams();
 const context=useCoachStudentContext(athleteId);
 const query=useQuery({queryKey:['coach-athlete-file',user?.id,athleteId],queryFn:async()=>{const {data,error}=await supabase.from('athletes').select('*').eq('id',athleteId).single();if(error)throw error;return data;}});
 if(query.isPending)return <p role="status">Carregando ficha do aluno…</p>;
 if(query.isError||!query.data)return <div role="alert"><p>Não foi possível carregar a ficha deste aluno.</p><Button onClick={()=>void query.refetch()}>Tentar novamente</Button></div>;
 const a=query.data,student={id:a.id,nome:a.name,email:a.email||'',objetivo:a.primary_goal||a.objetivo||'',telefone:a.phone||undefined,data_nascimento:a.birthdate||undefined,nivel_experiencia:a.experience_level||undefined,observacoes:a.injuries_limitations||undefined,peso_kg:a.peso_kg||undefined,altura_cm:a.altura_cm||undefined};
 const selected=sections.some(([key])=>key===params.get('tab'))?params.get('tab')!:'dados-pessoais';
 const updated=()=>{void qc.invalidateQueries({queryKey:['coach-athlete-file',user?.id,athleteId]});void qc.invalidateQueries({queryKey:['coach-student-context']});};
 return <section className="space-y-4" aria-label={`Ficha de ${a.name}`}><h2 className="text-xl font-semibold">Ficha de {a.name}</h2><Tabs value={selected} onValueChange={tab=>{const next=new URLSearchParams(params);next.set('tab',tab);setParams(next,{replace:true});}}>
 <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1">{sections.map(([key,label])=><TabsTrigger key={key} value={key} className="min-h-11 shrink-0">{label}</TabsTrigger>)}</TabsList>
 <TabsContent value="dados-pessoais"><StudentPersonalData student={student} onStudentUpdate={updated}/></TabsContent>
 <TabsContent value="treino"><StudentTraining student={student} onStudentUpdate={updated}/></TabsContent>
 <TabsContent value="dieta"><StudentDiet student={student}/></TabsContent>
 <TabsContent value="historico"><div className="space-y-5"><StudentHistory studentId={athleteId}/><CoachStudentPanel athleteId={athleteId}/></div></TabsContent>
 <TabsContent value="medidas"><StudentMeasurements studentId={athleteId}/></TabsContent>
 <TabsContent value="anamneses"><div className="space-y-4">{context.data&&<section className="rounded-xl border bg-card p-4"><h3 className="font-semibold">PDI informado pelo aluno</h3><dl className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(context.data.daily_context.profile.declared).map(([key,value])=><div key={key}><dt className="text-xs text-muted-foreground">{key}</dt><dd className="text-sm">{Array.isArray(value)?value.join(', '):String(value??'Não informado')}</dd></div>)}</dl></section>}<StudentAnamnesis studentId={athleteId}/></div></TabsContent>
 <TabsContent value="postura-pro"><Suspense fallback={<p>Carregando Postura Pro…</p>}><PosturaPro studentId={athleteId} /></Suspense></TabsContent>
 <TabsContent value="fotos"><StudentPhotos studentId={athleteId}/></TabsContent>
 <TabsContent value="mensalidade"><StudentPayments student={student} onStudentUpdate={updated}/></TabsContent>
 </Tabs></section>;
}
