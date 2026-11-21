import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { clearPayment, parsePaymentReturn, pendingPayment, rememberPayment } from '@/lib/paymentReturn';
import { paymentOperation } from '@/services/infinitepayCheckout';
import { rememberProfessionalReturn } from '@/lib/professionalReturn';

export default function ProfessorPaymentReturn() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const reference = useMemo(() => parsePaymentReturn(location.search) || pendingPayment(), [location.search]);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'manual_review' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => { if (reference) rememberPayment(reference); }, [reference]);
  useEffect(() => {
    if (loading || !user) return;
    if (!reference) { setStatus('manual_review'); return; }
    let active = true;
    setStatus('checking'); setMessage('');
    void paymentOperation({ action: reference.transaction_nsu && reference.slug ? 'verify' : 'status', ...reference })
      .then(result => {
        if (!active) return;
        if (result.status === 'paid' && (result.period === 'core_monthly' || result.period === 'core_quarterly')) {
          clearPayment();
          try { sessionStorage.removeItem(`9fit:checkout-request:${user.id}:${result.period}`); } catch { /* Optional storage. */ }
          void queryClient.invalidateQueries({ queryKey: ['professional-subscriptions', user.id] });
          setStatus('paid');
        } else if (result.status === 'paid') {
          setMessage('O pedido confirmado pertence a outro produto. Confira a conta usada ou fale com o suporte.');
          setStatus('manual_review');
        } else setStatus(result.status === 'manual_review' ? 'manual_review' : 'pending');
      })
      .catch(error => { if (active) { setMessage(error instanceof Error ? error.message : 'Não foi possível conferir o pedido.'); setStatus('error'); } });
    return () => { active = false; };
  }, [user?.id, loading, reference, attempt, queryClient]);
  useEffect(() => {
    if (status !== 'pending' || attempt >= 5) return;
    const timer = window.setTimeout(() => setAttempt(value => value + 1), 4000);
    return () => window.clearTimeout(timer);
  }, [status, attempt]);

  return <main className="min-h-screen bg-background px-5 py-12 text-foreground">
    <section className="mx-auto max-w-xl space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-9">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">NINE CORE · Professor</p>
      <h1 className="text-3xl font-bold">{status === 'paid' ? 'Assinatura confirmada' : 'Conferindo sua assinatura'}</h1>
      {loading ? <p role="status">Carregando sua conta…</p> : !user ? <>
        <p>Entre na conta profissional usada na compra para conferir o pagamento. Não faça outra compra enquanto verificamos.</p>
        <Link to="/auth" onClick={rememberProfessionalReturn} className="block rounded-xl bg-primary p-4 text-center font-semibold text-primary-foreground">Entrar na minha conta</Link>
      </> : status === 'paid' ? <>
        <p role="status">O pagamento foi confirmado para sua conta profissional. Sua assinatura está disponível no painel.</p>
        <Link to="/app/assinatura" className="block rounded-xl bg-primary p-4 text-center font-semibold text-primary-foreground">Ver minha assinatura</Link>
      </> : <>
        <p role="status">{status === 'checking' ? 'Conferindo o pedido com o servidor…' : status === 'pending' ? 'Ainda aguardamos a confirmação do pagamento.' : message || (status === 'manual_review' ? 'Não encontramos um pedido NINE CORE confirmado nesta conta. Fale com o suporte para conferir.' : 'Não foi possível conferir o pedido agora.')}</p>
        <p className="text-sm text-muted-foreground">O retorno do checkout não comprova o pagamento. Aguarde a confirmação antes de tentar comprar novamente.</p>
        <button disabled={status === 'checking'} onClick={() => setAttempt(value => value + 1)} className="w-full rounded-xl border border-primary/40 p-3 font-semibold text-primary disabled:opacity-50">Conferir novamente</button>
        <Link to="/app/assinatura" className="block text-center text-sm text-primary underline">Voltar à assinatura</Link>
      </>}
      {reference && <p className="break-all text-xs text-muted-foreground">Código do pedido: {reference.order_nsu}</p>}
    </section>
  </main>;
}
