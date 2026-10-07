import { useAthleteId } from '@/hooks/useAthleteId';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssignedProtocols } from '@/components/9fit/AssignedProtocols';
export default function Protocolo() {
  const { athleteId, loading, error } = useAthleteId();
  return <div className="min-h-screen bg-background pb-28">
    <div className="px-4 pt-6 pb-3"><p className="text-label">9FIT • PROTOCOLOS</p><h1 className="text-display text-3xl mt-1">Seu Protocolo</h1><p className="text-sm text-muted-foreground mt-1">Conteúdos atribuídos pelo seu coach.</p></div>
    <div className="px-4">{loading ? <p role="status">Carregando perfil…</p> : error ? <p role="alert">{error}</p> : <AssignedProtocols athleteId={athleteId} />}</div>
    <BottomNavigation />
  </div>;
}
