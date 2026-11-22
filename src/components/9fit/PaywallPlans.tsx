import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { CHECKOUT_READY, OFFER_BENEFITS, PAYWALL_BENEFITS, planInsights, type CommercialPlan } from '@/config/commercialOffer';
import { cn } from '@/lib/utils';

interface Props {
  plans: readonly CommercialPlan[];
  initialPlanId?: string | null;
  /** Destino do CTA para o plano selecionado (rota interna ou mailto). */
  hrefFor: (plan: CommercialPlan) => string;
  /** Disparado ao tocar num card (só seleciona, não navega). */
  onSelect?: (plan: CommercialPlan) => void;
  /** Disparado ao tocar no CTA, antes de navegar. */
  onContinue?: (plan: CommercialPlan) => void;
  /** CTA fixo acima da tab bar (tela cheia). */
  stickyCta?: boolean;
}

/** Bloco de oferta compartilhado: benefícios uma vez, cards selecionáveis e um único CTA. */
export function PaywallPlans({ plans, initialPlanId, hrefFor, onSelect, onContinue, stickyCta = false }: Props) {
  const [selectedId, setSelectedId] = useState<string>(() => plans.find(p => p.id === initialPlanId)?.id ?? plans[0].id);
  const selected = plans.find(p => p.id === selectedId) ?? plans[0];
  const href = hrefFor(selected);
  const label = CHECKOUT_READY ? `Continuar com o ${planInsights(selected).shortName.toLowerCase()}` : 'Falar com a NINE FIT sobre este plano';
  const ctaClass = 'flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#ff783d] to-[#ed4d18] px-4 py-4 text-center font-bold text-white shadow-[0_8px_28px_-10px_rgba(255,90,31,0.65)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none';
  const cta = href.startsWith('/')
    ? <Link to={href} onClick={() => onContinue?.(selected)} className={ctaClass}>{label}<ArrowRight size={18} aria-hidden="true" /></Link>
    : <a href={href} rel="noopener noreferrer" onClick={() => onContinue?.(selected)} className={ctaClass}>{label}<ArrowRight size={18} aria-hidden="true" /></a>;

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {PAYWALL_BENEFITS.map(text => (
          <li key={text} className="flex items-center gap-3 text-sm">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><Check size={14} strokeWidth={3} /></span>
            {text}
          </li>
        ))}
      </ul>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Ver tudo que está incluído</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{OFFER_BENEFITS.map(text => <li key={text}>{text}</li>)}</ul>
      </details>

      <div role="radiogroup" aria-label="Período de acesso" className="space-y-3 pt-2">
        {plans.map(plan => {
          const info = planInsights(plan);
          const active = plan.id === selected.id;
          return (
            <div id={`plano-${plan.id}`} key={plan.id} className="relative">
              {info.savings && (
                <span className="absolute -top-3 right-4 z-10 rounded-full border border-primary/40 bg-card px-3 py-1 text-xs font-bold text-primary">{info.savings}</span>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => { setSelectedId(plan.id); onSelect?.(plan); }}
                className={cn('flex min-h-24 w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none', active ? 'border-primary/70 bg-gradient-to-br from-primary/[0.12] to-[#181a1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]' : 'border-white/10 bg-[#181a1c] hover:border-white/25')}
              >
                <span className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border", active ? "border-primary bg-primary text-primary-foreground" : "border-white/30")}>{active && <Check size={12} strokeWidth={3} />}</span><span>
                  <span className="block text-lg font-bold">{info.shortName}</span>
                  <span className="block text-xs text-muted-foreground">{info.periodLabel}{info.perMonth ? ` · ${info.perMonth}` : ''}</span>
                </span></span>
                <strong className="shrink-0 text-lg font-bold tabular-nums sm:text-xl">{plan.price}</strong>
              </button>
            </div>
          );
        })}
      </div>

      <div className={cn(stickyCta && 'sticky bottom-28 z-10 -mx-4 bg-gradient-to-t from-background via-background to-transparent px-4 pb-3 pt-4')}>
        {cta}
        <p className="mt-2 text-center text-xs text-muted-foreground">Pagamento único, sem renovação automática.</p>
      </div>
    </div>
  );
}
