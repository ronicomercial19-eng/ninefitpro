import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, BarChart3, Briefcase, Dumbbell, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { COMMERCIAL_PLANS, OFFER_SCOPE, SUPPORT_EMAIL, commercialPlanHref } from '@/config/commercialOffer';
import { PlansHeroBackdrop } from '@/components/9fit/PlansHero';
import { PaywallPlans } from '@/components/9fit/PaywallPlans';

const benefits = [
  { Icon: Dumbbell, title: 'Saiba o que treinar', text: 'Planeje a sessão e registre séries, cargas e repetições no app.' },
  { Icon: BarChart3, title: 'Enxergue sua evolução', text: 'Acompanhe seus registros de treino, medidas e hábitos ao longo do tempo.' },
  { Icon: RefreshCw, title: 'Ajuste à sua rotina', text: 'Registre como você está antes de treinar e acompanhe os ajustes da sessão.' },
];

/** Public student offer; professional acquisition has its own route and contract. */
export default function Home() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const authReturn = /[?&](entry|code|token_hash|error)=/.test(location.search) || /access_token|error_description/.test(location.hash);
  if (authReturn || user) return <Navigate to={`/auth${location.search}${location.hash}`} replace />;
  if (loading) return <div role="status" aria-label="Carregando" className="min-h-screen bg-[#070708]" />;

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <Helmet>
        <title>9FIT PRO | Seu treino organizado. Sua evolução registrada.</title>
        <meta name="description" content="Treine no 9FIT PRO: planejamento, registro de cargas, medidas e hábitos. Conheça os planos de 1 e 12 meses para o aluno." />
      </Helmet>
      <PlansHeroBackdrop size="lg" />
      <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <span className="font-display text-2xl font-black tracking-tight">9<span className="text-primary">FIT</span> PRO</span>
        <nav aria-label="Acessos" className="flex items-center gap-4 text-sm">
          <Link to="/sales" className="text-neutral-300 underline-offset-4 hover:text-white hover:underline">Sou profissional</Link>
          <Link to="/auth" className="inline-flex min-h-11 items-center rounded-xl border border-white/20 bg-black/30 px-4 backdrop-blur hover:bg-white/10">Entrar</Link>
        </nav>
      </header>
      <section className="relative z-10 mx-auto grid max-w-6xl items-start gap-10 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div className="space-y-6 lg:sticky lg:top-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">NINE PRO · App do aluno</p>
          <h1 className="max-w-2xl font-display text-[clamp(2.5rem,5vw,4.5rem)] font-black italic leading-[1.02] tracking-tight">Seu treino organizado.<br /><span className="text-primary">Sua evolução registrada.</span></h1>
          <p className="max-w-lg text-lg leading-relaxed text-neutral-300">Planeje, treine e acompanhe o que você fez. Seus treinos, medidas e hábitos juntos no app.</p>
          <a href="#planos" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground hover:brightness-110">Escolher meu plano <ArrowRight size={18} aria-hidden="true" /></a>
          <dl className="grid max-w-lg grid-cols-3 gap-3 border-t border-white/10 pt-6">
            {['Treinos', 'Evolução', 'Hábitos'].map((label, i) => <div key={label}><dt className="text-xs text-neutral-400">0{i + 1}</dt><dd className="mt-1 text-sm font-semibold">{label}</dd></div>)}
          </dl>
        </div>
        <section id="planos" className="min-w-0 scroll-mt-6 rounded-[1.5rem] border border-white/15 bg-[#121517]/95 p-5 shadow-2xl shadow-black/30 sm:p-7" aria-labelledby="student-plans-title">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Seu acesso ao app</p>
          <h2 id="student-plans-title" className="mb-2 mt-3 font-display text-3xl font-extrabold tracking-tight">Escolha seu ritmo.</h2>
          <p className="mb-6 text-sm text-neutral-400">Os mesmos recursos, por 1 ou 12 meses.</p>
          <PaywallPlans plans={COMMERCIAL_PLANS} initialPlanId={params.get('plan')} hrefFor={commercialPlanHref} />
          <p className="mt-4 text-center text-xs leading-relaxed text-neutral-400">Escolha o plano → entre ou crie sua conta → pague com segurança.</p>
        </section>
      </section>
      <section aria-label="O que você acompanha no app" className="relative z-10 mx-auto grid max-w-6xl gap-4 px-5 pb-14 sm:px-8 md:grid-cols-3">
        {benefits.map(({Icon, title, text}) => <article key={title} className="rounded-2xl border border-white/10 bg-[#121517] p-6"><Icon className="h-6 w-6 text-primary" aria-hidden="true" /><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-neutral-400">{text}</p></article>)}
      </section>
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-14 sm:px-8">
        <p className="max-w-3xl text-xs leading-relaxed text-neutral-400">{OFFER_SCOPE}</p>
        <aside className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/10 p-6" aria-label="Para profissionais">
          <div className="flex items-start gap-4"><Briefcase className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><div><h2 className="font-bold">Você prescreve e acompanha alunos?</h2><p className="mt-1 text-sm text-neutral-400">Conheça o NINE CORE, o espaço de trabalho do profissional.</p></div></div>
          <Link to="/sales" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 px-4 text-sm font-semibold text-primary">Conhecer NINE CORE <ArrowRight size={16} aria-hidden="true" /></Link>
        </aside>
      </section>
      <footer className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-6 text-xs text-neutral-400 sm:px-8">
        <span>© {new Date().getFullYear()} 9FIT PRO</span><span className="flex flex-wrap gap-4"><Link to="/suporte">Suporte</Link><a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></span>
      </footer>
    </main>
  );
}
