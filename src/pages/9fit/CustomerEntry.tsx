import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { loginDestination } from '@/lib/loginDestination';
import { clearEntry, clearPlan, confirmedAccess, CUSTOMER_ENTRY, entryStorage, PAYMENT_RETURN, planDestination, readEntry, readPlan, rememberEntry, setupDestination } from '@/lib/customerEntry';
import { AppSupport } from '@/components/9fit/AppSupport';
import { pendingPayment } from '@/lib/paymentReturn';
import { withTimeout } from '@/lib/withTimeout';
import { hasConfirmedProfile } from '@/lib/activationProfile';
import { JourneyCard, JourneyShell } from '@/components/9fit/JourneyShell';

export default function CustomerEntry() {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const paymentReturn = location.pathname === PAYMENT_RETURN;
  const purchase = new URLSearchParams(location.search).get('intent') === 'purchase';
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ destination: string; access: boolean; missingProfile: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState('');
  useEffect(() => {
    rememberEntry(entryStorage(), paymentReturn ? 'payment_return' : purchase ? 'purchase' : readEntry(entryStorage()) || 'start');
  }, [paymentReturn, purchase]);
  useEffect(() => {
    if (!user || authLoading) return;
    if (pendingPayment() && readEntry(entryStorage()) === 'payment_return') { navigate(PAYMENT_RETURN, { replace: true }); return; }
    let active = true; setError(false); setState(null);
    void (async () => {
      try {
        const [profile, roles, identity, subscription, settings, onboarding] = await withTimeout(Promise.all([
          supabase.from('profiles').select('role,first_access_completed').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', user.id),
          supabase.rpc('fn_current_athlete_id'),
          supabase.from('user_subscriptions' as any).select('status,expires_at').eq('user_id', user.id).order('activated_at', { ascending: false }),
          supabase.from('user_context_settings').select('pdi_completed_at,declared_keys').eq('user_id', user.id).maybeSingle(),
          supabase.from('app_onboarding' as any).select('completed_at').eq('user_id', user.id).maybeSingle(),
        ]));
        for (const result of [profile, roles, identity, subscription, settings, onboarding]) if (result.error) throw result.error;
        const roleHome = loginDestination(profile.data?.role, roles.data?.map(r => r.role));
        let activationDone = false;
        let firstAccessDone = profile.data?.first_access_completed === true;
        if (identity.data) {
          const [activation, athlete] = await withTimeout(Promise.all([
            supabase.from('athlete_activation').select('finished_at').eq('athlete_id', identity.data).maybeSingle(),
            supabase.from('athletes').select('password_changed').eq('id', identity.data).single(),
          ]));
          if (activation.error) throw activation.error;
          activationDone = !!activation.data?.finished_at;
          if (athlete.error) throw athlete.error;
          firstAccessDone ||= athlete.data.password_changed === true;
        }
        const intent = purchase ? 'purchase' : paymentReturn ? 'payment_return' : readEntry(entryStorage()) || 'start';
        const onboardingComplete = !!(onboarding.data as unknown as { completed_at: string | null } | null)?.completed_at;
        const destination = setupDestination({ roleHome, athleteId: identity.data, firstAccessDone, googleIdentity: !!user.identities?.some(i => i.provider === 'google'), activationDone, profileDone: hasConfirmedProfile(settings.data) && (intent === 'payment_return' ? onboardingComplete : !onboarding.data || onboardingComplete), intent });
        const registeredAccess = ((subscription.data || []) as unknown as { status: string; expires_at: string | null }[]).some(row => confirmedAccess(row));
        if (active) setState({ destination, access: registeredAccess, missingProfile: !identity.data && roleHome !== '/app' });
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [user?.id, authLoading, revision, paymentReturn, purchase]);
  // O plano escolhido antes do login só pré-seleciona o card em /9fit/planos; não confirma acesso nem pagamento.
  const proceed = () => { if (!state) return; const target = planDestination(state.destination, readPlan(entryStorage())); clearEntry(entryStorage()); clearPlan(entryStorage()); navigate(target, { replace: true }); };
  async function createTeamProfile() {
    if (provisioning) return;
    setProvisioning(true); setProvisionError('');
    try {
      const result = await withTimeout(supabase.rpc('fn_ensure_ninefit_customer' as any));
      if (result.error || !result.data) throw new Error('profile');
      window.dispatchEvent(new Event('9fit:profile-updated'));
      setRevision(n => n + 1);
    } catch { setProvisionError('Não foi possível criar ou vincular sua ficha. Confirme seu e-mail e solicite revisão ao suporte; não crie outra conta.'); }
    finally { setProvisioning(false); }
  }
  useEffect(() => {
    if (!paymentReturn || !state?.access || state.missingProfile) return;
    clearEntry(entryStorage());
    navigate(state.destination, { replace: true });
  }, [paymentReturn, state, navigate]);
  return <JourneyShell title={paymentReturn ? 'Vamos continuar no app' : 'Continue de onde parou'} eyebrow="9FIT · ENTRADA" backTo="/9fit/login" backLabel="Voltar ao login" steps={['Entrada', 'Acesso', 'Configuração']} activeStep={user ? state ? 2 : 1 : 0}>
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">Cadastro, configuração inicial e assinatura são etapas diferentes. Entrar ou voltar do checkout não confirma pagamento.</p>
      <JourneyCard className="space-y-4">
      {authLoading ? <p role="status" className="text-sm text-muted-foreground">Carregando sua conta…</p> : !user ? <>
        <div><h2 className="font-display text-xl">Entre para continuar</h2><p className="mt-1 text-sm text-muted-foreground">Já tem conta? Entre nela. Se pagou com outro e-mail, não crie uma segunda conta para tentar liberar o plano.</p></div>
        <Link className="block rounded-xl bg-primary p-4 text-center font-semibold text-primary-foreground" to={`/auth?entry=${paymentReturn ? 'payment_return' : purchase ? 'purchase' : 'start'}`}>Entrar ou criar conta <span aria-hidden>→</span></Link>
        <p className="text-xs leading-relaxed text-muted-foreground">Após confirmar seu e-mail ou entrar com Google, retomaremos esta etapa. Acesso concedido pela equipe não exige uma nova compra.</p>
      </> : error ? <div role="alert" className="space-y-3"><p className="text-sm">Não foi possível conferir sua conta. Nenhuma cobrança ou alteração de acesso foi feita.</p><button className="text-sm text-primary underline" onClick={() => setRevision(n => n + 1)}>Tentar novamente</button></div> : !state ? <p role="status" className="text-sm text-muted-foreground">Conferindo seu acesso e sua configuração…</p> : <>
        <p role="status" className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4 text-sm leading-relaxed">{state.access ? 'Seu acesso está confirmado no app. Não é necessário pagar novamente.' : paymentReturn ? 'Retorno recebido. Ainda não há acesso ativo confirmado nesta conta. Não pague novamente enquanto conferimos.' : 'Você pode começar a configuração sem confirmar uma nova compra. Recursos pagos dependem do acesso registrado.'}</p>
        {state.missingProfile && <div className="space-y-3"><p className="text-sm leading-relaxed text-muted-foreground">Sua conta existe, mas ainda não há ficha de atleta vinculada. Ao criar sua ficha, ela ficará sob responsabilidade da equipe NINE FIT (Rony).</p><button disabled={provisioning} onClick={() => void createTeamProfile()} className="w-full rounded-xl border border-primary/40 p-4 text-sm font-semibold text-primary disabled:opacity-50">{provisioning ? 'Preparando sua ficha…' : 'Criar minha ficha com a equipe NINE FIT'}</button><p role="alert" className="text-sm text-destructive">{provisionError}</p></div>}
        <button onClick={proceed} className="w-full rounded-xl bg-primary p-4 font-semibold text-primary-foreground">{state.destination === '/9fit/planos' ? 'Ver planos e condições' : state.missingProfile ? 'Abrir início' : 'Continuar minha configuração'} <span aria-hidden>→</span></button>
        <button className="text-sm text-muted-foreground underline" onClick={() => setRevision(n => n + 1)}>Conferir confirmação novamente</button>
      </>}
      </JourneyCard>
      <AppSupport />
      <Link to={CUSTOMER_ENTRY} className="block text-center text-sm text-muted-foreground">Entrada do 9FIT PRO</Link>
    </div>
  </JourneyShell>;
}
