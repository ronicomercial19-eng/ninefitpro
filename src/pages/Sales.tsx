import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { COMMERCIAL_PLANS, OFFER_BENEFITS, OFFER_SCOPE, CHECKOUT_READY, SUPPORT_EMAIL, commercialPlanHref } from "@/config/commercialOffer";

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

  return (
    <main className="min-h-screen bg-[#0a0b0c] text-[#f4f2ee]">
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

        <section className="grid items-center gap-12 py-14 md:py-24 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ff7848]">Plataforma para personal trainers</p>
            <h1 className="font-display text-[clamp(2.6rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.055em]">Seu método, do plano à execução.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-white/70">No NINE CORE, você planeja o ano, revisa a semana e publica o treino. No app NINE PRO, seu aluno recebe a orientação e registra o que executou.</p>
            <div className="flex flex-wrap items-center gap-4">
              <a href="#planos" className={cta}>Escolher meu plano <ArrowUpRight aria-hidden="true" size={18} /></a>
              <a href="#como-funciona" className="inline-flex min-h-12 items-center gap-2 text-sm underline underline-offset-4">Ver como funciona <ArrowDown aria-hidden="true" size={15} /></a>
            </div>
          </div>
          <figure className="min-w-0 rounded-2xl border border-white/10 bg-[#151719] p-3 sm:p-5">
            <div aria-hidden="true" className="mb-4 flex items-center justify-between border-b border-white/10 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/65"><span>NINE CORE</span><span>NINE PRO ↗</span></div>
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] items-end gap-2 sm:gap-4">
              <img src="/nine-pro/prescricao.png" alt="Proposta visual do painel NINE CORE com prescrição e última execução" width="1440" height="1000" className="h-auto w-full rounded-xl border border-white/15" />
              <img src="/nine-pro/aluno.png" alt="Hub NINE PRO do aluno com o indicador SYNC Score" className="aspect-[1/1.65] w-full rounded-xl border border-white/15 object-cover object-[center_13%]" />
            </div>
            <figcaption className="mt-3 text-xs text-white/65">NINE CORE · proposta visual do painel / NINE PRO · Hub do aluno</figcaption>
          </figure>
        </section>

        <section id="como-funciona" className="scroll-mt-6 border-y border-white/10 py-14 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">O treino vai do seu plano ao app do aluno</h2>
          <ol className="mt-10 grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ title, detail }, index) => (
              <li key={title} className="border-t border-white/20 pt-5">
                <span className="text-sm font-semibold tabular-nums text-[#ff7848]">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-7 py-14 sm:py-20 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ff7848]">SYNC Score</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Como seu aluno chega para treinar?</h2>
          </div>
          <p className="self-end text-lg leading-relaxed text-white/70">Antes da sessão, o aluno registra sono, energia, dor, humor e motivação. O SYNC resume o check-in, e você pode consultar a leitura junto ao histórico para decidir se mantém ou revê a próxima sessão.</p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#151719] p-6 sm:p-10">
          <h2 className="text-3xl font-bold tracking-tight">Uma plataforma para o seu método</h2>
          <p className="mt-3 max-w-2xl text-white/70">O painel e o app formam a base. Conforme o projeto, a NINE pode ampliar a entrega sob a sua marca.</p>
          <dl className="mt-7 grid gap-6 md:grid-cols-3">
            {expansions.map(([title, detail]) => <div key={title}><dt className="font-semibold">{title}</dt><dd className="mt-2 text-sm leading-relaxed text-white/70">{detail}</dd></div>)}
          </dl>
          <p className="mt-7 border-t border-white/10 pt-5 text-sm text-white/70">Operações com faturamento acima de R$ 500 mil por ano podem incluir o Gym Manager para ampliar a gestão.</p>
        </section>

        <section className="py-16 sm:py-20">
          <h2 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Leve seu planejamento para o app</h2>
          <p className="my-5 max-w-2xl text-white/70">Escolha seu período de acesso. Depois que o pagamento for confirmado, siga para a ativação do app.</p>
          <a href="#planos" className={cta}>Escolher meu plano <ArrowUpRight aria-hidden="true" size={18} /></a>
        </section>

        <section id="planos" className="scroll-mt-6 border-t border-white/10 py-10">
          <h2 className="text-2xl font-bold">Planos de acesso ao app NINE PRO</h2>
          <ul className="my-4 list-disc space-y-1 pl-5 text-sm text-white/70">{OFFER_BENEFITS.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
          {!CHECKOUT_READY && <p role="status" className="mb-4 text-sm text-white/70">Contratação online em configuração. Consulte as condições com a NINE.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {COMMERCIAL_PLANS.map(plan => (
              <article key={plan.id} className={`space-y-3 rounded-xl border p-5 ${params.get("plan") === plan.id ? "border-[#ff7848]" : "border-white/15"}`}>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-xl text-[#ff7848]">{plan.price}<span className="text-sm text-white/70"> {plan.period}</span></p>
                <p className="text-sm text-white/70">Pagamento único, sem renovação automática.</p>
                <a className={cta} href={commercialPlanHref(plan)}>
                  {CHECKOUT_READY ? "Ir para o checkout" : "Consultar este plano"}
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
