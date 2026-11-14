import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { CHECKOUT_PRODUCTS, type CheckoutPeriod } from '@/lib/checkoutProducts';
import { paymentOperation } from '@/services/infinitepayCheckout';
import { loadProfessionalSubscriptions, subscriptionActive } from '@/services/billingService';
import { checkoutUrl } from '@/lib/infinitepayUrl';
import { rememberPayment } from '@/lib/paymentReturn';

export default function ProfessorBillingPage() {
  const { user } = useAuth();
  const identity = useRef(user?.id);
  const inFlight = useRef(false);
  const [busy, setBusy] = useState<CheckoutPeriod | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { identity.current = user?.id; inFlight.current = false; setBusy(null); setError(''); return () => { identity.current = undefined; }; }, [user?.id]);
  const subscriptions = useQuery({ queryKey: ['professional-subscriptions', user?.id], enabled: !!user,
    queryFn: () => user ? loadProfessionalSubscriptions(user.id) : Promise.resolve([]), refetchInterval: 30000 });
  const active = subscriptions.data?.find(s => subscriptionActive(s));
  async function start(period: 'core_monthly' | 'core_quarterly') {
    if (!user || inFlight.current) return;
    const owner = user.id;
    inFlight.current = true; setBusy(period); setError('');
    try {
      const key = `9fit:checkout-request:${owner}:${period}`;
      let requestId = sessionStorage.getItem(key);
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(key, requestId); }
      const result = await paymentOperation({ action: 'create', period, request_id: requestId });
      if (identity.current !== owner) return;
      if (!result.order_id) throw new Error('Não foi possível identificar seu pedido.');
      rememberPayment({ order_nsu: result.order_id });
      if (result.status === 'paid') { window.location.assign('/app/pagamento/retorno'); return; }
      window.location.assign(checkoutUrl(result.url));
    } catch (e) { if (identity.current === owner) setError(e instanceof Error ? e.message : 'Não foi possível preparar o pagamento.'); }
    finally { if (identity.current === owner) { inFlight.current = false; setBusy(null); } }
  }
  return <div className="space-y-6 max-w-4xl">
    <header><p className="font-mono text-xs uppercase text-primary">NINE CORE · Profissional</p><h1 className="text-3xl font-bold italic">Pagamento e assinatura</h1></header>
    {subscriptions.isPending ? <p role="status">Conferindo sua assinatura…</p> : subscriptions.isError ? <div role="alert"><p>Não foi possível carregar sua assinatura.</p><Button variant="outline" onClick={() => void subscriptions.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div> : <p className="text-muted-foreground">{active ? `Assinatura confirmada${active.expires_at ? ` até ${new Date(active.expires_at).toLocaleDateString('pt-BR')}` : ', sem vencimento'}.` : 'Nenhuma assinatura NINE CORE vigente.'}</p>}
    <div className="grid gap-4 sm:grid-cols-2">{(['core_monthly', 'core_quarterly'] as const).map(period => {
      const plan = CHECKOUT_PRODUCTS[period];
      return <Card key={period}><CardHeader><CardTitle>{plan.name}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-3xl font-bold italic">{(plan.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p><p className="text-sm text-muted-foreground">{plan.months === 1 ? '1 mês' : '3 meses'} de acesso · pagamento único, sem renovação automática.</p><Button className="w-full" disabled={busy !== null || subscriptions.isPending || subscriptions.isError || active?.expires_at === null} onClick={() => void start(period)}>{busy === period ? 'Preparando pagamento…' : 'Continuar para InfinitePay'}<ArrowRight className="ml-2 h-4 w-4" /></Button></CardContent></Card>;
    })}</div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <section><h2 className="mb-3 text-lg font-semibold">Histórico de assinaturas</h2>{subscriptions.data?.length === 0 ? <p className="text-muted-foreground">Seu histórico começa após o primeiro pagamento confirmado.</p> : <ul className="divide-y divide-border">{subscriptions.data?.map(s => <li key={s.id} className="flex flex-wrap justify-between gap-2 py-3"><span>{subscriptionActive(s) ? 'Ativa' : s.status === 'suspended' ? 'Pagamento não confirmado' : 'Sem acesso vigente'}</span><span className="text-muted-foreground">{s.expires_at ? `Até ${new Date(s.expires_at).toLocaleDateString('pt-BR')}` : 'Sem vencimento'}</span></li>)}</ul>}</section>
  </div>;
}