import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AppSupport } from '@/components/9fit/AppSupport';
import { clearEntry, entryStorage, rememberEntry } from '@/lib/customerEntry';
import { clearPayment, parsePaymentReturn, pendingPayment, rememberPayment } from '@/lib/paymentReturn';
import { paymentOperation } from '@/services/infinitepayCheckout';
import { BillingCard, BillingShell } from '@/components/9fit/BillingShell';

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
  return <BillingShell step="confirmation" title={state === 'paid' ? 'Pagamento confirmado' : 'Vamos conferir seu pagamento'} backTo="/9fit/planos" backLabel="Voltar para planos">
    <div className="space-y-4">
    <BillingCard className="space-y-4">
    {loading ? <p role="status">Carregando sua conta…</p> : !user ? <>
      <p className="text-sm leading-relaxed text-muted-foreground">Entre na mesma conta usada para iniciar a compra. Não faça outro pagamento enquanto conferimos.</p>
      <Link className="block rounded-xl bg-primary p-4 text-center font-semibold text-primary-foreground" to="/auth?entry=payment_return">Entrar para conferir meu acesso <span aria-hidden>→</span></Link>
    </> : state === 'paid' ? <>
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-4"><p className="font-display text-xl">Seu acesso está ativo.</p><p className="mt-1 text-sm text-muted-foreground">Sua compra foi registrada e o período está disponível em Pagamento &amp; Plano.</p></div>
      <Link className="block rounded-xl bg-primary p-4 text-center font-semibold text-primary-foreground" to="/9fit/entrada">Continuar para o app <span aria-hidden>→</span></Link>
    </> : <>
      <p role="status" className="text-sm leading-relaxed">{state === 'checking' ? 'Conferindo a confirmação com o provedor…' : state === 'manual_review' ? 'Não encontramos um pedido vinculado a esta conta. Fale com o suporte para conferir a compra.' : state === 'error' ? error : 'Ainda aguardamos a confirmação. Você pode conferir novamente em alguns instantes.'}</p>
      <p className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-xs leading-relaxed text-muted-foreground">O retorno desta página não comprova pagamento. Não pague novamente enquanto conferimos.</p>
      <div className="flex flex-col gap-3 sm:flex-row"><button disabled={state === 'checking'} className="rounded-xl border border-primary/30 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50" onClick={() => setAttempt(n => n+1)}>Conferir novamente</button><Link className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-muted-foreground" to="/9fit/entrada" onClick={() => { clearPayment(); clearEntry(entryStorage()); }}>Voltar à minha conta</Link></div>
      {reference && <p className="break-all text-[10px] font-data text-muted-foreground">Código do pedido: {reference.order_nsu}</p>}
    </>}
    </BillingCard><AppSupport /></div>
  </BillingShell>;
}
