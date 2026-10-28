import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
import {withTimeout} from '@/lib/withTimeout';
import {Button} from '@/components/ui/button';
import {useAuth} from '@/contexts/AuthContext';
type Overview={server_now:string;accounts_total:number;accounts:{user_id:string;full_name:string;reason:string;source:string;allowed:boolean;expires_at:string|null}[];manual_reviews:number;pending_payments?:{waiting:number;attention:number;oldest:string|null;items:{order_id:string;full_name:string|null;state:string;attempts:number;last_attempt_at:string|null;next_attempt_at:string|null}[]};health:{last_lifecycle_at:string|null;last_reconcile_at:string|null;last_checked:number|null;last_errors:number|null};jobs:{name:string;active:boolean;schedule:string}[]};
const at=(value:string|null)=>value?new Date(value).toLocaleString('pt-BR'):'Ainda não executado';
export function BillingMonitor(){
 const {user}=useAuth();const [page,setPage]=useState(0);
 const query=useQuery({queryKey:['billing-monitor',user?.id,page],enabled:!!user,refetchInterval:60000,refetchIntervalInBackground:false,queryFn:async()=>{
  const {data,error}=await withTimeout(supabase.rpc('fn_fitpro_billing_overview' as never,{p_offset:page*50,p_limit:50} as never));if(error)throw error;return data as unknown as Overview;
 }});
 if(query.isPending)return <p>Carregando monitor de acesso…</p>;
 if(query.isError||!query.data)return <section className="rounded-xl border p-4 space-y-2"><p>Não foi possível confirmar o monitor de acesso.</p><Button onClick={()=>void query.refetch()}>Tentar novamente</Button></section>;
 const data=query.data;const delayed=!data.health.last_reconcile_at||Date.parse(data.server_now)-Date.parse(data.health.last_reconcile_at)>300000;
 return <section className="rounded-xl border p-5 space-y-4 overflow-x-auto"><h2 className="text-xl font-semibold">Monitor de pagamentos e acesso</h2><p>{data.accounts_total} contas · {data.manual_reviews} pagamentos para revisão manual</p><PendingPayments data={data.pending_payments}/><p>Vencimentos: {at(data.health.last_lifecycle_at)} · conferência no provedor: {at(data.health.last_reconcile_at)}</p><p>Última execução: {data.health.last_checked??0} recibos conferidos · {data.health.last_errors??0} falhas de consulta</p>{(delayed||!!data.health.last_errors)&&<p role="alert" className="text-amber-500">Atenção: conferência atrasada ou com falhas. Falha do provedor não é tratada como pagamento recusado.</p>}<p className="text-xs text-muted-foreground">O vencimento é aplicado pelas regras de acesso, mesmo se a rotina agendada atrasar. A consulta ao provedor ocorre em lotes e não representa cobrança recorrente.</p><table className="w-full text-sm"><thead><tr><th className="text-left">Conta</th><th>Acesso</th><th>Origem</th><th>Validade</th></tr></thead><tbody>{data.accounts.map(a=><tr key={a.user_id} className="border-t"><td className="py-2">{a.full_name||'Sem nome'}</td><td>{a.allowed?'Liberado':'Bloqueado'}</td><td>{a.source==='legacy_consultoria'?'Consultoria anterior':a.source==='professional'?'Profissional':a.source==='subscription'?'Assinatura':a.source}</td><td>{a.expires_at?new Date(a.expires_at).toLocaleDateString('pt-BR'):'Sem prazo registrado'}</td></tr>)}</tbody></table><div className="flex gap-3 items-center"><Button disabled={!page} onClick={()=>setPage(n=>n-1)}>Anterior</Button><span>Página {page+1}</span><Button disabled={(page+1)*50>=data.accounts_total} onClick={()=>setPage(n=>n+1)}>Próxima</Button><Button variant="outline" onClick={()=>void query.refetch()}>Atualizar</Button></div></section>;
}

function PendingPayments({data}:{data:Overview['pending_payments']}) {
 if(!data)return null;
 return <div className="space-y-2">
  <p>{data.waiting} confirmações em tentativa automática · {data.attention} precisam de revisão</p>
  {data.attention>0&&<p role="alert" className="text-amber-500">Há pagamentos sem confirmação após as tentativas automáticas. Confira o pedido no provedor antes de liberar acesso.</p>}
  {data.items.length>0&&<details><summary className="cursor-pointer">Ver até 25 pedidos aguardando confirmação</summary>
   <ul className="space-y-3 py-3">{data.items.map((item,index)=><li key={`${item.order_id}:${index}`} className="border-t pt-2 text-sm">
    <p>{item.full_name||'Conta sem nome'} · {item.state==='attention'?'Revisão necessária':'Conferência automática'} · {item.attempts} tentativas</p>
    <p className="break-all">Pedido: {item.order_id}</p>
    <p className="text-muted-foreground">Última tentativa: {at(item.last_attempt_at)}{item.state!=='attention'&&` · próxima: ${at(item.next_attempt_at)}`}</p>
   </li>)}</ul>
  </details>}
 </div>;
}
