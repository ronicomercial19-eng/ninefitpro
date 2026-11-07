import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Briefcase, Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { COMMERCIAL_PLANS, OFFER_SCOPE, SUPPORT_EMAIL, commercialPlanHref } from '@/config/commercialOffer';
import { PlansHeroBackdrop } from '@/components/9fit/PlansHero';
import { PaywallPlans } from '@/components/9fit/PaywallPlans';
import { BrandSplash, splashSeen } from '@/components/9fit/BrandSplash';

const AUDIENCE_KEY = 'nine:audience';
type Audience = 'treinar' | 'profissional';

function readAudience(): Audience | null {
  try {
    const value = localStorage.getItem(AUDIENCE_KEY);
    return value === 'treinar' || value === 'profissional' ? value : null;
  } catch { return null; }
}
function rememberAudience(value: Audience) {
  try { localStorage.setItem(AUDIENCE_KEY, value); } catch { /* Optional browser storage. */ }
}

/**
 * Homepage pública (rota "/"): copy da marca, dois caminhos (treinar / profissional)
 * e os planos do aluno com CTA direto pro checkout. Quem já está logado, ou chega com
 * parâmetros de login/retorno, é encaminhado para /auth e segue o fluxo de sempre.
 */
export default function Home() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [splash, setSplash] = useState(() => !splashSeen());
  const finishSplash = useCallback(() => setSplash(false), []);
  const [lastAudience] = useState(readAudience);

  const authReturn = /[?&](entry|code|token_hash|error)=/.test(location.search) || /access_token|error_description/.test(location.hash);
  if (authReturn || user) return <Navigate to={`/auth${location.search}${location.hash}`} replace />;
  if (loading) return <div className="min-h-screen bg-[#070708]" />;
  if (splash) return <BrandSplash onDone={finishSplash} />;

  const from = COMMERCIAL_PLANS[0].price;
  const paths: { id: Audience; to: string; title: string; text: string; Icon: typeof Dumbbell }[] = [
    { id: 'treinar', to: '/treinar', title: 'Quero treinar', text: `Treino no app, registro de cargas e histórico de evolução. A partir de ${from}.`, Icon: Dumbbell },
    { id: 'profissional', to: '/sales', title: 'Sou profissional', text: 'Quero profissionalizar meu atendimento: planejar o ciclo, prescrever e acompanhar o que o aluno executou.', Icon: Briefcase },
  ];

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <Helmet>
        <title>9FIT PRO | Seu treino organizado. Sua evolução registrada.</title>
        <meta name="description" content="Planejamento, execução e histórico de treino em um só lugar. Escolha treinar ou profissionalizar seu atendimento." />
      </Helmet>
      <PlansHeroBackdrop size="lg" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="font-display text-2xl font-black tracking-tight">9<span className="text-primary">FIT</span> PRO</span>
        <Link to="/auth" className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm backdrop-blur hover:bg-white/10">Entrar</Link>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-12 pt-52">
        <h1 className="max-w-2xl font-display text-4xl font-black italic tracking-tight sm:text-5xl">Seu treino organizado. Sua evolução registrada.</h1>
        <p className="mt-4 max-w-xl text-base text-neutral-300">Planejamento, execução e histórico em um só lugar. Sem promessa milagrosa: organização e continuidade.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {paths.map(({ id, to, title, text, Icon }) => (
            <Link
              key={id}
              to={to}
              onClick={() => rememberAudience(id)}
              className={`group relative rounded-2xl border bg-white/[0.04] p-5 backdrop-blur-md transition-colors hover:bg-white/[0.08] ${lastAudience === id ? 'border-primary' : 'border-white/10'}`}
            >
              {lastAudience === id && <span className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">Seu último acesso</span>}
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h2 className="mt-3 flex items-center gap-2 text-xl font-bold">{title}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></h2>
              <p className="mt-2 text-sm text-neutral-400">{text}</p>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-neutral-400">
          Já tem conta? <Link to="/auth" className="text-primary underline underline-offset-4">Entrar</Link>
          <span className="mx-2">·</span>
          <a href="#planos" className="text-primary underline underline-offset-4">Ver planos e preço</a>
        </p>
      </section>

      <section id="planos" className="relative z-10 mx-auto max-w-lg scroll-mt-6 px-5 pb-16">
        <h2 className="font-display text-3xl font-extrabold tracking-tight">Planos do 9FIT PRO</h2>
        <p className="mb-6 mt-2 text-sm text-neutral-400">Um produto digital. Escolha o período de acesso.</p>
        <PaywallPlans plans={COMMERCIAL_PLANS} hrefFor={commercialPlanHref} />
        <p className="mt-6 text-xs text-neutral-500">{OFFER_SCOPE}</p>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-6 text-xs text-neutral-500">
        <span>© {new Date().getFullYear()} 9FIT PRO</span>
        <span className="flex gap-4">
          <Link to="/suporte" className="hover:text-neutral-300">Suporte</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-neutral-300">{SUPPORT_EMAIL}</a>
        </span>
      </footer>
    </main>
  );
}
