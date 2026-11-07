import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
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
  const label = CHECKOUT_READY ? 'Ver condições de contratação' : 'Falar com a NINE FIT sobre este plano';
  const ctaClass = 'block w-full rounded-2xl bg-primary py-4 text-center font-black text-primary-foreground transition-opacity hover:opacity-90';
  const cta = href.startsWith('/')
    ? <Link to={href} onClick={() => onContinue?.(selected)} className={ctaClass}>{label}</Link>
    : <a href={href} rel="noopener noreferrer" onClick={() => onContinue?.(selected)} className={ctaClass}>{label}</a>;

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
                className={cn('flex w-full items-center justify-between rounded-2xl border bg-card/60 p-4 text-left transition-colors', active ? 'border-primary' : 'border-white/10')}
              >
                <span>
                  <span className="block text-lg font-bold">{info.shortName}</span>
                  <span className="block text-xs text-muted-foreground">{info.periodLabel}{info.perMonth ? ` · ${info.perMonth}` : ''}</span>
                </span>
                <strong className="text-xl">{plan.price}</strong>
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
