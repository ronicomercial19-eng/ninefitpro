import { useState, useEffect } from "react";
import { Mail, Lock, ArrowRight, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function NineFitLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is already logged in and redirect based on role
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleRedirectByRole(session.user.id);
      }
    };
    checkAuth();
  }, [navigate]);

  const handleRedirectByRole = async (userId: string) => {
    try {
      // Check user_roles table for role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // Check if user is linked as athlete
      const { data: athleteLink } = await supabase
        .from('athlete_auth_link')
        .select('athlete_id')
        .eq('user_id', userId)
        .single();

      if (athleteLink) {
        // Check if this is first access
        const { data: athlete } = await supabase
          .from('athletes')
          .select('password_changed')
          .eq('id', athleteLink.athlete_id)
          .single();

        const isFirstAccess = athlete?.password_changed === false;

        if (isFirstAccess) {
          navigate("/9fit/first-access");
          return;
        }
        
        // User is an athlete/student
        navigate("/9fit/hub");
      } else if (roleData?.role === 'super_admin' || roleData?.role === 'admin' || roleData?.role === 'trainer') {
        // User is admin/trainer - go to dashboard
        navigate("/app");
      } else {
        // Default to athlete hub for other roles
        navigate("/9fit/hub");
      }
    } catch (error) {
      // Default to hub if error checking roles
      navigate("/9fit/hub");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await handleRedirectByRole(data.user.id);
      }
    } catch (error: any) {
      toast({
        title: "Acesso Negado",
        description: error.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/9fit/hub`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <h1 className="text-4xl font-black italic tracking-tighter text-foreground">
              9FIT
            </h1>
            <span className="text-xl font-bold text-primary tracking-wider">
              PRO
            </span>
          </div>
          <p className="text-sm text-muted-foreground tracking-wide uppercase">
            Acesse sua conta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu email"
              className="w-full bg-card border border-border rounded-sm pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full bg-card border border-border rounded-sm pl-12 pr-4 py-4 text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-primary text-sm hover:text-foreground transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <span className="animate-pulse">Autenticando...</span>
            ) : (
              <>
                Entrar
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-sm">Ou conecte via</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Social Login */}
        <div className="flex gap-4">
          <button
            onClick={handleGoogleLogin}
            className="flex-1 bg-card border border-border rounded-sm py-3 flex items-center justify-center gap-2 hover:border-primary transition-colors"
          >
            <Chrome className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Google</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center mt-8 text-muted-foreground text-sm">
          Novo por aqui?{" "}
          <button
            onClick={() => navigate("/auth")}
            className="text-primary hover:text-foreground transition-colors"
          >
            Criar conta
          </button>
        </p>
      </div>
    </div>
  );
}
