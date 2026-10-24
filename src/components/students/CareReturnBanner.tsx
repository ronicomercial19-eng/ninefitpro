import { Link, useLocation } from "react-router-dom";
import { isAthleteId, withAthlete } from "@/lib/professorWorkspace";
export function CareReturnBanner({
  professional = false,
}: {
  professional?: boolean;
}) {
  const location = useLocation(),
    params = new URLSearchParams(location.search),
    id = params.get("care"),
    athlete = params.get("athlete");
  if (!isAthleteId(id) || location.pathname.endsWith("/acompanhamento"))
    return null;
  const target = professional
    ? withAthlete(
        `/app/acompanhamento?care=${id}`,
        isAthleteId(athlete) ? athlete : null,
      )
    : `/9fit/acompanhamento?care=${id}`;
  return (
    <aside className="mx-auto max-w-4xl rounded-lg border border-primary/30 bg-card p-3 text-sm">
      <Link className="text-primary underline" to={target}>
        {professional
          ? "Voltar ao acompanhamento e registrar a devolutiva"
          : "Voltar ao acompanhamento para responder ou confirmar a orientação"}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">
        Abrir esta tela não conclui a solicitação nem confirma sua execução.
      </p>
    </aside>
  );
}
