import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Dumbbell, Eye, EyeOff, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveLoginDestination } from '@/services/loginDestination.service';
import { AUTH_CALLBACK } from '@/lib/loginDestination';
import { entryStorage, rememberEntry } from '@/lib/customerEntry';
import { postLoginDestination } from '@/lib/professionalReturn';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const googleMark = (
  <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const fieldClass = 'h-12 w-full rounded-xl border border-white/15 bg-[#181818] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-[#ff783f] focus:ring-2 focus:ring-[#ff783f]/20';
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-[0.13em] text-zinc-300';
const primaryClass = 'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f4773e] px-5 text-sm font-bold text-[#16100d] transition hover:bg-[#ff925b] disabled:cursor-wait disabled:opacity-60';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const intent = new URLSearchParams(window.location.search).get('entry');
    if (intent === 'start' || intent === 'payment_return' || intent === 'purchase') rememberEntry(entryStorage(), intent);
  }, []);

  useEffect(() => {
    if (!user) return;
    void resolveLoginDestination(user.id)
      .then((destination) => navigate(postLoginDestination(destination), { replace: true }))
      .catch(() => toast.error('Não foi possível carregar seu perfil. Tente entrar novamente.'));
  }, [user, navigate]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await login(email, password);
      if (error) { toast.error(error); return; }
      // AuthContext publishes the signed-in user; the effect above resolves one destination.
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login');
    } finally { setLoading(false); }
  };

  const handleRegister = async (event: FormEvent) => {
    event.preventDefault();
    if (!name || !email || !password) { toast.error('Preencha todos os campos'); return; }
    setLoading(true);
    try {
      const { error, needsEmailConfirmation } = await register(email, password, name);
      if (error) toast.error(error);
      else if (needsEmailConfirmation) toast.success('Confirme seu e-mail para acessar a 9FIT PRO.');
      else navigate(AUTH_CALLBACK, { replace: true });
    } catch { toast.error('Erro ao criar conta'); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: `${window.location.origin}${AUTH_CALLBACK}` },
      });
      if (error) throw error;
    } catch (error: any) { toast.error(error.message || 'Erro ao conectar com Google'); }
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#0a0a0a] text-white selection:bg-[#f4773e]/40">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)', backgroundSize: '52px 52px' }} />
      <div aria-hidden="true" className="pointer-events-none absolute -left-48 top-12 h-[620px] w-[620px] rounded-full bg-[#f4773e]/10 blur-[130px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-px w-2/3 bg-gradient-to-r from-transparent via-[#f4773e]/50 to-transparent" />

      <div className="relative mx-auto grid min-h-[100svh] max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
        <section className="flex flex-col px-6 pb-6 pt-7 sm:px-10 lg:px-16 lg:py-12">
          <Link to="/" className="inline-flex w-fit items-center gap-3" aria-label="9FIT PRO — página inicial">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#f4773e]/45 bg-[#f4773e]/10 text-[#f4773e]"><Dumbbell className="h-5 w-5" /></span>
            <span className="font-display text-2xl font-black italic tracking-tight">9FIT<span className="ml-1 text-sm not-italic tracking-[0.18em] text-[#f4773e]">PRO</span></span>
          </Link>

          <div className="mx-auto mt-10 w-full max-w-[690px] lg:my-auto lg:py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f4773e]/35 bg-[#f4773e]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#ff945f]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff945f]" /> Seu espaço de evolução
            </div>
            <h1 className="font-display text-4xl font-black uppercase leading-[0.98] tracking-[-0.055em] sm:text-6xl xl:text-[76px]">
              Treine com<br /><span className="text-[#f4773e]">direção.</span><br />Evolua com<br />clareza.
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              Seu plano, seus treinos e sua evolução em um só lugar. Com acompanhamento profissional ou na sua própria jornada.
            </p>

            <div className="mt-9 hidden grid-cols-3 gap-3 sm:grid">
              {[
                { number: '01', title: 'PLANEJE', detail: 'Cada fase tem um propósito.' },
                { number: '02', title: 'TREINE', detail: 'Saiba exatamente o que fazer.' },
                { number: '03', title: 'EVOLUA', detail: 'Veja o progresso acontecer.' },
              ].map((item) => (
                <div key={item.number} className="min-h-28 border-t border-white/20 pt-4">
                  <span className="font-mono text-xs text-[#f4773e]">{item.number} /</span>
                  <p className="mt-3 text-xs font-black tracking-[0.16em]">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden items-center gap-2 text-xs text-zinc-500 lg:flex"><Activity className="h-4 w-4 text-[#f4773e]" /> FIT OS · 9FIT PRO</div>
        </section>

        <section className="flex items-center justify-center border-t border-white/10 bg-[#111111]/85 px-5 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-14 lg:py-12">
          <div className="w-full max-w-[440px]">
            <div className="mb-8">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-[#f4773e]">Acesso FitPro</p>
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Seu próximo passo começa aqui.</h2>
              <p className="mt-3 text-sm text-zinc-400">Entre na sua conta ou crie seu acesso para continuar.</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="mb-7 grid h-12 w-full grid-cols-2 rounded-xl border border-white/10 bg-[#1b1b1b] p-1">
                <TabsTrigger value="login" id="tab-login" className="h-10 rounded-lg text-sm font-semibold text-zinc-400 data-[state=active]:bg-[#f4773e] data-[state=active]:text-[#16100d]">Entrar</TabsTrigger>
                <TabsTrigger value="register" id="tab-register" className="h-10 rounded-lg text-sm font-semibold text-zinc-400 data-[state=active]:bg-[#f4773e] data-[state=active]:text-[#16100d]">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 focus-visible:outline-none">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div><label htmlFor="login-email" className={labelClass}>Email de acesso</label><input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required className={fieldClass} /></div>
                  <div>
                    <div className="flex items-center justify-between"><label htmlFor="login-password" className={labelClass}>Senha</label><Link to="/forgot-password" className="mb-2 text-xs font-semibold text-[#ff945f] hover:underline">Esqueceu a senha?</Link></div>
                    <div className="relative"><input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" autoComplete="current-password" required className={`${fieldClass} pr-12`} /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-400 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                  <button type="submit" id="submit-login-btn" disabled={loading} className={primaryClass}>{loading ? 'Entrando…' : <>Entrar na minha conta <ArrowRight className="h-4 w-4" /></>}</button>
                </form>
                <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500"><span className="h-px flex-1 bg-white/10" />ou continue com<span className="h-px flex-1 bg-white/10" /></div>
                <button type="button" id="google-login-btn" onClick={handleGoogleLogin} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-[#1b1b1b] text-sm font-semibold text-white transition hover:border-white/35 hover:bg-[#242424]">{googleMark} Continuar com Google</button>
              </TabsContent>

              <TabsContent value="register" className="mt-0 focus-visible:outline-none">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div><label htmlFor="register-name" className={labelClass}>Nome completo</label><input id="register-name" type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" autoComplete="name" required className={fieldClass} /></div>
                  <div><label htmlFor="register-email" className={labelClass}>Email</label><input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" autoComplete="email" required className={fieldClass} /></div>
                  <div><label htmlFor="register-phone" className={labelClass}>WhatsApp <span className="font-normal normal-case tracking-normal text-zinc-500">(opcional)</span></label><div className="relative"><Phone className="absolute left-4 top-4 h-4 w-4 text-zinc-500" /><input id="register-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 99999-9999" autoComplete="tel" className={`${fieldClass} pl-11`} /></div></div>
                  <div><label htmlFor="register-password" className={labelClass}>Senha <span className="font-normal normal-case tracking-normal text-zinc-500">(mínimo 6 caracteres)</span></label><div className="relative"><input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Crie uma senha" autoComplete="new-password" required minLength={6} className={`${fieldClass} pr-12`} /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-zinc-400 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                  <button type="submit" id="submit-register-btn" disabled={loading} className={primaryClass}>{loading ? 'Criando conta…' : <>Criar minha conta <ArrowRight className="h-4 w-4" /></>}</button>
                </form>
                <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500"><span className="h-px flex-1 bg-white/10" />ou cadastre com<span className="h-px flex-1 bg-white/10" /></div>
                <button type="button" id="google-register-btn" onClick={handleGoogleLogin} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-[#1b1b1b] text-sm font-semibold text-white transition hover:border-white/35 hover:bg-[#242424]">{googleMark} Cadastrar com Google</button>
                <p className="mt-4 text-center text-xs text-zinc-500">Ao criar sua conta, você concorda com os termos de uso do 9FIT PRO.</p>
              </TabsContent>
            </Tabs>

            <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-zinc-400">Ainda não conhece o FitPro? <Link to="/treinar" className="font-semibold text-[#ff945f] hover:underline">Quero treinar</Link><span className="mx-2 text-zinc-600">·</span><Link to="/sales" className="font-semibold text-[#ff945f] hover:underline">Sou profissional</Link></div>
            <a href="https://ninelogin.lovable.app" target="_blank" rel="noopener noreferrer" className="mt-5 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-[#ff945f]">Acesso pelo Portal 9FIT <ArrowRight className="h-3 w-3" /></a>
          </div>
        </section>
      </div>
      <footer className="relative border-t border-white/10 px-6 py-4 text-center text-[11px] text-zinc-500 sm:flex sm:justify-between sm:px-10 lg:hidden"><span>© {new Date().getFullYear()} 9FIT PRO</span><span className="mt-1 flex justify-center gap-4 sm:mt-0"><Link to="/sales">Profissionais</Link><Link to="/suporte">Suporte</Link></span></footer>
    </main>
  );
}
