import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardList, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withAthlete } from "@/lib/professorWorkspace";
type Item = {
  id: string;
  name: string;
  has_periodization: boolean;
  has_manual_assignment: boolean;
  latest_workout: string | null;
};
export function TrainingSetupInbox() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["training-setup", user?.id, page],
    enabled: !!user,
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      const { data, error } = await (supabase as any)
        .rpc("fn_coach_training_setup_queue", {
          p_limit: 20,
          p_offset: page * 20,
        })
        .abortSignal(signal);
      if (error) throw error;
      return data as { total: number; items: Item[] };
    },
  });
  const known =
    !q.isError &&
    Number.isSafeInteger(q.data?.total) &&
    Array.isArray(q.data?.items);
  return (
    <section
      className="core-workday-inbox"
      aria-label="Preparação da automação"
    >
      <header className="core-workday-inbox-header">
        <div>
          <p className="core-workday-eyebrow">Planejamento / toda a carteira</p>
          <h3 className="mt-2 flex items-center gap-2">
            <ClipboardList
              size={18}
              className="text-primary"
              aria-hidden="true"
            />
            Conferir regras de entrega
          </h3>
        </div>
        <button
          type="button"
          className="core-workday-ghost"
          disabled={q.isFetching}
          aria-label="Atualizar preparação da automação"
          onClick={() => void q.refetch()}
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </header>
      {q.isPending ? (
        <p role="status">Consultando a preparação dos treinos…</p>
      ) : !known ? (
        <p role="alert">
          Não foi possível confirmar as pendências. Tente atualizar.
        </p>
      ) : (
        <>
          <p>
            <strong className="core-workday-count" aria-live="polite">
              {q.data!.total}
            </strong>
            {q.data!.total === 1
              ? "aluno sem regra automática ativa"
              : "alunos sem regra automática ativa"}
            . A prescrição manual pode continuar disponível.
          </p>
          {!q.data!.total && (
            <p className="core-workday-inbox-empty">
              Nenhuma pendência de automação nesta consulta. Você pode conferir
              o planejamento individual a qualquer momento.
            </p>
          )}
          <div className="core-workday-inbox-list">
            {q.data!.items.map((a) => (
              <Link
                key={a.id}
                to={withAthlete("/app/acompanhamento", a.id)}
                aria-label={`Conferir planejamento de ${a.name}`}
              >
                <div>
                  <strong>
                    {a.name}
                    {q.data!.items.some(
                      (other) => other.id !== a.id && other.name === a.name
                    )
                      ? ` · #${a.id.slice(0, 6)}`
                      : ""}
                  </strong>
                  <span>
                    {a.has_periodization
                      ? "Periodização vinculada"
                      : "Sem periodização"}{" "}
                    ·{" "}
                    {a.has_manual_assignment
                      ? "Atribuição manual disponível"
                      : "Conferir a prescrição"}
                  </span>
                </div>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {q.data!.total > 20 && (
            <nav
              aria-label="Páginas de preparação"
              className="core-workday-pagination"
            >
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                Página {page + 1} de{" "}
                {Math.max(1, Math.ceil(q.data!.total / 20))}
              </span>
              <button
                type="button"
                disabled={(page + 1) * 20 >= q.data!.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
          <p className="core-workday-source">
            Confira a periodização antes de ativar uma regra automática.
          </p>
        </>
      )}
    </section>
  );
}
