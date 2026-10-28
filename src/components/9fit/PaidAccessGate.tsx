import {ReactNode} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {usePaidAccess} from '@/hooks/usePaidAccess';
import {isAccountRoute} from '@/lib/paidAccess';
import {Button} from '@/components/ui/button';
export function PaidAccessGate({children}:{children:ReactNode}){
 const {pathname}=useLocation();const query=usePaidAccess();
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
