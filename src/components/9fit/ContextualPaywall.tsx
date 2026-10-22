import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check } from 'lucide-react';
import { trackMonetizationEvent, type MonetizationContext } from '@/services/monetization';
import { COMMERCIAL_PLANS, OFFER_BENEFITS } from '@/config/commercialOffer';

interface Props { open: boolean; onClose: () => void; context: MonetizationContext; headline?: string; subline?: string; contextDate?: string }
export function ContextualPaywall({ open, onClose, context }: Props) {
  const navigate = useNavigate();
  useEffect(() => { if (open) void trackMonetizationEvent('view_paywall', null, context); }, [open, context]);
  if (!open) return null;
  const close = () => { void trackMonetizationEvent('dismiss_paywall', null, context); onClose(); };
  return <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={close}>
    <section role="dialog" aria-modal="true" aria-labelledby="commercial-offer-title" className="relative w-full max-w-lg max-h-[90dvh] overflow-auto bg-card border border-primary/25 rounded-3xl p-6" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') close(); }}>
      <button aria-label="Fechar oferta" onClick={close} className="absolute right-3 top-3 p-2"><X size={20} /></button>
      <p className="text-primary text-xs tracking-widest mb-3">9FIT PRO</p>
      <h2 id="commercial-offer-title" className="text-2xl font-bold pr-6">Seu treino organizado. Sua evolução registrada.</h2>
      <p className="text-sm text-muted-foreground mt-2">Um produto digital. Escolha o período de acesso.</p>
      <ul className="my-5 space-y-2">{OFFER_BENEFITS.map(text => <li key={text} className="flex gap-2 text-sm"><Check className="text-primary shrink-0" size={16} />{text}</li>)}</ul>
      <div className="grid grid-cols-2 gap-3">{COMMERCIAL_PLANS.map(plan => <button key={plan.id} className="rounded-xl border border-primary/30 p-4 text-left" onClick={() => { void trackMonetizationEvent('select_plan', plan.id, context); onClose(); navigate('/9fit/planos'); }}><span className="block text-xs">{plan.name}</span><strong className="block text-xl mt-2">{plan.price}</strong><span className="text-xs text-muted-foreground">{plan.period} · mesmos benefícios</span></button>)}</div>
      <p className="text-xs text-muted-foreground mt-4">Contratação pela InfinitePay. Confira cobrança, renovação e cancelamento antes de pagar. Profissionais via Staff são contratados à parte.</p>
      <button className="w-full bg-primary text-primary-foreground rounded-xl p-3 mt-4 font-bold" onClick={() => { onClose(); navigate('/9fit/planos'); }}>Conhecer a assinatura</button>
    </section>
  </div>;
}

