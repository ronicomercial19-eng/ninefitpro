import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePrimeState } from "@/hooks/usePrimeState";
import { AssinaturaStatus } from "@/components/9fit/AssinaturaStatus";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { PlansHeroBackdrop } from "@/components/9fit/PlansHero";
import { PaywallPlans } from "@/components/9fit/PaywallPlans";
import { COMMERCIAL_PLANS, OFFER_SCOPE, CHECKOUT_READY, commercialPlanHref } from "@/config/commercialOffer";
import { AppSupport } from "@/components/9fit/AppSupport";
import { useAuth } from "@/contexts/AuthContext";

const PLANS = COMMERCIAL_PLANS;

/** O backend entrega datas ISO dentro do texto (ex.: "Treino · 2026-11-06"). Mostra hoje, amanhã ou DD/MM. */
function friendlyDates(text: string) {
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return text.replace(/(\d{4})-(\d{2})-(\d{2})/g, (full, _y, m, d) => full === key(today) ? 'hoje' : full === key(tomorrow) ? 'amanhã' : `${d}/${m}`);
}

export default function NineFitPrimePass() {
  const { user } = useAuth();
  const location = useLocation();
  const selectedPlan = new URLSearchParams(location.search).get('plan');
  useEffect(() => {
    const anchor = location.hash.slice(1);
    if (anchor) document.getElementById(anchor)?.scrollIntoView({ block: 'start' });
  }, [location.hash]);
  const {data:prime,isLoading,error,refetch}=usePrimeState();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-40 text-foreground">
      <header className="relative overflow-hidden px-4 pb-6 pt-52">
        <PlansHeroBackdrop size="lg" />
        <div className="relative">
          <h1 className="text-3xl font-display font-black italic tracking-tight">Seu treino organizado. Sua evolução registrada.</h1>
          <p className="text-sm text-muted-foreground mt-2">9FIT PRO: um produto digital, com os mesmos benefícios no mensal e no anual.</p>
        </div>
      </header>

      <div className="px-4 space-y-6">
        {!CHECKOUT_READY && <p role="status" className="rounded-xl border border-primary/30 p-4 text-sm">Contratação online em configuração. Não faça pagamentos para liberar acesso sem confirmação da equipe. Os valores abaixo são a proposta comercial; fale com a NINE FIT para confirmar disponibilidade e condições.</p>}

        <PaywallPlans plans={PLANS} initialPlanId={selectedPlan} hrefFor={commercialPlanHref} stickyCta />

        <p className="text-sm text-muted-foreground">{prime?.entitlement === "active" || prime?.entitlement === "trial" ? "Você já tem acesso. Consulte as condições de alteração antes de contratar outro plano." : "Ofertas disponíveis. O acesso só é confirmado após o registro da contratação."} Valores, renovação e cobrança são confirmados pelo provedor de pagamento; o aplicativo não informa uma próxima cobrança sem esse registro.</p>

        <AssinaturaStatus />
        <section className="rounded-xl border border-white/10 p-4 space-y-2"><h2 className="font-bold">Sua performance</h2>{isLoading ? <p>Carregando…</p> : error ? <button onClick={()=>void refetch()}>Não foi possível atualizar. Tentar novamente</button> : <><p>SYNC: {prime?.syncScore == null ? "Sem medição" : `${prime.syncScore}%`}</p><p>Protocolo: {prime?.activeProtocol || "Sem protocolo ativo"}</p><p>Próximo treino: {prime?.nextWorkout ? friendlyDates(prime.nextWorkout) : "Sem prescrição futura"}</p><p>Recuperação: {prime?.recovery == null ? "Sem leitura recente" : `${prime.recovery}%`}</p></>}</section>
      </div>

      <section className="m-4 rounded-xl border border-border p-4 space-y-3"><h2 className="font-bold">O que está incluído — e o que é contratado à parte</h2><p className="text-sm text-muted-foreground">{OFFER_SCOPE}</p><p className="text-sm text-muted-foreground">Autoavaliações e estimativas são identificadas. Não prometemos resultados físicos nem substituímos acompanhamento profissional.</p><Link to="/9fit/staff" className="text-primary underline">Conhecer profissionais via Staff</Link></section>
      <div className="px-4"><AppSupport /></div>
      <BottomNavigation />
    </div>
  );
}
