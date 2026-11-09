import { useLocation, useParams } from 'react-router-dom';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssessmentDetailView, AssessmentWorkspace } from '@/components/progress/AssessmentWorkspace';
import { useAthleteId } from '@/hooks/useAthleteId';
import { StudentSectionHeader } from '@/components/9fit/StudentSectionHeader';

export default function NineFitAssessmentPages() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { athleteId, loading, error } = useAthleteId();
  const last = pathname.split('/').filter(Boolean).at(-1);
  const view = last === 'recordes' ? 'historico' : ['capacidades', 'historico', 'meta', 'reavaliacao', 'fontes'].includes(last || '') ? last as 'capacidades' | 'historico' | 'meta' | 'reavaliacao' | 'fontes' : 'resumo';
  return <main className="fitpro-orange assessment-page min-h-screen pb-32"><StudentSectionHeader kicker="9FIT // EVOLUÇÃO" title="Seu progresso" description="Métricas, avaliações e sinais da sua evolução" /><div className="mx-auto max-w-3xl px-4 pt-4">
    {loading ? <p role="status" className="py-12 text-center">Localizando seu perfil…</p> : !athleteId ? <div role="alert" className="rounded-2xl border border-border p-6"><h1 className="text-xl font-bold">Perfil de atleta não encontrado</h1><p className="mt-2 text-sm">{error || 'Entre novamente para acessar suas avaliações.'}</p></div> : id ? <AssessmentDetailView athleteId={athleteId} assessmentId={id} section={['cardio', 'composicao', '1rm'].includes(last || '') ? last : 'detalhe'} /> : <AssessmentWorkspace athleteId={athleteId} initialView={view} />}
  </div><BottomNavigation /></main>;
}
