import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { COMMERCIAL_PLANS } from '@/config/commercialOffer';
import { paymentOperation } from '@/services/infinitepayCheckout';
import { rememberPayment } from '@/lib/paymentReturn';
import { AppSupport } from '@/components/9fit/AppSupport';
import { checkoutUrl } from '@/lib/infinitepayUrl';

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
  return <main className="min-h-screen bg-background p-6 text-foreground"><section className="mx-auto max-w-lg space-y-5 py-8">
    <h1 className="text-3xl font-bold">{plan.name}</h1>
    <p className="text-xl text-primary">{plan.price} · {period === 'basic' ? '1 mês de acesso' : '12 meses de acesso'}</p>
    <p>Pagamento único, sem renovação automática. O acesso é liberado após a confirmação do pagamento. Compras adicionais somam o período ao acesso válido já registrado.</p>
    {loading ? <p role="status">Carregando sua conta…</p> : !user ? <>
      <p>Entre ou crie sua conta antes de pagar para vincular o acesso corretamente.</p>
      <Link className="block rounded-xl bg-primary p-4 text-center text-primary-foreground" to="/9fit/entrada?intent=purchase">Entrar ou criar conta</Link>
    </> : <>
      <p className="text-sm">O acesso será vinculado à conta <strong>{user.email}</strong>. Confira se esta é a conta que você pretende usar.</p>
      <button disabled={busy} onClick={() => void start()} className="w-full rounded-xl bg-primary p-4 text-primary-foreground disabled:opacity-50">{busy ? 'Preparando pagamento…' : 'Continuar para a InfinitePay'}</button>
      {error && <p role="alert">{error}</p>}
    </>}
    <Link className="block text-primary underline" to="/9fit/planos">Voltar aos planos</Link>
    <AppSupport />
  </section></main>;
}
