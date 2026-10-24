import { CareWorkspace } from "@/components/students/CareWorkspace";
import { useAthleteId } from "@/hooks/useAthleteId";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
export default function StudentCarePage() {
  const { athleteId, loading, error } = useAthleteId();
  return (
    <main className="mx-auto min-h-screen max-w-4xl p-4 pt-16 pb-28">
      <h1 className="mb-4 text-2xl font-semibold">Meu acompanhamento</h1>
      {loading ? (
        <p>Localizando perfil…</p>
      ) : !athleteId ? (
        <p role="alert">
          {error || "Perfil não disponível. Confira seu vínculo com a equipe."}
        </p>
      ) : (
        <CareWorkspace key={athleteId} athleteId={athleteId} />
      )}
      <BottomNavigation />
    </main>
  );
}
