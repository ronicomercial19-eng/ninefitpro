import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading, profile, logout } = useAuth();
  const [profileTimedOut, setProfileTimedOut] = useState(false);

  useEffect(() => {
    if (loading || !user || profile) {
      setProfileTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setProfileTimedOut(true), 10_000);
    return () => window.clearTimeout(timeout);
  }, [loading, user, profile]);

  if (loading || (user && !profile && !profileTimedOut)) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4" />
        <p className="text-white">{loading ? "Carregando…" : "Carregando perfil…"}</p>
      </div>
    </div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-white text-xl font-semibold">Não foi possível carregar seu perfil</h1>
        <p className="text-slate-300 text-sm">Sua sessão existe, mas o perfil não respondeu. Tente novamente ou saia com segurança.</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-orange-500 text-black font-semibold">Tentar novamente</button>
          <button onClick={() => void logout()} className="px-4 py-2 rounded border border-slate-600 text-white">Sair</button>
        </div>
      </div>
    </div>;
  }

  return <>{children}</>;
};
