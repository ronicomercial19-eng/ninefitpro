import {ReactNode} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {usePaidAccess} from '@/hooks/usePaidAccess';
import {isAccountRoute,isBlockExemptRoute} from '@/lib/paidAccess';
import {Button} from '@/components/ui/button';

const BLOCK_TITLES:Record<string,string>={
 payment_overdue:'Acesso bloqueado por falta de pagamento',
 inactivity:'Acesso bloqueado por inatividade',
 contract_ended:'Seu contrato chegou ao fim',
 other:'Seu acesso está bloqueado'
};

export function PaidAccessGate({children}:{children:ReactNode}){
 const {pathname}=useLocation();const query=usePaidAccess();
 const access=query.access;
 if(access?.reason==='manual_block'&&!query.isError&&!isBlockExemptRoute(pathname)){
  const code=access.block_reason||'other';
  const url=access.payment_url;
  const external=!!url&&/^https?:\/\//i.test(url);
  return <section role="alert" className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
   <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight">{BLOCK_TITLES[code]||BLOCK_TITLES.other}</h1>
   {access.block_text&&<p className="max-w-md text-lg text-muted-foreground">{access.block_text}</p>}
   <p className="max-w-md text-muted-foreground">Seus dados e histórico continuam preservados. Regularize para liberar seu acesso agora.</p>
   {url&&(external
    ?<Button asChild size="lg"><a href={url} target="_blank" rel="noopener noreferrer">Pagar e liberar meu acesso</a></Button>
    :<Button asChild size="lg"><Link to={url}>Pagar e liberar meu acesso</Link></Button>)}
   <Button variant="outline" onClick={()=>void query.refetch()}>Já paguei, atualizar</Button>
   <Link className="text-primary underline" to="/9fit/acompanhamento">Falar com meu professor</Link>
  </section>;
 }
 if(isAccountRoute(pathname))return <>{children}</>;
 if(query.isPending ||(query.isFetching&&!query.allowed))return <p className="p-12 text-center" role="status">Verificando seu acesso…</p>;
 if(query.allowed)return <>{children}</>;
 return <section className="mx-auto max-w-lg px-6 py-20 space-y-5 text-center">
  <h1 className="text-2xl font-display">{query.isError?'Não foi possível conferir seu acesso':query.access?.reason==='expired'?'Seu período de acesso terminou':query.access?.reason==='payment_unconfirmed'?'Seu pagamento precisa de confirmação':'Ative seu acesso ao 9FIT PRO'}</h1>
  <p>{query.isError?'Tente atualizar a confirmação da conta.':'Seus dados e histórico continuam preservados. Após confirmar um novo pagamento, o acesso é liberado automaticamente.'}</p>
  <Button onClick={()=>void query.refetch()}>Atualizar confirmação</Button>
  {!query.isError&&<Button asChild><Link to="/9fit/planos">Ver opções de acesso</Link></Button>}
  <Link className="block text-primary underline" to="/9fit/profile">Minha conta</Link>
  <Link className="block text-primary underline" to="/9fit/progresso">Consultar meu histórico</Link>
  <Link className="block text-primary underline" to="/9fit/acompanhamento">Falar com a equipe</Link>
 </section>;
}
