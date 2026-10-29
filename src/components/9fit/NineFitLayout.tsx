import { CareReturnBanner } from "@/components/students/CareReturnBanner";
import { careModuleForPath } from "@/data/careModules";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NineFitTopBar } from "./NineFitTopBar";
import { RonBubble } from "./RonBubble";
import { BackButton } from "./BackButton";
import { useDailyContext } from '@/hooks/useDailyContext';
import { hasConfirmedProfile } from '@/lib/activationProfile';
import { withTimeout } from "@/lib/withTimeout";
import {PaidAccessGate} from './PaidAccessGate';


interface NineFitLayoutProps {
  children: React.ReactNode;
}

/**
 * Guard de rotas /9fit/*  — ordem canônica:
 *  1. Não autenticado            → /9fit/login
 *  2. first_access pendente      → /9fit/first-access
 *  3. onboarding pendente (atl.) → /9fit/onboarding
 *  4. Liberado                   → renderiza
 */
export function NineFitLayout({ children }: NineFitLayoutProps) {
  const context = useDailyContext();
  useEffect(()=>{document.documentElement.dataset.ninefitSurface='student';return()=>{if(document.documentElement.dataset.ninefitSurface==='student')delete document.documentElement.dataset.ninefitSurface;};},[]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = context.data?.profile.preferences.reduced_motion ? 'true' : 'false';
    return () => { delete document.documentElement.dataset.reducedMotion; };
  }, [context.data?.profile.preferences.reduced_motion]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingFirstAccess, setPendingFirstAccess] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const go = (path: string) => { if (active) navigate(path, { replace: true }); };
    const checkAuth = async () => {
      setGateError(null);
      setIsLoading(true);
      setPendingFirstAccess(false);
      setPendingActivation(false);
      const { data: { session } } = await withTimeout(supabase.auth.getSession());
      if (!active) return;

      if (!session) {
        go("/9fit/login");
        return;
      }

      const path = location.pathname;
      const onHome = path === '/9fit/hub';
      const onFirstAccess = path.includes('first-access');
      const onOnboarding  = path.includes('onboarding');

      // --- 1. First-access gate ---
      // The server is authoritative; an old browser flag must not skip the gate.
      let firstAccessDone = !!session.user.identities?.some(identity => identity.provider === 'google');

      if (!firstAccessDone) {
        try {
          const { data: profile } = await withTimeout(supabase
            .from('vw_current_identity' as any)
            .select('first_access_completed,athlete_id')
            .eq('user_id', session.user.id)
            .maybeSingle());

          if ((profile as { first_access_completed?: boolean } | null)?.first_access_completed === true) {
            firstAccessDone = true;
          } else {
            const { data: athlete } = await withTimeout(supabase
              .from('athletes')
              .select('password_changed')
              .eq('id', (profile as { athlete_id?: string } | null)?.athlete_id || '00000000-0000-0000-0000-000000000000')
              .maybeSingle());
            // Sem registro de athlete (coach/admin) → liberado
            // Athlete com senha já trocada → liberado
            firstAccessDone = !athlete || athlete.password_changed === true;
          }
        } catch (e) {
          // Compatibilidade: alunos já cadastrados não podem perder acesso
          // por indisponibilidade transitória de RLS/API durante o gate.
          console.error("[NineFitLayout] first-access gate failed; preserving session", e);
          firstAccessDone = true;
        }
      }

      if (!active) return;
      setPendingFirstAccess(!firstAccessDone);
      const onCommercial = ['/9fit/planos', '/9fit/primepass', '/9fit/billing', '/9fit/prime', '/9fit/premium'].includes(path);
      if (!firstAccessDone && !onFirstAccess && !onHome && !onCommercial) {
        go("/9fit/first-access");
        return;
      }
      if (firstAccessDone && onFirstAccess) {
        go("/9fit/hub");
        return;
      }

      // --- 2. Activation gate (fluxo único /9fit/ativacao) ---
      // Fonte da verdade = athlete_activation.finished_at.
      // NUNCA usar fully_activated (só vira true após 7 dias).
      const onAtivacao = path.includes('/9fit/ativacao');
      if (firstAccessDone && !onFirstAccess) {
        try {
          const { data: athlete } = await withTimeout(supabase
            .from('vw_current_identity' as any)
            .select('athlete_id')
            .eq('user_id', session.user.id)
            .maybeSingle());
          if ((athlete as { athlete_id?: string } | null)?.athlete_id) {
            const [activation, settings, onboarding] = await withTimeout(Promise.all([
              supabase.from('athlete_activation').select('finished_at')
                .eq('athlete_id', (athlete as unknown as { athlete_id: string }).athlete_id).maybeSingle(),
              supabase.from('user_context_settings').select('pdi_completed_at,declared_keys').eq('user_id', session.user.id).maybeSingle(),
              supabase.from('app_onboarding' as any).select('completed_at').eq('user_id', session.user.id).maybeSingle(),
            ]));
            if (!active) return;
            for (const result of [activation, settings, onboarding]) if (result.error) throw result.error;
            const finished = activation.data?.finished_at;
            const profileConfirmed = hasConfirmedProfile(settings.data);
            const appOnboarding = onboarding.data;
            const appPending = !!appOnboarding && !(appOnboarding as unknown as { completed_at: string | null }).completed_at;
            setPendingActivation((!finished && !profileConfirmed) || appPending);
            if (((!finished && !profileConfirmed) || appPending) && !onAtivacao && !onOnboarding && !onHome && !onCommercial) {
              go('/9fit/ativacao');
              return;
            }
          }
        } catch (e) {
          // Não transformar falha transitória de leitura em tela preta.
          console.error("[NineFitLayout] activation gate failed; preserving session", e);
        }
      }

      if (!active) return;
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    void checkAuth().catch(() => {
      if (!active) return;
      setGateError('Não foi possível conferir sua sessão. Tente novamente.');
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          go("/9fit/login");
        }
      },
    );

    return () => { active = false; subscription.unsubscribe(); };
  }, [navigate, location.pathname, retryKey]);

  if (gateError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <h1 className="text-lg font-semibold">Acesso não validado</h1>
          <p className="text-sm text-muted-foreground">{gateError}</p>
          <button onClick={() => setRetryKey((value) => value + 1)}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-semibold">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm uppercase tracking-wider">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // Não monta TopBar/RonBubble nas telas isoladas (onboarding/first-access)
  const isOnboardingFlow =
    location.pathname.includes('onboarding') ||
    location.pathname.includes('first-access');

  return (
    <>
      {!isOnboardingFlow && <NineFitTopBar />}
      {!isOnboardingFlow && <BackButton />}
      {location.pathname === '/9fit/hub' && (pendingFirstAccess || pendingActivation) && <section className="mx-auto max-w-3xl p-4" role="status">
        <p>{pendingFirstAccess ? 'Bem-vindo! Conclua seu primeiro acesso para preparar seus treinos.' : 'Bem-vindo! Confirme sua ficha para personalizar seus treinos.'}</p>
        <button className="mt-2 underline" onClick={() => navigate(pendingFirstAccess ? '/9fit/first-access' : '/9fit/ativacao')}>Continuar configuração</button>
      </section>}
      {!isOnboardingFlow && location.pathname!=="/9fit/acompanhamento" && careModuleForPath(location.pathname) && <div className="mx-auto max-w-4xl px-4 pt-14"><button className="rounded-lg border px-3 py-2 text-sm text-primary" onClick={()=>navigate("/9fit/acompanhamento?module="+careModuleForPath(location.pathname)!.key)}>Meu acompanhamento · solicitar orientação</button></div>}
      {!isOnboardingFlow && <CareReturnBanner />}
      <PaidAccessGate>{children}</PaidAccessGate>
      {!isOnboardingFlow && !['/9fit/mensagens','/9fit/acompanhamento'].includes(location.pathname) && <RonBubble />}
    </>
  );
}

