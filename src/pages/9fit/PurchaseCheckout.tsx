import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { COMMERCIAL_PLANS } from '@/config/commercialOffer';
import { paymentOperation } from '@/services/infinitepayCheckout';
import { rememberPayment } from '@/lib/paymentReturn';
import { entryStorage, rememberPlan } from '@/lib/customerEntry';
import { AppSupport } from '@/components/9fit/AppSupport';
import { checkoutUrl } from '@/lib/infinitepayUrl';
import { BillingCard, BillingShell } from '@/components/9fit/BillingShell';

export function PurchaseCheckout({ period }: { period: 'basic'|'annual' }) {
  const { user, loading } = useAuth(), navigate = useNavigate();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef(''), generation = useRef(0);
  useEffect(() => {
    generation.current++; request.current = ''; setError(''); setBusy(false);
    if (user) { try { request.current = sessionStorage.getItem(`9fit:checkout-request:${user.id}:${period}`) || ''; } catch { /* Optional. */ } }
    return () => { generation.current++; };
  }, [user?.id, period]);
  const plan = COMMERCIAL_PLANS.find(p => p.id === period)!;
  async function start() {
    if (!user || busy) return;
    const revision = generation.current;
    setBusy(true); setError('');
    try {
      if (!request.current) request.current = crypto.randomUUID();
      try { sessionStorage.setItem(`9fit:checkout-request:${user.id}:${period}`, request.current); } catch { /* Retry remains stable in this view. */ }
      const result = await paymentOperation({ action: 'create', period, request_id: request.current });
      if (revision !== generation.current) return;
      if (!result.order_id) throw new Error('Não foi possível identificar seu pedido.');
      rememberPayment({ order_nsu: result.order_id });
      if (result.status === 'paid') { try { sessionStorage.removeItem(`9fit:checkout-request:${user.id}:${period}`); } catch { /* Optional. */ } navigate('/9fit/pagamento/retorno'); return; }
      window.location.assign(checkoutUrl(result.url));
    } catch (e) { if (revision === generation.current) setError((e as Error).message); }
    finally { if (revision === generation.current) setBusy(false); }
  }
  return <BillingShell step="checkout" title="Confirme seu acesso">
    <div className="space-y-4">
      <BillingCard>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-label">Resumo do pedido</p><h2 className="mt-1 font-display text-2xl">{plan.name}</h2><p className="mt-1 text-sm text-muted-foreground">{period === 'basic' ? '1 mês de acesso' : '12 meses de acesso'}</p></div>
          <p className="font-data text-2xl font-bold text-primary">{plan.price}</p>
        </div>
        <div className="mt-5 grid gap-2 border-t border-white/[0.08] pt-4 text-sm text-muted-foreground"><p>Pagamento único, sem renovação automática.</p><p>O acesso é liberado depois da confirmação do provedor.</p></div>
      </BillingCard>
      <BillingCard className="space-y-4">
        {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando sua conta…</p> : !user ? <>
          <div><h2 className="font-display text-xl">Vincule o pagamento à sua conta</h2><p className="mt-1 text-sm text-muted-foreground">Entre ou crie sua conta antes de pagar para manter seu acesso e histórico no mesmo lugar.</p></div>
          <Link onClick={() => rememberPlan(entryStorage(), period)} className="block rounded-xl bg-primary p-4 text-center font-semibold text-primary-foreground transition hover:brightness-110" to="/9fit/entrada?intent=purchase">Entrar ou criar conta <span aria-hidden>→</span></Link>
        </> : <>
          <div><h2 className="font-display text-xl">Tudo certo para continuar?</h2><p className="mt-1 text-sm text-muted-foreground">O acesso será vinculado à conta <strong className="text-foreground">{user.email}</strong>.</p></div>
          <button disabled={busy} onClick={() => void start()} className="w-full rounded-xl bg-primary p-4 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{busy ? 'Preparando pagamento…' : 'Continuar para a InfinitePay'} <span aria-hidden>→</span></button>
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-red-200">{error}</p>}
        </>}
      </BillingCard>
      <p className="text-center text-xs text-muted-foreground">Você será direcionado ao provedor para concluir o pagamento com segurança.</p>
      <AppSupport />
    </div>
  </BillingShell>;
}
