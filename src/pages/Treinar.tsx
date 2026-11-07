import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ClipboardList, BarChart3, RefreshCw } from 'lucide-react';
import { COMMERCIAL_PLANS, OFFER_SCOPE, SUPPORT_EMAIL, commercialPlanHref } from '@/config/commercialOffer';
import { PlansHeroBackdrop } from '@/components/9fit/PlansHero';
import { PaywallPlans } from '@/components/9fit/PaywallPlans';

const steps = [
  { Icon: ClipboardList, title: 'Planeje e execute', text: 'Siga o planejamento e registre sessões e cargas no dia a dia.' },
  { Icon: BarChart3, title: 'Acompanhe a evolução', text: 'Consulte o histórico real do que você fez e das suas medidas.' },
  { Icon: RefreshCw, title: 'Ajuste conforme o contexto', text: 'Adapte o treino quando a rotina ou o corpo mudam, com base no que você registra.' },
];

/** Página de venda do aluno (pública): benefícios, planos e CTA direto para o checkout. */
export default function Treinar() {
  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#070708] text-white">
      <Helmet>
        <title>Quero treinar | 9FIT PRO</title>
        <meta name="description" content="Treino no app, registro de cargas e histórico de evolução. Pagamento único, sem renovação automática." />
      </Helmet>
      <PlansHeroBackdrop size="lg" />

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="font-display text-2xl font-black tracking-tight">9<span className="text-primary">FIT</span> PRO</Link>
        <Link to="/auth" className="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm backdrop-blur hover:bg-white/10">Entrar</Link>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-10 pt-52">
        <h1 className="max-w-2xl font-display text-4xl font-black italic tracking-tight sm:text-5xl">Seu treino organizado. Sua evolução registrada.</h1>
        <p className="mt-4 max-w-xl text-base text-neutral-300">O 9FIT PRO reúne planejamento, execução e histórico em um só lugar. Você registra o que faz e acompanha a evolução com clareza.</p>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-4 px-5 pb-12 sm:grid-cols-3">
        {steps.map(({ Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 font-bold">{title}</h2>
            <p className="mt-1 text-sm text-neutral-400">{text}</p>
          </div>
        ))}
      </section>

      <section id="planos" className="relative z-10 mx-auto max-w-lg scroll-mt-6 px-5 pb-12">
        <h2 className="font-display text-3xl font-extrabold tracking-tight">Escolha o período de acesso</h2>
        <p className="mb-6 mt-2 text-sm text-neutral-400">Um produto digital, com os mesmos benefícios no mensal e no anual.</p>
        <PaywallPlans plans={COMMERCIAL_PLANS} hrefFor={commercialPlanHref} />
        <p className="mt-6 text-xs text-neutral-500">{OFFER_SCOPE}</p>
      </section>

      <section className="relative z-10 mx-auto max-w-lg px-5 pb-16">
        <h2 className="mb-4 font-display text-2xl font-extrabold">Dúvidas frequentes</h2>
        <details className="border-t border-white/15 py-4">
          <summary className="cursor-pointer font-semibold">Preciso ter conta antes de pagar?</summary>
          <p className="mt-3 text-sm text-neutral-400">Sim. Você escolhe o período, entra ou cria sua conta e só então segue para o pagamento, para o acesso ficar vinculado à conta certa.</p>
        </details>
        <details className="border-t border-white/15 py-4">
          <summary className="cursor-pointer font-semibold">O pagamento renova sozinho?</summary>
          <p className="mt-3 text-sm text-neutral-400">Não. É pagamento único, sem renovação automática. O acesso é liberado após a confirmação do pagamento.</p>
        </details>
        <details className="border-y border-white/15 py-4">
          <summary className="cursor-pointer font-semibold">Sou profissional. É aqui?</summary>
          <p className="mt-3 text-sm text-neutral-400">Para planejar, prescrever e acompanhar alunos, veja a <Link to="/sales" className="text-primary underline underline-offset-4">página para profissionais</Link>.</p>
        </details>
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
