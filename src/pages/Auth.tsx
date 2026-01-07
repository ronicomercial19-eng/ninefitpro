import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Dumbbell, Shield, Users, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<'professor' | 'aluno'>('professor');
  
  const { login, register, user, profile } = useAuth();
  const navigate = useNavigate();

  // Se já logado, redirecionar baseado no tipo de usuário
  if (user && profile) {
    // Verificar se é aluno ou professor
    const isStudent = profile.role === 'student';
    if (isStudent) {
      return <Navigate to="/9fit/hub" replace />;
    }
    return <Navigate to="/app" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await login(email, password);
      
      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }
      
      // Após login, verificar o tipo de usuário e redirecionar
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      
      if (loggedUser) {
        // Verificar se é atleta
        const { data: athleteLink } = await supabase
          .from('athlete_auth_link')
          .select('athlete_id')
          .eq('user_id', loggedUser.id)
          .single();
        
        if (athleteLink) {
          // É um atleta, redirecionar para o app do aluno
          toast.success('Bem-vindo ao 9FIT!');
          navigate('/9fit/hub');
        } else {
          // É professor/admin
          toast.success('Login realizado com sucesso!');
          navigate('/app');
        }
      }
    } catch (err) {
      console.error('Erro no login:', err);
      toast.error('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!name || !email || !password) {
      toast.error('Preencha todos os campos');
      setLoading(false);
      return;
    }

    try {
      const { error } = await register(email, password, name);
      
      if (error) {
        toast.error(error);
      } else {
        toast.success('Conta criada! Aguarde aprovação do administrador.');
      }
    } catch (err) {
      toast.error('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">9FIT PRO</CardTitle>
          <p className="text-gray-300">Sistema de Treinamento Personalizado</p>
        </CardHeader>
        <CardContent>
          {/* Seleção de tipo de usuário */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={userType === 'professor' ? 'default' : 'outline'}
              className={`flex-1 ${userType === 'professor' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white border-white/30'}`}
              onClick={() => setUserType('professor')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Professor
            </Button>
            <Button
              variant={userType === 'aluno' ? 'default' : 'outline'}
              className={`flex-1 ${userType === 'aluno' ? 'bg-orange-500 hover:bg-orange-600' : 'text-white border-white/30'}`}
              onClick={() => setUserType('aluno')}
            >
              <UserCircle className="w-4 h-4 mr-2" />
              Aluno
            </Button>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-black/30">
              <TabsTrigger value="login" className="text-white data-[state=active]:bg-orange-500">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="register" className="text-white data-[state=active]:bg-orange-500" disabled={userType === 'aluno'}>
                Cadastrar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-white">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-white">Senha</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : `Entrar como ${userType === 'professor' ? 'Professor' : 'Aluno'}`}
                </Button>

                {userType === 'aluno' && (
                  <p className="text-xs text-center text-gray-400">
                    Use as credenciais enviadas pelo seu professor via email ou WhatsApp
                  </p>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-white">Nome Completo</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-white">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-white">Senha</Label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma senha"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  disabled={loading}
                >
                  {loading ? 'Criando conta...' : 'Criar conta de Professor'}
                </Button>

                <p className="text-xs text-center text-gray-400">
                  Após o cadastro, aguarde aprovação do administrador para acessar o sistema.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="text-center">
              <Link to="/" className="text-sm text-orange-400 hover:text-orange-300">
                ← Voltar ao início
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
