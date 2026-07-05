import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NineFitTopBar } from "./NineFitTopBar";
import { RonBubble } from "./RonBubble";
import { BackButton } from "./BackButton";


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
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/9fit/login");
        return;
      }

      const path = location.pathname;
      const onFirstAccess = path.includes('first-access');
      const onOnboarding  = path.includes('onboarding');

      // --- 1. First-access gate ---
      const localCompleted = localStorage.getItem('9fit_first_access_completed') === 'true';
      let firstAccessDone = localCompleted;

      if (!firstAccessDone) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_access_completed')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (profile?.first_access_completed === true) {
            firstAccessDone = true;
          } else {
            const { data: athlete } = await supabase
              .from('athletes')
              .select('password_changed')
              .eq('user_id', session.user.id)
              .maybeSingle();
            // Sem registro de athlete (coach/admin) → liberado
            // Athlete com senha já trocada → liberado
            firstAccessDone = !athlete || athlete.password_changed === true;
          }
        } catch (e) {
          console.log('[NineFitLayout] first-access check:', e);
          firstAccessDone = true; // fail-open para não travar
        }
      }

      if (!firstAccessDone && !onFirstAccess) {
        navigate("/9fit/first-access");
        return;
      }
      if (firstAccessDone && onFirstAccess) {
        navigate("/9fit/hub");
        return;
      }

      // --- 2. Activation gate (fluxo único /9fit/ativacao) ---
      // Fonte da verdade = athlete_activation.finished_at.
      // NUNCA usar fully_activated (só vira true após 7 dias).
      const onAtivacao = path.includes('/9fit/ativacao');
      if (firstAccessDone && !onFirstAccess) {
        try {
          const { data: athlete } = await supabase
            .from('athletes')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (athlete?.id) {
            const { data: act } = await supabase
              .from('athlete_activation' as any)
              .select('finished_at')
              .eq('athlete_id', athlete.id)
              .maybeSingle();
            const finished = (act as any)?.finished_at;
            if (!finished && !onAtivacao && !onOnboarding) {
              navigate('/9fit/ativacao');
              return;
            }
            if (finished && onAtivacao) {
              navigate('/9fit/os');
              return;
            }
          }
        } catch (e) {
          console.log('[NineFitLayout] activation check:', e);
        }
      }

      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          navigate("/9fit/login");
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

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
      {children}
      {!isOnboardingFlow && <RonBubble />}
    </>
  );
}
