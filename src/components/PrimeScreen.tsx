import { useNavigate } from 'react-router-dom';
import { usePrimeState } from '@/hooks/usePrimeState';

export const PrimeScreen = ({ setActiveProtocol, activeProtocol }: { setActiveProtocol: (protocol: string | null) => void; activeProtocol: string | null }) => {
  const { data, isLoading, error, refetch } = usePrimeState();
  const navigate = useNavigate();
  if (isLoading) return <p>Carregando Prime…</p>;
  if (error) return <button onClick={() => void refetch()}>Não foi possível carregar. Tentar novamente</button>;
  return <section className="space-y-4 p-4">
    <h2 className="text-xl font-bold">9FIT Prime</h2>
    <p>Assinatura: {data?.entitlement === 'active' ? 'Ativa' : data?.entitlement === 'trial' ? 'Em avaliação' : data?.entitlement === 'expired' ? 'Expirada' : 'Não confirmada'}</p>
    <p>SYNC: {data?.syncScore == null ? 'Sem medição' : `${data.syncScore}%`}</p>
    <p>Protocolo: {activeProtocol || data?.activeProtocol || 'Nenhum protocolo ativo'}</p>
    <button onClick={() => { setActiveProtocol(data?.activeProtocol || null); navigate('/9fit/train'); }}>Abrir treino</button>
    <button onClick={() => navigate('/9fit/primepass')}>Gerenciar assinatura</button>
  </section>;
};
