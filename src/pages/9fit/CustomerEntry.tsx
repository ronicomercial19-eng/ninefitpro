import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { loginDestination } from '@/lib/loginDestination';
import { clearEntry, confirmedAccess, CUSTOMER_ENTRY, entryStorage, PAYMENT_RETURN, readEntry, rememberEntry, setupDestination } from '@/lib/customerEntry';
import { AppSupport } from '@/components/9fit/AppSupport';

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
    let active = true; setError(false); setState(null);
    void (async () => {
      try {
        const [profile, roles, identity, subscription, settings] = await Promise.all([
          supabase.from('profiles').select('role,first_access_completed').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_roles').select('role').eq('user_id', user.id),
          supabase.rpc('fn_current_athlete_id'),
          supabase.from('user_subscriptions' as any).select('status,expires_at').eq('user_id', user.id).order('activated_at', { ascending: false }),
          supabase.from('user_context_settings' as any).select('pdi_completed_at').eq('user_id', user.id).maybeSingle(),
        ]);
        for (const result of [profile, roles, identity, subscription, settings]) if (result.error) throw result.error;
        const roleHome = loginDestination(profile.data?.role, roles.data?.map(r => r.role));
        let activationDone = false;
        let firstAccessDone = profile.data?.first_access_completed === true;
        if (identity.data) {
          const activation = await supabase.from('athlete_activation').select('finished_at').eq('athlete_id', identity.data).maybeSingle();
          if (activation.error) throw activation.error;
          activationDone = !!activation.data?.finished_at;
          const athlete = await supabase.from('athletes').select('password_changed').eq('id', identity.data).single();
          if (athlete.error) throw athlete.error;
          firstAccessDone ||= athlete.data.password_changed === true;
        }
        const destination = setupDestination({ roleHome, athleteId: identity.data, firstAccessDone, googleIdentity: !!user.identities?.some(i => i.provider === 'google'), activationDone, profileDone: !!(settings.data as any)?.pdi_completed_at, intent: purchase ? 'purchase' : paymentReturn ? 'payment_return' : readEntry(entryStorage()) || 'start' });
        const registeredAccess = ((subscription.data || []) as unknown as { status: string; expires_at: string | null }[]).some(row => confirmedAccess(row));
        if (active) setState({ destination, access: registeredAccess, missingProfile: !identity.data && roleHome !== '/app' });
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [user?.id, authLoading, revision, paymentReturn, purchase]);
  const proceed = () => { if (!state) return; clearEntry(entryStorage()); navigate(state.destination, { replace: true }); };
  async function createTeamProfile() {
    if (provisioning) return;
    setProvisioning(true); setProvisionError('');
    try {
      const result = await supabase.rpc('fn_ensure_ninefit_customer' as any);
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
  return <main className="min-h-screen bg-background text-foreground px-4 py-10"><section className="mx-auto max-w-lg space-y-5">
    <p className="text-xs tracking-widest text-primary">9FIT PRO · BOAS-VINDAS</p>
    <h1 className="text-3xl font-bold">{paymentReturn ? 'Vamos continuar no app' : 'Entre do seu jeito. Continue de onde parou.'}</h1>
    <p className="text-sm text-muted-foreground">Cadastro, configuração inicial e assinatura são etapas diferentes. Entrar ou voltar do checkout não confirma pagamento.</p>
    {authLoading ? <p role="status">Carregando sua conta…</p> : !user ? <>
      <p>Já tem conta? Entre nela. Se pagou com outro e-mail, não crie uma segunda conta para tentar liberar o plano: fale com o suporte.</p>
      <Link className="block rounded-xl bg-primary text-primary-foreground p-4 text-center font-bold" to={`/auth?entry=${paymentReturn ? 'payment_return' : purchase ? 'purchase' : 'start'}`}>Entrar ou criar conta · e-mail ou Google</Link>
      <p className="text-xs text-muted-foreground">Após confirmar seu e-mail ou entrar com Google, retomaremos esta etapa. Acesso concedido pela equipe não exige uma nova compra.</p>
    </> : error ? <div role="alert"><p>Não foi possível conferir sua conta. Nenhuma cobrança ou alteração de acesso foi feita.</p><button className="underline mt-3" onClick={() => setRevision(n => n + 1)}>Tentar novamente</button></div> : !state ? <p role="status">Conferindo seu acesso e sua configuração…</p> : <>
      <p role="status" className="rounded-xl border border-border p-4">{state.access ? 'Seu acesso está confirmado no app. Não é necessário pagar novamente.' : paymentReturn ? 'Retorno recebido. Ainda não há acesso ativo confirmado nesta conta. Não pague novamente enquanto conferimos.' : 'Você pode começar a configuração sem confirmar uma nova compra. Recursos pagos dependem do acesso registrado.'}</p>
      {state.missingProfile && <div className="space-y-3"><p className="text-sm">Sua conta existe, mas ainda não há ficha de atleta vinculada. Ao criar sua ficha, ela ficará sob responsabilidade da equipe NINE FIT (Rony). Isso não inclui consulta ou acompanhamento individual contratado, nem confirma assinatura.</p><button disabled={provisioning} onClick={() => void createTeamProfile()} className="w-full rounded-xl border border-primary p-4 disabled:opacity-50">{provisioning ? 'Preparando sua ficha…' : 'Criar minha ficha com a equipe NINE FIT'}</button><p role="alert" className="text-sm">{provisionError}</p></div>}
      <button onClick={proceed} className="w-full rounded-xl bg-primary text-primary-foreground p-4 font-bold">{state.destination === '/9fit/planos' ? 'Ver planos e condições' : state.missingProfile ? 'Abrir início' : 'Continuar minha configuração'}</button>
      <button className="underline text-sm" onClick={() => setRevision(n => n + 1)}>Conferir confirmação novamente</button>
      <AppSupport />
    </>}
    <Link to={CUSTOMER_ENTRY} className="block text-sm text-muted-foreground">Entrada do 9FIT PRO</Link>
  </section></main>;
}
