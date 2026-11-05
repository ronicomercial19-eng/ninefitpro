import { useAthleteId } from '@/hooks/useAthleteId';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { AssignedProtocols } from '@/components/9fit/AssignedProtocols';
import { Layers3 } from 'lucide-react';

export default function Protocolo() {
  const { athleteId, loading, error } = useAthleteId();
  return <div className="min-h-screen bg-background pb-28">
    <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6 sm:px-6">
      <header className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-8">
        <div aria-hidden="true" className="absolute inset-y-6 left-0 w-0.5 rounded-full bg-primary" />
        <p className="text-label flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-primary" aria-hidden="true" /> 9FIT · Biblioteca
        </p>
        <h1 className="text-display mt-3 text-3xl sm:text-4xl">Seu protocolo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Prescrições e conteúdos enviados pelo seu professor.</p>
      </header>
      {loading ? <p role="status">Carregando perfil…</p> : error ? <p role="alert">{error}</p> :
        <AssignedProtocols key={athleteId} athleteId={athleteId} />}
    </main>
    <BottomNavigation />
  </div>;
}
