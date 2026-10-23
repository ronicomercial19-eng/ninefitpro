import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { businessDate } from "@/services/dailyContextRules";
export function StudentTrainingCycles({
  athleteId,
  professional = false,
  onHasCycles,
}: {
  athleteId: string;
  professional?: boolean;
  onHasCycles?: (has: boolean) => void;
}) {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["student-training-cycles", user?.id, athleteId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("student_training_cycles")
        .select("id,title,start_date,end_date,weeks,created_at")
        .eq("athlete_id", athleteId)
        .order("start_date", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data as any[];
    },
  });
  useEffect(() => {
    if (q.data) onHasCycles?.(q.data.some((c) => c.end_date >= businessDate()));
  }, [q.data, onHasCycles]);
  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="font-semibold">Ciclos publicados pelo profissional</h2>
      {q.isError ? (
        <p role="alert">
          Não foi possível carregar os ciclos.{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Tentar novamente
          </button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando ciclos…</p>
      ) : !q.data?.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhum ciclo nativo publicado. Outros planos e documentos permanecem
          disponíveis abaixo.
        </p>
      ) : (
        q.data.map((c) => (
          <article key={c.id} className="rounded-lg border p-3">
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm">
              {c.start_date} a {c.end_date} · {c.weeks} semanas ·{" "}
              {businessDate() < c.start_date
                ? "Programado"
                : businessDate() > c.end_date
                  ? "Período encerrado"
                  : "Vigente"}
            </p>
            {!professional && (
              <Link
                className="text-sm text-primary underline"
                to={`/9fit/train?tab=semana&date=${businessDate() < c.start_date ? c.start_date : businessDate() > c.end_date ? c.end_date : businessDate()}`}
              >
                Conferir sessões
              </Link>
            )}
          </article>
        ))
      )}
    </section>
  );
}
