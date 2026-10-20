import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AchievementShareSheet, type Achievement } from '@/components/9fit/AchievementShareSheet';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useAthleteScores } from '@/hooks/useAthleteScores';
import { useActivitySummary } from '@/hooks/useActivitySummary';
import { loadProgressScreen } from '@/services/activitySummary';
import { Loader2, Activity, Trophy, Dumbbell, Calendar, ClipboardCheck, Share2, ArrowRight } from 'lucide-react';


export default function NineFitCompartilhar() {
  const { athleteId, athleteName, loading: athleteLoading, error: athleteError } = useAthleteId();
  const scores = useAthleteScores(athleteId);
  const activity = useActivitySummary();
  const client = useQueryClient();
  const progress = useQuery({ queryKey: ['progress-screen', athleteId], queryFn: () => loadProgressScreen(athleteId!), enabled: !!athleteId });
  const [params] = useSearchParams();
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ['progress-screen', athleteId] }); setAchievement(null); };
    const events = ['9fit:workout-updated', '9fit:profile-updated', '9fit:sync_updated'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, [client, athleteId]);
  const name = athleteName || 'Atleta';
  const screen = progress.data as { recordes_recentes?: { exercicio: string; valor: number; unidade: string; data: string }[]; avaliacao_atual?: { score_atual?: number | null; data?: string | null } } | null;
  const record = screen?.recordes_recentes?.[0];
  const loading = athleteLoading || !!athleteId && (activity.isPending || progress.isPending || scores.loading);
  const error = athleteError || activity.isError || progress.isError || scores.error;
  const score = scores.status === 'available' ? scores.data?.sync.value : null;
  useEffect(() => {
    if (!loading && !error && params.get('template') === 'id_card') setAchievement({ contentType: 'id_card', kicker: 'MEU PERFIL', title: 'Meu perfil 9FIT', subtitle: name });
  }, [loading, error, params, name]);
  const templates = [
    { type: 'sync_score', label: 'Índice de rotina (SYNC)', value: score == null ? null : `${score}%`, subtitle: 'Percepção e cobertura de registros; não é avaliação fisiológica.' },
    { type: 'personal_record', label: 'Último recorde registrado', value: record ? `${record.exercicio} · ${record.valor} ${record.unidade || ''}` : null, subtitle: record ? `Registro de ${record.data}` : 'Nenhum recorde confirmado no Histórico.' },
    { type: 'workout_completed', label: 'Treinos concluídos', value: activity.data?.total ? `${activity.data.total} treinos concluídos` : null, subtitle: 'Total de sessões com conclusão registrada.' },
    { type: 'weekly_recap', label: 'Resumo semanal', value: activity.data?.week ? `${activity.data.week} treinos nesta semana` : null, subtitle: 'Sessões concluídas de segunda-feira até hoje.' },
    { type: 'assessment_completed', label: 'Última avaliação', value: screen?.avaliacao_atual?.score_atual == null ? null : `${screen.avaliacao_atual.score_atual}`, subtitle: screen?.avaliacao_atual?.data || 'Nenhuma avaliação confirmada.' },
  ] as const;
  return <div className="min-h-screen bg-background pb-28 p-5">
    <h1 className="text-3xl font-display">Compartilhar meu progresso</h1><p className="mt-2 text-sm text-muted-foreground">Os mesmos registros usados no Histórico. Cards sem dados confirmados ficam indisponíveis.</p>
    {loading ? <Loader2 className="mt-8 animate-spin" /> : error ? <div role="alert" className="mt-6"><p>Não foi possível confirmar seus dados para compartilhar.</p><button onClick={() => { void activity.refetch(); void progress.refetch(); void scores.refresh(); }}>Tentar novamente</button></div> : <>
      <div className="mt-6 rounded-xl border border-white/10 p-4"><p>{name}</p><p className="text-sm text-muted-foreground">SYNC: {score == null ? 'Sem leitura atual' : `${score}%`} · {activity.data?.total ?? 0} treinos concluídos</p></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {templates.map(template => {
          const Icon = {
            sync_score: Activity,
            personal_record: Trophy,
            workout_completed: Dumbbell,
            weekly_recap: Calendar,
            assessment_completed: ClipboardCheck
          }[template.type] || Share2;

          return (
            <button 
              key={template.type} 
              type="button" 
              disabled={template.value === null} 
              onClick={() => setAchievement({ contentType: template.type, kicker: 'MEU PROGRESSO', title: template.label, value: template.value!, subtitle: `${template.subtitle} · ${name}` })} 
              className="group relative overflow-hidden rounded-2xl bg-card p-6 text-left border border-white/5 hover:border-primary/50 transition-all hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] disabled:opacity-50 disabled:hover:border-white/5 disabled:hover:shadow-none"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10 text-primary">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-foreground/90">{template.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{template.subtitle.split('·')[0]}</p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-2xl font-black text-primary font-display tracking-tight">
                  {template.value ?? 'Sem registro'}
                </p>
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </button>
          );
        })}
      </div>
    </>}
    <AchievementShareSheet achievement={achievement} onClose={() => setAchievement(null)} /><BottomNavigation />
  </div>;
}
