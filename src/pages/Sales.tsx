import { useState } from "react";
import { ArrowDown, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { COMMERCIAL_PLANS, OFFER_BENEFITS, OFFER_SCOPE, CHECKOUT_READY, SUPPORT_EMAIL, commercialPlanHref } from "@/config/commercialOffer";
import { PlansGlow } from "@/components/9fit/PlansHero";

const coreScreens = [
  { label: "Prescrição", file: "prescricao.png" },
  { label: "Dashboard", file: "dashboard.png" },
  { label: "Agenda", file: "agenda.png" },
  { label: "HealthFlix", file: "healthflix.png" },
];

const steps = [
  { title: "Planeje o ciclo", detail: "Organize o ano em fases e semanas, com objetivos e parâmetros de treino." },
  { title: "Revise a semana", detail: "Parta das sessões geradas ou monte a prescrição com os seus exercícios e modelos." },
  { title: "Oriente na sessão", detail: "Seu aluno faz o check-in do SYNC, abre o treino e registra séries, cargas e repetições." },
  { title: "Decida a próxima dose", detail: "Consulte o histórico de execução antes de ajustar a sessão seguinte." },
];
const expansions = [
  ["Conteúdo sob sua marca", "Aulas gravadas, protocolos e área de estudos para entregar seu método entre as sessões."],
  ["Venda de programas", "Uma vitrine para comercializar seus programas e produtos."],
  ["Equipe de atendimento", "Estrutura para selecionar profissionais e organizar a operação da sua equipe."],
];
const cta = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ff5a1f] px-5 py-3 font-semibold text-[#0a0b0c] transition-colors hover:bg-[#ff7848] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7848]";

export default function Sales() {
  const [params] = useSearchParams();
  const [screenIndex, setScreenIndex] = useState(0);
  const screen = coreScreens[screenIndex];
  const moveScreen = (offset: number) =>
    setScreenIndex(current => (current + offset + coreScreens.length) % coreScreens.length);

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,#302016_0%,#0a0b0c_45rem)] text-[#f4f2ee]">
      <Helmet>
        <title>NINE CORE e NINE PRO | Plataforma para personal trainers</title>
        <meta name="description" content="Planeje, prescreva e acompanhe no NINE CORE. Seu aluno recebe a orientação e registra o treino no app NINE PRO." />
      </Helmet>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <nav aria-label="Navegação comercial" className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-white/10 py-4">
          <Link to="/" className="text-xl font-black tracking-tight">NINE <span className="text-[#ff5a1f]">PRO</span></Link>
          <div className="flex items-center gap-5 text-sm">
            <a href="#planos" className="text-white/70 hover:text-white">Planos do app</a>
            <Link to="/login" className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Entrar</Link>
          </div>
        </nav>

        <section className="relative isolate grid items-center gap-10 border-b border-[#ff5a1f]/25 py-14 md:py-24 lg:grid-cols-[0.95fr_1.05fr]">
          <PlansGlow />
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-[#ff5a1f]/35 bg-[#ff5a1f]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#ff9c76]">Plataforma para personal trainers</p>
            <h1 className="font-display text-[clamp(2.6rem,6vw,5rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.05em]">Do improviso <span className="text-[#ff7848]">ao controle.</span></h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/70">Planeje o ciclo no NINE CORE. Seu aluno recebe o treino no NINE PRO, e você acompanha o que ele realmente executou.</p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#planos" className={cta}>Escolher meu plano <ArrowUpRight aria-hidden="true" size={18} /></a>
              <a href="#como-funciona" className="inline-flex min-h-12 items-center gap-2 text-sm underline underline-offset-4">Ver o fluxo de uma semana <ArrowDown aria-hidden="true" size={15} /></a>
            </div>
          </div>
          <figure aria-label="Galeria do NINE CORE" className="min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#151719] shadow-2xl shadow-black/50">
            <div className="relative isolate flex flex-wrap items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-gradient-to-b from-white/10 to-transparent px-4 py-3">
              <style>{'@keyframes nine-gallery-gloss { from { transform: translateX(-130%) skewX(-24deg); } to { transform: translateX(360%) skewX(-24deg); } }'}</style>
              <span key={screen.file} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 -translate-x-[130%] bg-gradient-to-r from-transparent via-white/15 to-transparent motion-safe:animate-[nine-gallery-gloss_550ms_ease-out_both]" />
              <div>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65">NINE CORE · Painel do professor</span>
                <span aria-live="polite" aria-atomic="true" className="mt-1 block text-sm font-semibold">{screen.label} · {screenIndex + 1}/{coreScreens.length}</span>
              </div>
              <div className="flex gap-2">
                <button type="button" aria-label="Tela anterior" onClick={() => moveScreen(-1)} className="grid size-11 place-items-center rounded-lg border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-[#ff7848]"><ChevronLeft aria-hidden="true" size={20} /></button>
                <button type="button" aria-label="Próxima tela" onClick={() => moveScreen(1)} className="grid size-11 place-items-center rounded-lg border border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-[#ff7848]"><ChevronRight aria-hidden="true" size={20} /></button>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,1fr)] items-end gap-2 p-3 sm:gap-4 sm:p-4">
              <img src={'/nine-pro/' + screen.file} alt={'Proposta visual do NINE CORE — ' + screen.label} width="1440" height="1000" className="h-auto w-full rounded-lg border border-white/15" />
              <img src="/nine-pro/aluno.png" alt="Hub NINE PRO do aluno com o indicador SYNC Score" className="aspect-[1/1.65] w-full rounded-lg border border-white/15 object-cover object-[center_13%]" />
            </div>
            <figcaption className="px-4 pb-4 text-xs text-white/65">NINE CORE · propostas visuais / NINE PRO · app do aluno</figcaption>
          </figure>
        </section>

        <section className="mx-auto max-w-3xl py-14 text-center sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff7848]">A rotina do personal</p>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">Abra a semana com os treinos prontos para revisar.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/70">Imagine abrir a segunda-feira com as sessões organizadas a partir do seu planejamento. Você confere a carga, ajusta o que mudou e envia o treino ao aluno. Na próxima revisão, o histórico mostra o que ele executou.</p>
        </section>

        <section id="como-funciona" className="scroll-mt-6 border-t border-white/10 py-14 text-center sm:py-20">
          <h2 className="mx-auto max-w-3xl font-display text-3xl font-extrabold uppercase tracking-tight sm:text-5xl">Do planejamento anual à próxima decisão</h2>
          <ol className="mt-10 grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ title, detail }, index) => (
              <li key={title} className="rounded-xl border border-white/10 bg-[#151719] p-5 text-left">
                <span className="text-sm font-semibold tabular-nums text-[#ff7848]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-7 rounded-2xl border border-[#ff5a1f]/25 bg-[#1b1512] p-6 sm:p-12 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff7848]">SYNC Score</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">O treino estava pronto. Seu aluno dormiu mal.</h2>
          </div>
          <p className="self-end text-lg leading-relaxed text-white/70">Antes da sessão, o aluno registra como está no SYNC Score. Ao revisar o treino, você tem o check-in e a última execução em mãos para decidir se mantém a carga ou ajusta a sessão.</p>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-[#151719] p-6 sm:p-10">
          <h2 className="text-3xl font-bold tracking-tight">Quando sua operação crescer</h2>
          <p className="mt-3 max-w-2xl text-white/70">Conforme o projeto, a NINE pode ampliar a entrega sob a sua marca.</p>
          <dl className="mt-7 grid gap-6 md:grid-cols-3">
            {expansions.map(([title, detail]) => <div key={title}><dt className="font-semibold">{title}</dt><dd className="mt-2 text-sm leading-relaxed text-white/70">{detail}</dd></div>)}
          </dl>
          <p className="mt-7 border-t border-white/10 pt-5 text-sm text-white/70">Operações com faturamento acima de R$ 500 mil por ano podem incluir o Gym Manager para ampliar a gestão.</p>
        </section>

        <section className="mx-auto max-w-3xl py-14 sm:py-20">
          <h2 className="mb-7 text-center font-display text-3xl font-extrabold uppercase sm:text-5xl">Dúvidas frequentes</h2>
          <details className="border-t border-white/15 py-4">
            <summary className="cursor-pointer font-semibold">Qual é a diferença entre NINE CORE e NINE PRO?</summary>
            <p className="mt-3 text-white/70">O NINE CORE é o painel de trabalho do professor. O NINE PRO é o app onde o aluno recebe e registra seus treinos.</p>
          </details>
          <details className="border-y border-white/15 py-4">
            <summary className="cursor-pointer font-semibold">Como ativo meu acesso?</summary>
            <p className="mt-3 text-white/70">Escolha o plano mensal ou anual e pague pelo checkout. O app verifica o pagamento e orienta você no primeiro acesso.</p>
          </details>
        </section>

        <section id="planos" className="relative isolate scroll-mt-6 overflow-hidden rounded-2xl border border-[#ff5a1f]/25 bg-[#1b1512] p-6 sm:p-12">
          <PlansGlow className="opacity-70" />
          <h2 className="font-display text-3xl font-extrabold uppercase sm:text-5xl">Escolha seu plano do NINE PRO</h2>
          <p className="mt-4 max-w-xl text-white/70">Escolha o período de acesso ao app. Você paga uma vez e, após a confirmação do pagamento, o NINE PRO guia seu primeiro acesso.</p>
          <ul className="my-4 list-disc space-y-1 pl-5 text-sm text-white/70">{OFFER_BENEFITS.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
          {!CHECKOUT_READY && <p role="status" className="mb-4 text-sm text-white/70">Contratação online em configuração. Consulte as condições com a NINE.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {COMMERCIAL_PLANS.map(plan => (
              <article key={plan.id} className={`space-y-3 rounded-xl border bg-white/[0.04] p-5 backdrop-blur-md ${params.get("plan") === plan.id ? "border-[#ff7848]" : "border-white/15"}`}>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-xl text-[#ff7848]">{plan.price}<span className="text-sm text-white/70"> {plan.period}</span></p>
                <p className="text-sm text-white/70">Pagamento único, sem renovação automática.</p>
                <a className={cta} href={commercialPlanHref(plan)}>
                  {CHECKOUT_READY ? (plan.id === "basic" ? "Escolher 1 mês" : "Escolher 12 meses") : "Consultar este plano"}
                </a>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/70">{OFFER_SCOPE}</p>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-white/70">
          <span>NINE PRO</span><a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">{SUPPORT_EMAIL}</a>
        </footer>
      </div>
    </main>
  );
}
