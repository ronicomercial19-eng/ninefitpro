import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppSupport } from '@/components/9fit/AppSupport';
import { clearEntry, entryStorage, rememberEntry } from '@/lib/customerEntry';
import { clearPayment, parsePaymentReturn, pendingPayment, rememberPayment } from '@/lib/paymentReturn';
import { paymentOperation } from '@/services/infinitepayCheckout';

export default function PaymentReturn() {
  const { user, loading } = useAuth();
  const location = useLocation(), qc = useQueryClient();
  const reference = useMemo(() => parsePaymentReturn(location.search) || pendingPayment(), [location.search]);
  const [state, setState] = useState<'checking'|'paid'|'pending'|'manual_review'|'error'>('checking');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (reference) rememberPayment(reference);
    rememberEntry(entryStorage(), 'payment_return');
  }, [reference]);
  const verify = useCallback(() => {
    if (!user || loading) return;
    if (!reference) { setState('manual_review'); return; }
    let active = true;
    setState('checking'); setError('');
    const execute = async () => {
      try {
        const result = await paymentOperation({ action: reference.transaction_nsu && reference.slug ? 'verify' : 'status', ...reference });
        if (!active) return;
        if (result.status === 'paid') {
          window.dispatchEvent(new Event('9fit:access-updated'));
          if (result.period === 'basic' || result.period === 'annual') { try { sessionStorage.removeItem(`9fit:checkout-request:${user.id}:${result.period}`); } catch { /* Optional. */ } }
          clearPayment(); clearEntry(entryStorage());
          void qc.invalidateQueries({ queryKey: ['prime-snapshot', user.id] });
          setState('paid');
        } else setState(result.status === 'manual_review' ? 'manual_review' : 'pending');
      } catch (e) { if (active) { setError((e as Error).message); setState('error'); } }
    };
    void execute();
    return () => { active = false; };
  }, [user?.id, loading, reference, qc]);
  useEffect(() => verify(), [verify, attempt]);
  useEffect(() => {
    if (state !== 'pending' || attempt >= 5) return;
    const timer = setTimeout(() => setAttempt(n => n+1), 4000);
    return () => clearTimeout(timer);
  }, [state, attempt]);
  return <main className="min-h-screen bg-background p-6 text-foreground"><section className="mx-auto max-w-lg space-y-5 py-10">
    <h1 className="text-3xl font-bold">{state === 'paid' ? 'Pagamento confirmado. Seu acesso está ativo.' : 'Vamos conferir seu pagamento'}</h1>
    {loading ? <p role="status">Carregando sua conta…</p> : !user ? <>
      <p>Entre na mesma conta usada para iniciar a compra. Não faça outro pagamento.</p>
      <Link className="block rounded-xl bg-primary p-4 text-center text-primary-foreground" to="/auth?entry=payment_return">Entrar para conferir meu acesso</Link>
    </> : state === 'paid' ? <>
      <p>Sua compra foi registrada. O período de acesso está disponível em Pagamento &amp; Plano.</p>
      <Link className="block rounded-xl bg-primary p-4 text-center text-primary-foreground" to="/9fit/entrada">Continuar para o app</Link>
    </> : <>
      <p role="status">{state === 'checking' ? 'Conferindo a confirmação com o provedor…' : state === 'manual_review' ? 'Não encontramos um pedido vinculado a esta conta. Fale com o suporte para conferir a compra.' : state === 'error' ? error : 'Ainda aguardamos a confirmação. Você pode conferir novamente em alguns instantes.'}</p>
      <p className="text-sm text-muted-foreground">O retorno desta página não comprova pagamento. Não pague novamente enquanto conferimos.</p>
      <button disabled={state === 'checking'} className="rounded-xl border p-3" onClick={() => setAttempt(n => n+1)}>Conferir novamente</button>
      {reference && <p className="break-all text-xs text-muted-foreground">Código do pedido: {reference.order_nsu}</p>}
      <Link className="block text-primary underline" to="/9fit/entrada" onClick={() => { clearPayment(); clearEntry(entryStorage()); }}>Voltar à minha conta</Link>
    </>}
    <AppSupport />
  </section></main>;
}
