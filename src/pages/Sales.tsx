import { COMMERCIAL_PLANS, OFFER_BENEFITS, OFFER_SCOPE, CHECKOUT_READY, SUPPORT_EMAIL, commercialPlanHref } from '@/config/commercialOffer';
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function Sales() {
  const [params] = useSearchParams();
  return <main className="min-h-screen bg-background text-foreground px-6 py-12">
    <Helmet><title>Conheça o 9FIT PRO</title><meta name="description" content="Treino, planejamento e acompanhamento no 9FIT PRO." /></Helmet>
    <div className="mx-auto max-w-3xl space-y-10">
      <nav className="flex justify-between"><Link to="/" className="font-bold text-xl">9FIT <span className="text-primary">PRO</span></Link><Link to="/login" className="underline">Entrar</Link></nav>
      <section className="space-y-5"><p className="text-primary text-sm">SEU TREINO. SUA EVOLUÇÃO.</p><h1 className="text-4xl font-bold">Treino e acompanhamento em um só lugar.</h1><p className="text-muted-foreground">Organize sua rotina de treino, consulte seu planejamento e acompanhe avaliações e registros de evolução no FitPro.</p><Link to="/login" className="inline-block rounded-xl bg-primary text-primary-foreground px-5 py-3 font-semibold">Acessar FitPro</Link><a href="#como-funciona" className="ml-4 inline-block underline">Conhecer metodologia</a></section>
      <section id="como-funciona" className="scroll-mt-6 space-y-4"><h2 className="text-2xl font-semibold">Como funciona</h2><ol className="list-decimal pl-5 space-y-3 text-muted-foreground"><li>Entre com sua conta para consultar os recursos disponíveis.</li><li>Acompanhe treinos e planejamento conforme a prescrição vinculada à sua conta.</li><li>Registre sua evolução e consulte o histórico de avaliações.</li></ol></section>
      <section id="planos" className="space-y-4"><h2 className="text-2xl font-semibold">Escolha seu período no 9FIT PRO</h2>
        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">{OFFER_BENEFITS.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
        {!CHECKOUT_READY && <p role="status" className="text-sm text-muted-foreground">Contratação online em configuração. Confirme disponibilidade e condições com a NINE FIT antes de pagar.</p>}
        <div className="grid gap-4 sm:grid-cols-2">{COMMERCIAL_PLANS.map(plan => <article key={plan.id} className={`rounded-2xl border p-5 space-y-3 ${params.get('plan') === plan.id ? 'border-primary' : 'border-border'}`}>
          <h3 className="font-semibold">{plan.name}</h3><p className="text-xl text-primary">{plan.price}{plan.period}</p><p className="text-sm text-muted-foreground">Pagamento único, sem renovação automática.</p>
          <a className="inline-block rounded-xl bg-primary text-primary-foreground px-4 py-3" href={commercialPlanHref(plan)}>{CHECKOUT_READY ? 'Ver condições de contratação' : 'Consultar este plano'}</a>
        </article>)}</div><p className="text-sm text-muted-foreground">{OFFER_SCOPE}</p>
      </section>
      <section className="rounded-2xl border border-border/10 bg-card p-6 space-y-3"><h2 className="text-xl font-semibold">Conheça a 9FIT Store</h2><p className="text-sm text-muted-foreground">Consulte o catálogo e as condições de cada oferta na loja. Confira o que está incluído antes de comprar; esta página não garante liberação de recursos no FitPro.</p><a href="https://ninefit.lovable.app" target="_blank" rel="noopener noreferrer" className="inline-flex text-primary underline">Abrir 9FIT Store ↗</a></section>
      <p className="text-sm text-muted-foreground">O acesso é confirmado após o registro da contratação. A disponibilidade de recursos depende do acesso da sua conta.</p>
      <footer className="text-xs text-muted-foreground">9FIT PRO · <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a></footer>
    </div>
  </main>;
}
