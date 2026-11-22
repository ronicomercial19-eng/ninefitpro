import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { readinessRpc } from "@/services/readiness";
import { withAthlete } from "@/lib/professorWorkspace";
import { businessDate } from "@/services/dailyContextRules";
type Alert = {
  id: string;
  athlete_id: string;
  name: string;
  gate_level: number;
  flags: string[];
  status: string;
};
export function CoachReadinessInbox() {
  const { user, isTrainer } = useAuth();
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["coach-readiness-alerts", user?.id, businessDate(), page],
    enabled: !!user && isTrainer,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: async () =>
      (await readinessRpc("fn_coach_readiness_alerts", {
        p_limit: 25,
        p_offset: page * 25,
      })) as { items: Alert[]; total: number },
  });
  if (!isTrainer) return null;
  const known =
    !q.isError &&
    Number.isSafeInteger(q.data?.total) &&
    Array.isArray(q.data?.items);
  return (
    <section
      className="core-workday-inbox"
      aria-label="Revisões da Sync de hoje"
    >
      <header className="core-workday-inbox-header">
        <div>
          <p className="core-workday-eyebrow">
            Relatos de hoje / toda a carteira
          </p>
          <h3 className="mt-2 flex items-center gap-2">
            <ClipboardCheck
              size={18}
              className="text-primary"
              aria-hidden="true"
            />
            Revisar sinais e sessão
          </h3>
        </div>
        <button
          className="core-workday-ghost"
          type="button"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}
          aria-label="Atualizar revisões da Sync"
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </header>
      {q.isPending ? (
        <p role="status">Consultando revisões relatadas…</p>
      ) : !known ? (
        <p role="alert">
          Não foi possível confirmar as revisões. Tente atualizar.
        </p>
      ) : (
        <>
          <p>
            <strong className="core-workday-count" aria-live="polite">
              {q.data!.total}
            </strong>
            {q.data!.total === 1
              ? "aluno com revisão registrada"
              : "alunos com revisão registrada"}
            . Confira o relato antes de ajustar a sessão.
          </p>
          {!q.data!.total && (
            <p className="core-workday-inbox-empty">
              Nenhuma revisão nesta consulta. O acompanhamento individual
              continua disponível.
            </p>
          )}
          <div className="core-workday-inbox-list">
            {q.data!.items.map((row) => (
              <Link
                key={row.id}
                to={withAthlete("/app/acompanhamento", row.athlete_id)}
                aria-label={`Revisar sinais de ${row.name}`}
              >
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    {row.flags.includes("training_alert_reported")
                      ? "Sinal de alerta relatado pelo aluno"
                      : row.flags.includes("persistent_pain_review")
                      ? "Relato de dor persistente"
                      : row.gate_level > 0
                      ? "Desconforto informado"
                      : row.status === "skipped_changed"
                      ? "Prescrição alterada"
                      : "Conferir sinais e prescrição"}{" "}
                    · abrir acompanhamento
                  </span>
                </div>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {q.data!.total > 25 && (
            <nav
              aria-label="Páginas de revisões da Sync"
              className="core-workday-pagination"
            >
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page + 1}</span>
              <button
                type="button"
                disabled={(page + 1) * 25 >= q.data!.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
          <p className="core-workday-source">
            Atualiza a cada minuto enquanto a tela está aberta.
          </p>
        </>
      )}
    </section>
  );
}
