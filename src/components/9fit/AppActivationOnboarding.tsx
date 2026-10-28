import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
import { useDailyContext } from '@/hooks/useDailyContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { AppOnboardingState, OnboardingAnswers, DAYS, EQUIPMENT, EXPERIENCE, ENVIRONMENTS, onboardingStep, onboardingNextAction } from '@/lib/appOnboarding';
import { PDIWizard } from './PDIWizard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
const sections = ['Boas-vindas', 'Seu perfil', 'Sua rotina', 'Limitações', 'Sua ficha', 'Revisão', 'Tudo pronto'];
const field = 'w-full rounded-xl border border-border bg-background p-3';
const labels: Record<string, string> = { goal: 'Objetivo', recovery_rate: 'Recuperação', volume_tolerance: 'Tolerância a volume', peak_window: 'Melhor horário', stress_sensitivity: 'Sensibilidade ao estresse', discomfort_tolerance: 'Tolerância a esforço', time_horizon: 'Prazo em semanas', injury_zones: 'Histórico de lesões', dietary_restrictions: 'Restrições alimentares' };
const values: Record<string, string> = { performance: 'Performance', aesthetics: 'Estética', longevity: 'Longevidade', recomposition: 'Recomposição', fast: 'Rápida', medium: 'Média', slow: 'Lenta', morning: 'Manhã', afternoon: 'Tarde', night: 'Noite', aggressive: 'Alta', moderate: 'Moderada', conservative: 'Conservadora', knee: 'Joelho', shoulder: 'Ombro', back: 'Costas', elbow: 'Cotovelo', ankle: 'Tornozelo', hip: 'Quadril', vegan: 'Vegano', vegetarian: 'Vegetariano', lactose: 'Lactose', gluten: 'Glúten' };
const show = (v: unknown): string => Array.isArray(v) ? v.length ? v.map(show).join(', ') : 'Nenhuma' : values[String(v)] || String(v ?? 'Não informado');
export function AppActivationOnboarding() {
    const { user } = useAuth();
    const context = useDailyContext();
    const client = useQueryClient();
    const push = usePushNotifications();
    const initialized = useRef('');
    const writing = useRef(false);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<OnboardingAnswers>({});
    const [busy, setBusy] = useState(false);
    const [profileOpen, setProfileOpen] = useState(true);
    const key = ['app-onboarding', user?.id];
    const query = useQuery({ queryKey: key, enabled: !!user, refetchOnWindowFocus: false, queryFn: async () => {
            const { data, error } = await withTimeout(supabase.rpc('fn_get_app_onboarding' as never));
            if (error || !data)
                throw error || new Error('onboarding_unavailable');
            return data as unknown as AppOnboardingState;
        } });
    useEffect(() => {
        if (query.data && !context.isPending && !context.isError && initialized.current !== user?.id) {
            initialized.current = user?.id || '';
            setDraft({ full_name: query.data.full_name || '', birthdate: query.data.birthdate, ...query.data.onboarding?.answers });
            setStep(onboardingStep(query.data, !!context.data?.profile.complete));
        }
    }, [query.data, user?.id, context.isPending, context.isError, context.data?.profile.complete]);
    const set = (patch: Partial<OnboardingAnswers>) => setDraft(d => ({ ...d, ...patch }));
    async function save(patch: Partial<OnboardingAnswers>, next: number, complete = false) {
        if (writing.current || !query.data)
            return;
        writing.current = true;
        setBusy(true);
        try {
            const { data, error } = await withTimeout(supabase.rpc('fn_save_app_onboarding' as never, { p_patch: patch, p_revision: query.data.onboarding?.revision || 0, p_complete: complete } as never));
            const result = data as unknown as {
                saved: boolean;
                onboarding: AppOnboardingState['onboarding'];
            };
            if (error || !result?.saved || !result.onboarding || (complete && !result.onboarding.completed_at))
                throw error || new Error('save_not_confirmed');
            client.setQueryData<AppOnboardingState>(key, current => current ? { ...current, onboarding: result.onboarding } : current);
            setDraft(current => ({ ...current, ...result.onboarding!.answers }));
            setStep(next);
            window.dispatchEvent(new Event('9fit:profile-updated'));
            if (complete) {
                await query.refetch();
                toast.success('Onboarding concluído. Sua rotina foi salva.');
            }
        }
        catch (error) {
            const conflict = (error as {
                message?: string;
            })?.message?.includes('revision_conflict');
            toast.error(conflict ? 'A ficha foi atualizada em outra aba. Recarregue para conferir os dados.' : 'Não foi possível confirmar a gravação. Revise os campos ou recarregue os dados salvos.');
        }
        finally {
            writing.current = false;
            setBusy(false);
        }
    }
    const retry = () => { initialized.current = ''; void query.refetch(); void context.refetch(); };
    if (query.isPending || context.isPending)
        return <p className="p-12 text-center" role="status">Carregando sua ativação…</p>;
    if (query.isError || context.isError || !query.data)
        return <section className="p-12 text-center space-y-4"><p>Não foi possível ler sua ativação. Seus dados foram preservados.</p><Button onClick={retry}>Tentar novamente</Button></section>;
    const state = query.data;
    const action = onboardingNextAction(state);
    function next() {
        if (step === 0)
            return void save({ welcome_seen: true }, 1);
        if (step === 1) {
            if (!draft.full_name?.trim() || draft.full_name.trim().length < 2)
                return toast.error('Informe seu nome.');
            return void save({ full_name: draft.full_name.trim(), birthdate: draft.birthdate || null, weight_kg: draft.weight_kg ?? null, height_cm: draft.height_cm ?? null }, 2);
        }
        if (step === 2) {
            if (!draft.experience || !draft.training_days?.length || !draft.session_minutes || !draft.training_environment || !draft.equipment)
                return toast.error('Confirme sua experiência, dias, duração, local e equipamentos.');
            return void save({ experience: draft.experience, training_days: draft.training_days, session_minutes: draft.session_minutes, training_environment: draft.training_environment, equipment: draft.equipment }, 3);
        }
        if (step === 3) {
            if (typeof draft.current_pain !== 'boolean')
                return toast.error('Confirme se sente dor atualmente.');
            return void save({ current_pain: draft.current_pain, movement_limitations: draft.movement_limitations || '' }, context.data?.profile.complete ? 5 : 4);
        }
        if (step === 5)
            return void save({}, 6, true);
    }
    const edit = (n: number) => { setStep(n); if (n === 4)
        setProfileOpen(true); };
    const profileSaved = async () => {
        setProfileOpen(false);
        setBusy(true);
        try {
            const fresh = await context.refetch();
            if (!fresh.data?.profile.complete || fresh.isError)
                throw new Error('profile_read_required');
            setStep(5);
        }
        catch {
            toast.error('Sua ficha foi salva. Recarregue os dados para continuar a revisão.');
        }
        finally {
            setBusy(false);
        }
    };
    return <main className="mx-auto max-w-2xl px-5 pt-16 pb-28 space-y-6">
  <header className="space-y-2"><Rocket className="text-primary"/><p className="text-xs uppercase tracking-widest text-primary">Ativação do app</p><h1 className="font-display text-2xl">{sections[step]}</h1><p className="text-sm text-muted-foreground">{step < 6 ? `Etapa ${step + 1} de 6 · suas confirmações ficam salvas na conta` : 'Perfil completo e primeiro treino são etapas diferentes.'}</p></header>
  {step === 0 && <p className="text-sm text-muted-foreground">Seu professor vinculado poderá consultar sua rotina e as limitações informadas para orientar seu acompanhamento.</p>}
  {step < 6 && <div className="h-1 rounded bg-muted" aria-label={`Progresso: etapa ${step + 1} de 6`}><div className="h-full rounded bg-primary" style={{ width: `${((step + 1) / 6) * 100}%` }}/></div>}
  <fieldset disabled={busy} className="space-y-5">
   {step === 0 && <><h2 className="text-xl font-semibold">Vamos deixar o 9FIT pronto para sua rotina</h2><p>Você vai confirmar seu perfil, organizar os dias de treino e revisar sua ficha. Ao final, mostramos o próximo passo disponível.</p><section className="rounded-xl border p-4 space-y-2"><h3 className="font-semibold">Seu acesso</h3>{state.subscription ? <><p>Plano registrado: {state.subscription.name}</p><p>{state.subscription.expires_at ? `Validade: ${new Date(state.subscription.expires_at).toLocaleDateString('pt-BR')}` : 'Acesso registrado sem data de vencimento.'}</p><Link className="text-primary underline" to="/9fit/prime">Consultar detalhes do acesso</Link></> : <><p>Nenhuma assinatura ativa foi encontrada nesta conta. Se o seu acesso é pela consultoria, confira o vínculo com seu professor.</p><Link className="text-primary underline" to="/9fit/planos">Consultar planos</Link></>}</section></>}
   {step === 1 && <><label className="block space-y-2"><span>Como você se chama?</span><input className={field} autoComplete="name" maxLength={150} value={draft.full_name || ''} onChange={e => set({ full_name: e.target.value })}/></label><p className="text-sm text-muted-foreground">Os campos abaixo são opcionais. São dados declarados por você, não uma avaliação física.</p><label className="block space-y-2"><span>Data de nascimento (opcional)</span><input className={field} type="date" value={draft.birthdate || ''} onChange={e => set({ birthdate: e.target.value || null })}/></label>{(['weight_kg', 'height_cm'] as const).map(k => <label className="block space-y-2" key={k}><span>{k === 'weight_kg' ? 'Peso em kg' : 'Altura em cm'} (opcional)</span><input className={field} type="number" step="0.1" min={k === 'weight_kg' ? 20 : 80} max={k === 'weight_kg' ? 400 : 250} value={draft[k] ?? ''} onChange={e => set({ [k]: e.target.value === '' ? null : Number(e.target.value) })}/></label>)}</>}
   {step === 2 && <><label className="block space-y-2"><span>Experiência de treino</span><select className={field} value={draft.experience || ''} onChange={e => set({ experience: e.target.value })}><option value="" disabled>Selecione</option>{Object.entries(EXPERIENCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><section className="space-y-2"><h2>Dias disponíveis</h2><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <button type="button" aria-pressed={draft.training_days?.includes(i + 1) || false} className={`rounded-xl border p-3 ${draft.training_days?.includes(i + 1) ? 'border-primary bg-primary/10' : ''}`} key={d} onClick={() => set({ training_days: draft.training_days?.includes(i + 1) ? draft.training_days.filter(n => n !== i + 1) : [...(draft.training_days || []), i + 1].sort() })}>{d}</button>)}</div></section><label className="block space-y-2"><span>Tempo por sessão</span><select className={field} value={draft.session_minutes || ''} onChange={e => set({ session_minutes: Number(e.target.value) })}><option value="" disabled>Selecione</option>{[15, 20, 30, 40, 45, 60, 75, 90, 120].map(n => <option key={n} value={n}>{n} minutos</option>)}</select></label><label className="block space-y-2"><span>Onde vai treinar?</span><select className={field} value={draft.training_environment || ''} onChange={e => set({ training_environment: e.target.value })}><option value="" disabled>Selecione</option>{Object.entries(ENVIRONMENTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><section className="space-y-2"><h2>Equipamentos disponíveis</h2><div className="grid grid-cols-2 gap-2">{Object.entries(EQUIPMENT).map(([v, l]) => <button type="button" key={v} aria-pressed={draft.equipment?.includes(v) || false} className={`rounded-xl border p-3 text-left ${draft.equipment?.includes(v) ? 'border-primary bg-primary/10' : ''}`} onClick={() => set({ equipment: draft.equipment?.includes(v) ? draft.equipment.filter(e => e !== v) : [...(draft.equipment || []), v] })}>{l}</button>)}<button type="button" aria-pressed={!!draft.equipment && !draft.equipment.length} className={`rounded-xl border p-3 text-left ${draft.equipment && !draft.equipment.length ? 'border-primary bg-primary/10' : ''}`} onClick={() => set({ equipment: [] })}>Sem equipamentos</button></div></section><p className="text-sm text-muted-foreground">Sua disponibilidade fica registrada para orientar o planejamento. Ela não altera um treino já prescrito.</p></>}
   {step === 3 && <><h2>Você sente dor atualmente?</h2><div className="flex gap-3">{[false, true].map(v => <button type="button" key={String(v)} aria-pressed={draft.current_pain === v} className={`rounded-xl border px-6 py-3 ${draft.current_pain === v ? 'border-primary bg-primary/10' : ''}`} onClick={() => set({ current_pain: v })}>{v ? 'Sim' : 'Não'}</button>)}</div><label className="block space-y-2"><span>Movimentos que causam desconforto ou outras limitações (opcional)</span><textarea className={field} maxLength={1000} value={draft.movement_limitations || ''} onChange={e => set({ movement_limitations: e.target.value })}/></label><p className="text-sm text-muted-foreground">Essa informação será incluída na ficha. Se houver dor atual ou limitação informada, vamos oferecer a solicitação de revisão ao professor.</p></>}
   {step === 4 && <><p>Complete sua ficha de objetivos, recuperação, rotina e restrições. As respostas já confirmadas serão recuperadas.</p><Button onClick={() => setProfileOpen(true)}>Abrir minha ficha</Button><PDIWizard open={profileOpen} onClose={() => setProfileOpen(false)} onComplete={() => void profileSaved()}/></>}
   {step === 5 && <><h2 className="text-xl font-semibold">Confira antes de ativar</h2><section className="rounded-xl border p-4 space-y-2"><h3 className="font-semibold">Seu perfil <button className="ml-3 text-sm text-primary underline" onClick={() => edit(1)}>Editar</button></h3><p>{draft.full_name}</p><p>Nascimento: {draft.birthdate || 'Não informado'} · Peso: {draft.weight_kg ?? 'Não informado'}{draft.weight_kg ? ' kg' : ''} · Altura: {draft.height_cm ?? 'Não informada'}{draft.height_cm ? ' cm' : ''}</p></section><section className="rounded-xl border p-4 space-y-2"><h3 className="font-semibold">Sua rotina <button className="ml-3 text-sm text-primary underline" onClick={() => edit(2)}>Editar</button></h3><p>{EXPERIENCE[draft.experience as keyof typeof EXPERIENCE]} · {draft.training_days?.map(n => DAYS[n - 1]).join(', ')} · {draft.session_minutes} minutos</p><p>{ENVIRONMENTS[draft.training_environment as keyof typeof ENVIRONMENTS]} · {draft.equipment?.length ? draft.equipment.map(e => EQUIPMENT[e as keyof typeof EQUIPMENT]).join(', ') : 'Sem equipamentos'}</p></section><section className="rounded-xl border p-4 space-y-2"><h3 className="font-semibold">Limitações <button className="ml-3 text-sm text-primary underline" onClick={() => edit(3)}>Editar</button></h3><p>Dor atual: {draft.current_pain ? 'Sim' : 'Não'}</p><p>{draft.movement_limitations || 'Nenhum movimento informado'}</p></section><section className="rounded-xl border p-4 space-y-2"><h3 className="font-semibold">Sua ficha <button className="ml-3 text-sm text-primary underline" onClick={() => edit(4)}>Editar</button></h3>{Object.entries(context.data?.profile.declared || {}).filter(([k]) => labels[k]).map(([k, v]) => <p key={k}>{labels[k]}: {show(v)}</p>)}</section><p className="text-sm text-muted-foreground">Confirmar ativa sua configuração do app. Não registra treino realizado nem substitui a revisão do professor.</p></>}
   {step === 6 && <><section className="rounded-xl border p-5 space-y-3"><h2 className="text-xl font-semibold">Sua configuração foi salva</h2><p><Check className="inline h-4 w-4 text-primary"/> Perfil e onboarding completos</p><p>{state.first_workout_completed ? 'Você já tem treino validado no histórico.' : 'Primeiro treino concluído: ainda não registrado.'}</p></section><section className="rounded-xl border p-5 space-y-3"><h2 className="text-lg font-semibold">{action.title}</h2>{state.next_workout && !action.review && <p>{state.next_workout.title} · {new Date(state.next_workout.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}{!state.next_workout && !state.assignments.some(a => a && a.training_data?.exercises) && <p>Enquanto sua prescrição é preparada, você pode conhecer a jornada diária.</p>}<Button asChild><Link to={action.href}>{action.label}</Link></Button><Link className="block text-primary underline" to="/9fit/os">Abrir minha jornada diária</Link><Link className="block text-primary underline" to="/9fit/planejamento">Ver meu planejamento</Link></section><section className="rounded-xl border p-5 space-y-3"><h2 className="font-semibold">Notificações são opcionais</h2><p className="text-sm text-muted-foreground">Você pode permitir notificações do app neste dispositivo. Sua escolha não impede usar o 9FIT.</p>{push.supported ? <Button variant="outline" disabled={push.loading || push.subscribed} onClick={() => void push.subscribe()}>{push.subscribed ? 'Notificações ativadas neste dispositivo' : 'Permitir notificações do app'}</Button> : <p>Notificações não estão disponíveis neste navegador.</p>}</section></>}
   {step === 6 && <Button variant="outline" onClick={() => edit(1)}>Editar minha configuração</Button>}
   {step < 6 && step !== 4 && <div className="flex flex-wrap gap-3">{step > 0 && <Button variant="outline" onClick={() => edit(step - 1)}>Voltar</Button>}<Button onClick={next}>{busy ? 'Salvando…' : step === 5 ? 'Confirmar e ativar meu app' : step === 0 ? 'Começar minha ativação' : 'Salvar e continuar'}</Button></div>}
  </fieldset>
  {step < 6 && <button disabled={busy} onClick={retry} className="text-xs text-muted-foreground underline">Recarregar dados salvos</button>}
 </main>;
}
