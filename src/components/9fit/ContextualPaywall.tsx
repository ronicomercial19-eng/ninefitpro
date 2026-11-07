import { useEffect } from 'react';
import { X } from 'lucide-react';
import { trackMonetizationEvent, type MonetizationContext } from '@/services/monetization';
import { COMMERCIAL_PLANS } from '@/config/commercialOffer';
import { PlansHeroBackdrop } from './PlansHero';
import { PaywallPlans } from './PaywallPlans';

interface Props { open: boolean; onClose: () => void; context: MonetizationContext; headline?: string; subline?: string; contextDate?: string }

/** Oferta contextual dentro do app, em formato de bottom sheet. Mesmo bloco de oferta da tela de planos. */
export function ContextualPaywall({ open, onClose, context }: Props) {
  useEffect(() => { if (open) void trackMonetizationEvent('view_paywall', null, context); }, [open, context]);
  if (!open) return null;
  const close = () => { void trackMonetizationEvent('dismiss_paywall', null, context); onClose(); };
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 backdrop-blur-md sm:items-center sm:p-4" onClick={close}>
    <section role="dialog" aria-modal="true" aria-labelledby="commercial-offer-title" className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto overflow-x-hidden rounded-t-3xl border border-primary/25 bg-card px-5 pb-6 pt-5 sm:rounded-3xl" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <PlansHeroBackdrop size="sm" />
      <button aria-label="Fechar oferta" onClick={close} className="absolute right-3 top-3 z-10 p-2"><X size={20} /></button>
      <div className="relative pt-24">
        <p className="mb-3 text-xs tracking-widest text-primary">9FIT PRO</p>
        <h2 id="commercial-offer-title" className="pr-6 text-2xl font-bold">Seu treino organizado. Sua evolução registrada.</h2>
        <p className="mt-2 text-sm text-muted-foreground">Um produto digital. Escolha o período de acesso.</p>
        <div className="mt-5">
          <PaywallPlans
            plans={COMMERCIAL_PLANS}
            hrefFor={plan => `/9fit/planos?plan=${plan.id}#plano-${plan.id}`}
            onContinue={plan => { void trackMonetizationEvent('select_plan', plan.id, context); onClose(); }}
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Contratação pela InfinitePay. Confira cobrança, renovação e cancelamento antes de pagar. Profissionais via Staff são contratados à parte.</p>
      </div>
    </section>
  </div>;
}
