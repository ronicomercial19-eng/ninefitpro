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
import { BillingCard } from '@/components/9fit/BillingShell';

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
        {!CHECKOUT_READY && <p role="status" className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-sm text-muted-foreground"><span className="font-semibold text-primary">Atenção · </span>Contratação online em configuração. Não faça pagamentos para liberar acesso sem confirmação da equipe.</p>}

        <PaywallPlans plans={PLANS} initialPlanId={selectedPlan} hrefFor={commercialPlanHref} stickyCta />

        <p className="border-l-2 border-primary/60 pl-3 text-sm leading-relaxed text-muted-foreground">{prime?.entitlement === "active" || prime?.entitlement === "trial" ? "Você já tem acesso. Consulte as condições de alteração antes de contratar outro plano." : "Ofertas disponíveis. O acesso só é confirmado após o registro da contratação."} Valores, renovação e cobrança são confirmados pelo provedor de pagamento.</p>

        <AssinaturaStatus />
        <BillingCard><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-label text-primary">Leitura do sistema</p><h2 className="mt-1 font-display text-xl">Sua performance</h2></div><span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]" /></div>{isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : error ? <button className="text-sm text-primary underline" onClick={()=>void refetch()}>Não foi possível atualizar. Tentar novamente</button> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['SYNC', prime?.syncScore == null ? '—' : `${prime.syncScore}%`], ['PROTOCOLO', prime?.activeProtocol || 'Sem protocolo'], ['PRÓXIMO', prime?.nextWorkout ? friendlyDates(prime.nextWorkout) : 'Sem prescrição'], ['RECUPERAÇÃO', prime?.recovery == null ? '—' : `${prime.recovery}%`]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"><p className="text-[9px] font-bold tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 truncate font-data text-sm font-semibold text-foreground">{value}</p></div>)}</div>}</BillingCard>
      </div>

      <section className="m-4 rounded-xl border border-border p-4 space-y-3"><h2 className="font-bold">O que está incluído — e o que é contratado à parte</h2><p className="text-sm text-muted-foreground">{OFFER_SCOPE}</p><p className="text-sm text-muted-foreground">Autoavaliações e estimativas são identificadas. Não prometemos resultados físicos nem substituímos acompanhamento profissional.</p><Link to="/9fit/staff" className="text-primary underline">Conhecer profissionais via Staff</Link></section>
      <div className="px-4"><AppSupport /></div>
      <BottomNavigation />
    </div>
  );
}
