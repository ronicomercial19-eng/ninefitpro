import { useAthleteId } from '@/hooks/useAthleteId';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssignedProtocols } from '@/components/9fit/AssignedProtocols';
import { StudentSectionHeader } from '@/components/9fit/StudentSectionHeader';

export default function Protocolo() {
  const { athleteId, loading, error } = useAthleteId();
  return <div className="min-h-screen bg-background pb-28">
    <main className="mx-auto max-w-3xl space-y-6 sm:px-6">
      <StudentSectionHeader kicker="9FIT // PROTOCOLO" title="Seu protocolo" description="Prescrições e conteúdos enviados pelo seu professor." />
      {loading ? <p role="status">Carregando perfil…</p> : error ? <p role="alert">{error}</p> :
        <AssignedProtocols key={athleteId} athleteId={athleteId} />}
    </main>
    <BottomNavigation />
  </div>;
}
