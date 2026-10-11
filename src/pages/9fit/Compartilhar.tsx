import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AchievementShareSheet, type Achievement } from '@/components/9fit/AchievementShareSheet';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useAthleteScores } from '@/hooks/useAthleteScores';
import { useActivitySummary } from '@/hooks/useActivitySummary';
import { loadProgressScreen } from '@/services/activitySummary';
import { Loader2 } from 'lucide-react';

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
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{templates.map(template => <button key={template.type} type="button" disabled={template.value === null} onClick={() => setAchievement({ contentType: template.type, kicker: 'MEU PROGRESSO', title: template.label, value: template.value!, subtitle: `${template.subtitle} · ${name}` })} className="rounded-xl border border-primary/30 p-4 text-left disabled:opacity-50"><p className="font-semibold">{template.label}</p><p className="mt-1 text-xs text-muted-foreground">{template.subtitle}</p><p className="mt-3 text-xs text-primary">{template.value ?? 'Sem registro confirmado'}</p></button>)}</div>
    </>}
    <AchievementShareSheet achievement={achievement} onClose={() => setAchievement(null)} /><BottomNavigation />
  </div>;
}
