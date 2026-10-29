import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
import { OnboardingAnswers, DAYS, EQUIPMENT, EXPERIENCE, ENVIRONMENTS } from '@/lib/appOnboarding';
export function OnboardingSummary({ athleteId }: {
    athleteId: string;
}) {
    const { user } = useAuth();
    const q = useQuery({ queryKey: ['onboarding-summary', user?.id, athleteId], enabled: !!user && !!athleteId, queryFn: async ({ signal }) => {
            const { data, error } = await withTimeout(supabase.from('app_onboarding' as any).select('answers,completed_at,updated_at').eq('athlete_id', athleteId).order('updated_at', { ascending: false }).limit(1).abortSignal(signal).maybeSingle());
            if (error)
                throw error;
            return data as unknown as {
                answers: OnboardingAnswers;
                completed_at: string | null;
                updated_at: string;
            } | null;
        } });
    if (q.isPending)
        return <p className="text-sm">Carregando rotina declarada…</p>;
    if (q.isError)
        return <button className="text-sm underline" onClick={() => void q.refetch()}>Não foi possível ler o onboarding. Tentar novamente</button>;
    if (!q.data)
        return null;
    const a = q.data.answers;
    return <section className="rounded-xl border p-4 space-y-2"><h3 className="font-semibold">Onboarding e rotina declarada</h3><button type="button" disabled={q.isFetching} className="text-sm text-primary underline" onClick={() => void q.refetch()}>{q.isFetching ? "Atualizando…" : "Atualizar dados do aluno"}</button><p className="text-sm">{q.data.completed_at ? 'Configuração confirmada' : 'Configuração em preenchimento'} · atualizado em {new Date(q.data.updated_at).toLocaleDateString('pt-BR')}</p><p>{a.experience ? EXPERIENCE[a.experience as keyof typeof EXPERIENCE] : 'Experiência ainda não confirmada'} · {a.training_days?.map(n => DAYS[n - 1]).join(', ') || 'Dias ainda não confirmados'} · {a.session_minutes ? `${a.session_minutes} minutos` : 'Duração pendente'}</p><p>{a.training_environment ? ENVIRONMENTS[a.training_environment as keyof typeof ENVIRONMENTS] : 'Local pendente'} · {a.equipment ? a.equipment.length ? a.equipment.map(e => EQUIPMENT[e as keyof typeof EQUIPMENT]).join(', ') : 'Sem equipamentos' : 'Equipamentos pendentes'}</p><p>Sexo declarado: {a.gender || "Não informado"} · Peso declarado: {a.weight_kg != null ? `${a.weight_kg} kg` : "Não informado"} · Altura declarada: {a.height_cm != null ? `${a.height_cm} cm` : "Não informada"}</p><p>Dor atual: {typeof a.current_pain === 'boolean' ? a.current_pain ? 'Sim' : 'Não' : 'Ainda não informada'}</p><p>{a.movement_limitations || 'Sem movimentos limitantes descritos.'}</p><p className="text-xs text-muted-foreground">Dados informados pelo aluno. Não representam avaliação física nem registro de treino concluído.</p></section>;
}
