import { Crown } from 'lucide-react';
import { usePrimeState } from '@/hooks/usePrimeState';
import {usePaidAccess} from '@/hooks/usePaidAccess';

export function AssinaturaStatus() {
  const query = usePrimeState();
  const access=usePaidAccess();
  if(access.allowed&&['legacy_consultoria','manual','professional'].includes(access.access?.source||''))return <section className="rounded-2xl border border-white/10 p-6 space-y-3"><h2 className="font-semibold">{access.access?.source==='professional'?'Acesso profissional':'Acesso concedido pela equipe'}</h2><p className="text-sm">Este acesso não representa uma assinatura paga do app.</p>{access.access?.expires_at&&<p>Validade: {new Date(access.access.expires_at).toLocaleDateString('pt-BR')}</p>}</section>;
  if (query.isPending) return <p className="p-4 text-sm">Verificando assinatura…</p>;
  if (query.isError) return <div role="alert" className="p-4"><p>Não foi possível confirmar sua assinatura.</p><button onClick={() => void query.refetch()} className="text-primary">Tentar novamente</button></div>;
  const prime = query.data;
  const subscription = prime?.subscription;
  const labels = { active: 'Assinatura ativa', trial: 'Acesso em período de teste', expired: 'Assinatura encerrada ou expirada', unknown: 'Nenhuma assinatura confirmada' };
  return <section className="rounded-2xl border border-white/10 p-6 space-y-3">
    <div className="flex items-center gap-3"><Crown className="text-primary" /><h2 className="font-semibold">{labels[prime?.entitlement || 'unknown']}</h2></div>
    {subscription?.plan_id && <p className="text-sm">Plano registrado: {subscription.plan_id === 'ninefitpro' ? '9FIT PRO' : subscription.plan_id}</p>}
    {subscription?.plan_id === 'ninefitpro' && <p className="text-sm">Pagamento único. Renovação manual, sem cobranças automáticas.</p>}
    {subscription?.expires_at && <p className="text-sm">Validade do acesso: {new Date(subscription.expires_at).toLocaleDateString('pt-BR')}</p>}
    <p className="text-xs text-muted-foreground">Validade do acesso e data de cobrança são informações diferentes. Consulte o provedor para conferir renovação, cobrança e benefícios contratados.</p>
    <a href="https://infinitepay.io/login" target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-primary">Consultar pagamentos no provedor</a>
  </section>;
}
