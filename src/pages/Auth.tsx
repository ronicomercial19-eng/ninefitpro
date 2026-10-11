import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Eye, 
  EyeOff, 
  Dumbbell, 
  Zap, 
  Phone, 
  Activity, 
  Bot, 
  CheckCircle2, 
  Flame, 
  Sparkles, 
  ShieldCheck,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SUPER_ADMIN_EMAIL = 'roni.comercial19@gmail.com';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login, register, user, profile } = useAuth();
  const navigate = useNavigate();

  // Se já logado, redirecionar baseado no tipo de usuário
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (user) {
        await handleRedirectByRole(user.id, user.email);
      }
    };
    checkAndRedirect();
  }, [user]);

  const handleRedirectByRole = async (userId: string, userEmail?: string | null) => {
    try {
      // Super admin check
      if (userEmail === SUPER_ADMIN_EMAIL) {
        navigate("/app");
        return;
      }

      // Check user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      // Check if athlete
      const { data: athleteLink } = await supabase
        .from('athlete_auth_link')
        .select('athlete_id')
        .eq('user_id', userId)
        .single();

      if (athleteLink) {
        // Check first access
        const localCompleted = localStorage.getItem('9fit_first_access_completed');
        if (localCompleted !== 'true') {
          const { data: athlete } = await supabase
            .from('athletes')
            .select('password_changed')
            .eq('id', athleteLink.athlete_id)
            .maybeSingle();

          if (athlete && athlete.password_changed === false) {
            navigate("/9fit/first-access");
            return;
          }
        }
        navigate("/9fit/hub");
      } else if (roleData?.role === 'super_admin' || roleData?.role === 'admin' || roleData?.role === 'trainer') {
        navigate("/app");
      } else {
        navigate("/9fit/hub");
      }
    } catch (error) {
      navigate("/9fit/hub");
    }
  };

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
      
      // Get current user and redirect
      const { data: { user: loggedUser } } = await supabase.auth.getUser();
      
      if (loggedUser) {
        await handleRedirectByRole(loggedUser.id, loggedUser.email);
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
        toast.success('Conta criada! Redirecionando...');
        navigate('/9fit/hub');
      }
    } catch (err) {
      toast.error('Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao conectar com Google');
    }
  };

  if (user && profile) {
    return null; // useEffect will handle redirect
  }

  return (
    <div className="min-h-screen bg-[#070708] text-foreground flex flex-col justify-between relative overflow-hidden selection:bg-primary/30 selection:text-white">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 -left-32 w-[550px] h-[550px] bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Tactical Matrix Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />

        {/* Ambient Top Light Flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      {/* Top Bar Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/25 transform rotate-2">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display text-2xl font-black tracking-tight text-white">
              9<span className="text-primary">FIT</span>
              <span className="text-xs font-semibold text-neutral-400 ml-1.5 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase tracking-wider">PRO</span>
            </span>
          </div>
        </div>

        {/* Quick External Link */}
        <div className="flex items-center gap-3">
          <a
            href="https://ninelogin.lovable.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
          >
            <span>Portal Unificado 9FIT</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </a>
        </div>
      </header>

      {/* Main Content Showcase & Auth Form */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: Visual Showcase & Cards Presentation (Desktop / Tablet) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6">
            
            {/* Status Tag */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-medium text-neutral-300 tracking-wide uppercase font-mono">
                9FIT ECOSYSTEM // PLATAFORMA INTELIGENTE
              </span>
            </div>

            {/* Hero Heading */}
            <div className="space-y-3 max-w-xl">
              <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
                Treinamento de elite e biometria com precisão cirúrgica.
              </h1>
              <p className="text-base text-neutral-400 leading-relaxed">
                Gestão completa para personal trainers, periodização adaptativa com IA, 
                execução guiada em tempo real e ecossistema integrado para seus atletas.
              </p>
            </div>

            {/* Visual Cinematic Card with Floating Interactive Badges */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-neutral-900/60 shadow-2xl group">
              {/* Background Athletic Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <img 
                  src="/images/treino-focado.png" 
                  alt="Atleta em treino de alta intensidade"
                  className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.1] transition-transform duration-700 group-hover:scale-105"
                  loading="eager"
                />
                
                {/* Dark Vignette & Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#070708] via-transparent to-black/50 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Card 1: Ron Neural Coach Status (Top Left) */}
              <div className="absolute top-4 left-4 max-w-[280px] p-3.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl animate-fade-in">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">RON NEURAL COACH</div>
                    <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Prontidão de Carga: 94%
                    </div>
                  </div>
                </div>
                <p className="text-xs text-neutral-200 leading-snug">
                  "Sua recuperação está ótima hoje. O volume de pernas foi calibrado para progressão de carga."
                </p>
              </div>

              {/* Floating Card 2: Live Sync Score Indicator (Bottom Right) */}
              <div className="absolute bottom-4 right-4 p-3 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-primary/80 bg-primary/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Sync Score Diário</div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>98.5% Sincronizado</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Subtle Bottom Bar on the Image */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-neutral-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Criptografia e RLS Soberano
                </span>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-primary shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-white">SmartTreino</div>
                  <div className="text-[11px] text-neutral-400">Execução guiada</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-white">FitCopilot IA</div>
                  <div className="text-[11px] text-neutral-400">Periodização ativa</div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-white">9Foods & Hub</div>
                  <div className="text-[11px] text-neutral-400">Nutrição integrada</div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Interactive Auth Card (Mobile & Desktop) */}
          <div className="w-full lg:col-span-5 max-w-md mx-auto">
            
            {/* Mobile Branding Banner (Visible on smaller screens) */}
            <div className="lg:hidden text-center mb-6">
              <div className="relative inline-block mb-3">
                <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full scale-125" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center transform rotate-2 shadow-xl shadow-primary/30 mx-auto">
                  <Dumbbell className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="font-display text-3xl font-black text-white tracking-tight">
                9<span className="text-primary">FIT</span>
                <span className="text-sm font-semibold text-neutral-400 ml-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 uppercase">PRO</span>
              </h1>
              <p className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Sistema de Treinamento Inteligente
              </p>
            </div>

            {/* Main Auth Container Card */}
            <div className="bg-[#0f0f11]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 relative">
              
              {/* Subtle top card accent line */}
              <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-neutral-900/90 border border-white/5 p-1 rounded-xl mb-6">
                  <TabsTrigger 
                    value="login" 
                    id="tab-login"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md font-semibold text-sm rounded-lg transition-all py-2.5"
                  >
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger 
                    value="register" 
                    id="tab-register"
                    className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md font-semibold text-sm rounded-lg transition-all py-2.5"
                  >
                    Cadastrar
                  </TabsTrigger>
                </TabsList>
                
                {/* LOGIN TAB CONTENT */}
                <TabsContent value="login" className="mt-0 focus-visible:outline-none">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-xs font-medium text-neutral-300">
                        Email de acesso
                      </Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="bg-neutral-900/70 border-white/10 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary h-12 rounded-xl"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-xs font-medium text-neutral-300">
                          Senha
                        </Label>
                        <Link 
                          to="/forgot-password" 
                          className="text-xs text-primary/90 hover:text-primary transition-colors hover:underline"
                        >
                          Esqueceu a senha?
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-neutral-900/70 border-white/10 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary h-12 rounded-xl pr-12"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          id="toggle-password-btn"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      id="submit-login-btn"
                      className="w-full h-12 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-500 text-white font-bold text-base shadow-lg shadow-primary/20 transition-all rounded-xl mt-2 active:scale-[0.99]"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Acessando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Zap className="w-4 h-4 fill-white/20" />
                          <span>Entrar no Sistema</span>
                        </div>
                      )}
                    </Button>

                    {/* Social Divider */}
                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                        <span className="bg-[#0f0f11] px-3 text-neutral-500 font-mono">ou acesse com</span>
                      </div>
                    </div>

                    {/* Google OAuth Button */}
                    <Button
                      type="button"
                      id="google-login-btn"
                      variant="outline"
                      className="w-full h-12 border-white/10 bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-200 hover:text-white transition-all rounded-xl"
                      onClick={handleGoogleLogin}
                    >
                      <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continuar com Google
                    </Button>
                  </form>
                </TabsContent>
                
                {/* REGISTER TAB CONTENT */}
                <TabsContent value="register" className="mt-0 focus-visible:outline-none">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="register-name" className="text-xs font-medium text-neutral-300">
                        Nome Completo
                      </Label>
                      <Input
                        id="register-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Carlos Silva"
                        className="bg-neutral-900/70 border-white/10 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary h-12 rounded-xl"
                        required
                        autoComplete="name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="register-email" className="text-xs font-medium text-neutral-300">
                        Email
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        className="bg-neutral-900/70 border-white/10 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary h-12 rounded-xl"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="register-phone" className="text-xs font-medium text-neutral-300">
                        WhatsApp (opcional)
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <Input
                          id="register-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="bg-neutral-900/70 border-white/10 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary h-12 rounded-xl pl-11"
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="register-password" className="text-xs font-medium text-neutral-300">
                        Senha (mínimo 6 dígitos)
                      </Label>
                      <div className="relative">
                        <Input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-neutral-900/70 border-white/10 text-white placeholder:text-neutral-500 focus:border-primary focus:ring-1 focus:ring-primary h-12 rounded-xl pr-12"
                          required
                          minLength={6}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          id="toggle-reg-password-btn"
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors p-1"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      id="submit-register-btn"
                      className="w-full h-12 bg-gradient-to-r from-primary to-orange-600 hover:from-primary/90 hover:to-orange-500 text-white font-bold text-base shadow-lg shadow-primary/20 transition-all rounded-xl mt-2 active:scale-[0.99]"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Criando conta...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Criar Minha Conta</span>
                        </div>
                      )}
                    </Button>

                    {/* Social Divider */}
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
                        <span className="bg-[#0f0f11] px-3 text-neutral-500 font-mono">ou cadastre com</span>
                      </div>
                    </div>

                    {/* Google OAuth Button */}
                    <Button
                      type="button"
                      id="google-register-btn"
                      variant="outline"
                      className="w-full h-12 border-white/10 bg-neutral-900/60 hover:bg-neutral-800/80 text-neutral-200 hover:text-white transition-all rounded-xl"
                      onClick={handleGoogleLogin}
                    >
                      <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Cadastrar com Google
                    </Button>

                    <p className="text-[11px] text-center text-neutral-400 mt-2">
                      Ao se cadastrar, você concorda com os termos de uso do 9FIT PRO.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            {/* Mobile quick link to unified portal */}
            <div className="mt-4 text-center lg:hidden">
              <a
                href="https://ninelogin.lovable.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-400 hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                Acesso unificado pelo <span className="text-primary font-medium">Portal 9FIT</span>
                <ArrowRight className="w-3 h-3 text-primary" />
              </a>
            </div>

          </div>

        </div>
      </main>

      {/* Modern Compact Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 border-t border-white/5 gap-2">
        <p>© 2026 9FIT PRO — Sistema de Treinamento Inteligente.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Sistemas Operacionais Online
          </span>
          <a href="/sales" className="hover:text-neutral-300 transition-colors">Planos & Preços</a>
          <a href="/suporte" className="hover:text-neutral-300 transition-colors">Suporte</a>
        </div>
      </footer>
    </div>
  );
};

export default Auth;

