import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { NineFitTopBar } from "./NineFitTopBar";
import { RonBubble } from "./RonBubble";

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
              .select('password_changed, auto_password_temp')
              .eq('user_id', session.user.id)
              .maybeSingle();
            // Sem registro de athlete (coach/admin) → liberado
            // Athlete com senha já trocada → liberado
            firstAccessDone = !athlete || athlete.password_changed === true || athlete.auto_password_temp === null;
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

      // --- 2. Onboarding gate (apenas atletas) ---
      if (firstAccessDone && !onFirstAccess && !onOnboarding) {
        try {
          const { data: athlete } = await supabase
            .from('athletes')
            .select('onboarding_completed_at')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (athlete && !athlete.onboarding_completed_at) {
            navigate("/9fit/onboarding");
            return;
          }
        } catch (e) {
          console.log('[NineFitLayout] onboarding check:', e);
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
      {children}
      {!isOnboardingFlow && <RonBubble />}
    </>
  );
}
