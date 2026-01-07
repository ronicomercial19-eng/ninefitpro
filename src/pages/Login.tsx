
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/app" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Client-side validation
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
      await login(email, password);
      toast({
        title: "Login bem-sucedido!",
        description: "Bem-vindo de volta à 9FIT PRO!",
      });
      navigate('/app');
    } catch (err: any) {
      const errorMessage = err?.message || 'Email ou senha inválidos';
      toast({
        title: "Erro ao fazer login",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8FAFB] to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 shadow-card">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-[#FF8426] to-[#F04E23] rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-3xl">9</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#282E3A] mb-2">
            Bem-vindo à <span className="text-gradient">9FIT</span>
          </h1>
          <p className="text-[#666666]">Entre na sua conta para continuar sua jornada</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#282E3A]">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
              className="border-[#E5E7EB] focus:ring-[#FF8426]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#282E3A]">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
                className="border-[#E5E7EB] focus:ring-[#FF8426]"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#666666] hover:text-[#FF8426] transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full btn-9fit"
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

          <div className="text-center space-y-4">
            <Link 
              to="/forgot-password" 
              className="text-sm text-[#FF8426] hover:text-[#F04E23] transition-colors block"
            >
              Esqueceu sua senha?
            </Link>
            
            <div className="text-sm text-[#666666]">
              Não tem uma conta?{' '}
              <Link 
                to="/register" 
                className="text-[#FF8426] hover:text-[#F04E23] font-semibold transition-colors"
              >
                Criar conta grátis
              </Link>
            </div>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
          <p className="text-xs text-[#707070] text-center">
            Ao entrar, você concorda com nossos{' '}
            <a href="/privacy-policy" className="text-[#FF8426] hover:text-[#F04E23] transition-colors">
              Termos de Uso e Política de Privacidade
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
