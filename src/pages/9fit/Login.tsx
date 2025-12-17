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

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/9fit/hub");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      navigate("/9fit/hub");
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-400/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-400/3 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            WELCOME BACK
          </h1>
          <p className="text-sm text-gray-500 tracking-wide">
            ENTER THE 9FIT ECOSYSTEM
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ACCESS ID (EMAIL)"
              className="w-full bg-dark-800 border border-dark-700 rounded-sm pl-12 pr-4 py-4 text-foreground placeholder:text-gray-500 text-sm focus:border-neon-400 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSPHRASE"
              className="w-full bg-dark-800 border border-dark-700 rounded-sm pl-12 pr-4 py-4 text-foreground placeholder:text-gray-500 text-sm focus:border-neon-400 focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Forgot Password */}
          <div className="text-right">
            <button
              type="button"
              className="text-neon-400 text-sm hover:text-foreground transition-colors"
            >
              Forgot access?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-neon-400 text-primary-foreground font-bold py-4 rounded-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                Initiate Session
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-dark-700" />
          <span className="text-gray-500 text-sm">Or connect via</span>
          <div className="flex-1 h-px bg-dark-700" />
        </div>

        {/* Social Login */}
        <div className="flex gap-4">
          <button
            onClick={handleGoogleLogin}
            className="flex-1 bg-dark-800 border border-dark-700 rounded-sm py-3 flex items-center justify-center gap-2 hover:border-neon-400 transition-colors"
          >
            <Chrome className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Google</span>
          </button>
        </div>

        {/* Sign Up Link */}
        <p className="text-center mt-8 text-gray-500 text-sm">
          New operative?{" "}
          <button
            onClick={() => navigate("/9fit/onboarding")}
            className="text-neon-400 hover:text-foreground transition-colors"
          >
            Create Access
          </button>
        </p>
      </div>
    </div>
  );
}
