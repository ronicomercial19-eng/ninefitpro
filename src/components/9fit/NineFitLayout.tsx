import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface NineFitLayoutProps {
  children: React.ReactNode;
}

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

      // Check if this is first access (needs password change)
      try {
        const { data: link } = await supabase
          .from('athlete_auth_link')
          .select('athlete_id')
          .eq('user_id', session.user.id)
          .single();

        if (link) {
          const { data: athlete } = await supabase
            .from('athletes')
            .select('password_changed, auto_password_temp')
            .eq('id', link.athlete_id)
            .single();

          // If it's first access and not already on first-access page, redirect
          const isFirstAccess = athlete?.password_changed === false && 
                                athlete?.auto_password_temp !== null;
          
          if (isFirstAccess && !location.pathname.includes('first-access')) {
            navigate("/9fit/first-access");
            return;
          }
        }
      } catch (error) {
        // Continue if check fails - might not be an athlete
        console.log('First access check:', error);
      }
      
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          navigate("/9fit/login");
        }
      }
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

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
