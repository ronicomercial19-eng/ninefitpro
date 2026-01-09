import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2, Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If already logged in, redirect based on role
  if (user && userRole) {
    if (userRole === 'super_admin' || userRole === 'admin' || userRole === 'trainer') {
      return <Navigate to="/app" replace />;
    }
    return <Navigate to="/9fit/hub" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !email.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um endereço de email válido.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      toast({
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await login(email, password);
      
      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check role and redirect
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      if (loggedUser) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', loggedUser.id)
          .single();

        if (roleData?.role === 'super_admin' || roleData?.role === 'admin' || roleData?.role === 'trainer') {
          toast({
            title: "Login bem-sucedido!",
            description: "Bem-vindo ao painel do professor.",
          });
          navigate('/app');
        } else {
          toast({
            title: "Login bem-sucedido!",
            description: "Bem-vindo ao 9FIT!",
          });
          navigate('/9fit/hub');
        }
      }
    } catch (err: any) {
      toast({
        title: "Erro ao fazer login",
        description: err?.message || 'Email ou senha inválidos',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || 'Erro ao conectar com Google',
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      {/* Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-[80px]" />
      </div>

      <Card className="w-full max-w-md p-8 bg-card border-border relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-3xl">9</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo à <span className="text-primary">9FIT</span>
          </h1>
          <p className="text-muted-foreground">Entre na sua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>

          {/* Google Login */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-border hover:bg-secondary"
            onClick={handleGoogleLogin}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Google
          </Button>

          <div className="text-center space-y-4">
            <Link 
              to="/forgot-password" 
              className="text-sm text-primary hover:text-primary/80 transition-colors block"
            >
              Esqueceu sua senha?
            </Link>
            
            <div className="text-sm text-muted-foreground">
              Não tem uma conta?{' '}
              <Link 
                to="/auth" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Criar conta
              </Link>
            </div>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Ao entrar, você concorda com nossos{' '}
            <a href="/privacy-policy" className="text-primary hover:text-primary/80 transition-colors">
              Termos de Uso e Política de Privacidade
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
