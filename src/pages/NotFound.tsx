import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
export default function NotFound() {
  const { user, loading } = useAuth();
  return <main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
    <section className="max-w-md text-center space-y-5">
      <h1 className="text-2xl font-bold">Esta página não está disponível</h1>
      <p>O endereço pode ter mudado. Você pode continuar pelo início da 9FIT PRO.</p>
      {!loading && <Link className="block rounded-lg bg-primary p-4 text-primary-foreground" to={user ? '/9fit/hub' : '/9fit/login'} replace>{user ? 'Continuar no aplicativo' : 'Entrar na 9FIT PRO'}</Link>}
      <Link to="/suporte" className="underline">Preciso de ajuda</Link>
    </section>
  </main>;
}
