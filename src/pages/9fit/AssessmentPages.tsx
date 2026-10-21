import { useLocation, useParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssessmentDetailView, AssessmentWorkspace } from '@/components/progress/AssessmentWorkspace';
import { useAthleteId } from '@/hooks/useAthleteId';

export default function NineFitAssessmentPages() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { athleteId, loading, error } = useAthleteId();
  const last = pathname.split('/').filter(Boolean).at(-1);
  const view = last === 'recordes' ? 'historico' : ['capacidades', 'historico', 'meta', 'reavaliacao', 'fontes'].includes(last || '') ? last as 'capacidades' | 'historico' | 'meta' | 'reavaliacao' | 'fontes' : 'resumo';
  return <main className="assessment-page min-h-screen px-4 pt-6 pb-32"><div className="mx-auto max-w-3xl">
    {loading ? <p role="status" className="py-12 text-center">Localizando seu perfil…</p> : !athleteId ? <div role="alert" className="rounded-2xl border border-border p-6"><h1 className="text-xl font-bold">Perfil de atleta não encontrado</h1><p className="mt-2 text-sm">{error || 'Entre novamente para acessar suas avaliações.'}</p></div> : id ? <AssessmentDetailView athleteId={athleteId} assessmentId={id} section={['cardio', 'composicao', '1rm'].includes(last || '') ? last : 'detalhe'} /> : <AssessmentWorkspace athleteId={athleteId} initialView={view} />}
  </div><BottomNavigation /></main>;
}
