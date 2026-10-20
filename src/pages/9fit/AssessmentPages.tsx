import { useLocation, useParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssessmentDetailView, AssessmentWorkspace } from '@/components/progress/AssessmentWorkspace';
import { useAthleteId } from '@/hooks/useAthleteId';

export default function NineFitAssessmentPages() {
 const {id}=useParams();const {pathname}=useLocation();const {athleteId,loading,error}=useAthleteId();
 const last=pathname.split('/').filter(Boolean).at(-1);
 const view=['capacidades','historico','meta','reavaliacao','fontes'].includes(last||'')?last as 'capacidades'|'historico'|'meta'|'reavaliacao'|'fontes':'resumo';
 return <main className="min-h-screen bg-background px-4 pt-6 pb-32 text-foreground"><div className="mx-auto max-w-5xl">{loading?<p role="status" className="py-12 text-center text-sm text-muted-foreground">Localizando seu perfil de atleta…</p>:!athleteId?<div role="alert" className="rounded-2xl border border-border p-6"><h1 className="text-xl font-bold">Perfil de atleta não encontrado</h1><p className="mt-2 text-sm text-muted-foreground">{error||'Entre novamente ou procure seu professor para vincular seu perfil.'}</p></div>:id?<AssessmentDetailView athleteId={athleteId} assessmentId={id} section={['cardio','composicao','1rm'].includes(last||'')?last:'detalhe'}/>:<AssessmentWorkspace athleteId={athleteId} initialView={view}/>}</div><BottomNavigation/></main>;
}
