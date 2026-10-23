import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
const recommendationLabels: Record<string, string> = {
  review_with_professor: "Revisão necessária",
  increase_recovery: "Revisar recuperação",
  reduce_intensity: "Revisar intensidade",
  reduce_volume: "Reduzir volume",
  maintain: "Manter plano",
};
const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceita para revisão",
  applied: "Aplicada",
  rejected: "Rejeitada",
};
export default function TrainingAdjustmentsPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const w = useProfessorWorkspace(),
    { user } = useAuth(),
    qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null),
    [preview, setPreview] = useState<any>(null);
  const writing = useRef(false);
  const q = useQuery({
    queryKey: ["professor-adjustments", user?.id, w.athleteId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "fn_professor_adjustment_analytics" as any,
        { p_athlete_id: w.athleteId },
      );
      if (error) throw error;
      if (!(data as any)?.success) throw new Error("Consulta não confirmada");
      return data as any;
    },
  });
  async function act(id: string, kind: string) {
    if (writing.current) return;
    writing.current = true;
    setBusy(id);
    try {
      const args =
        kind === "preview"
          ? { p_recommendation_id: id }
          : kind === "apply"
            ? {
                p_recommendation_id: id,
                p_expected_revision: preview?.revision,
              }
            : { p_recommendation_id: id, p_action: kind };
      const rpc =
        kind === "preview"
          ? "fn_professor_adjustment_preview"
          : kind === "apply"
            ? "fn_professor_apply_adjustment"
            : "fn_professor_review_adjustment";
      const { data, error } = await supabase.rpc(rpc as any, args);
      if (error) throw error;
      if (!(data as any)?.success) throw new Error("Ação não confirmada");
      if (kind === "preview") {
        setPreview(data);
        return;
      }
      setPreview(null);
      toast.success(
        kind === "apply"
          ? "Exercícios revisados e publicados no Train."
          : "Revisão registrada.",
      );
      await qc.invalidateQueries({ queryKey: ["professor-adjustments"] });
      await qc.invalidateQueries({ queryKey: ["coach-student-context"] });
    } catch (e) {
      toast.error((e as any)?.message || "Não foi possível concluir a ação.");
    } finally {
      writing.current = false;
      setBusy(null);
    }
  }
  return (
    <section className={`space-y-4 ${embedded ? "p-6" : ""}`}>
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Revisão de ajustes</h2>
          <p className="text-sm text-muted-foreground">
            Aceitar uma sugestão não altera a sessão. Confira o antes e depois
            antes de aplicar; sessões iniciadas ficam preservadas.
          </p>
        </div>
        <Button variant="outline" onClick={() => void q.refetch()}>
          Atualizar
        </Button>
      </div>
      {q.isError ? (
        <p role="alert">
          Não foi possível carregar recomendações.{" "}
          <button onClick={() => void q.refetch()}>Tentar novamente</button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando…</p>
      ) : !q.data.recommendations?.length ? (
        <p>Nenhuma recomendação neste escopo.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              ["Pendentes", q.data.summary?.pending],
              ["Aceitas", q.data.summary?.accepted],
              ["Aplicadas", q.data.summary?.applied],
              ["Entrega nativa confirmada", q.data.summary?.delivered],
            ].map(([label, value]) => (
              <p key={label}>
                {label}: <b>{value ?? "—"}</b>
              </p>
            ))}
          </div>
          {q.data.recommendations.map((r: any) => (
            <article
              key={r.id}
              className="rounded-xl border bg-card p-4 space-y-3"
            >
              <h3 className="font-semibold">
                {r.athletes?.name} ·{" "}
                {recommendationLabels[r.recommendation_type] ||
                  "Revisão de treino"}
              </h3>
              <p className="text-sm">{r.rationale}</p>
              <p className="text-xs text-muted-foreground">
                Semana {r.week_start} · {statusLabels[r.status] || r.status}
                {r.status === "applied" && !r.native_delivery_confirmed
                  ? " · registro legado, entrega nativa ainda não comprovada"
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      disabled={!!busy}
                      onClick={() => void act(r.id, "reject")}
                    >
                      Rejeitar
                    </Button>
                    <Button
                      disabled={!!busy}
                      onClick={() => void act(r.id, "accept")}
                    >
                      Aceitar para revisão
                    </Button>
                  </>
                )}
                {r.status === "accepted" && (
                  <Button
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => void act(r.id, "preview")}
                  >
                    Conferir alterações propostas
                  </Button>
                )}
                <Link
                  to={`/app/treino-ia?athlete=${r.athlete_id}&date=${r.week_start}&recommendation=${r.id}`}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Revisar no editor
                </Link>
              </div>
              {preview?.recommendation_id === r.id && (
                <div className="rounded-lg bg-muted p-3 space-y-2">
                  {!preview.supported ? (
                    <p className="text-sm">
                      Esta proposta exige decisão no editor: não será convertida
                      em mudança automática de carga ou recuperação.
                    </p>
                  ) : !preview.changes?.some(
                      (c: any) => c.old_sets !== c.new_sets,
                    ) ? (
                    <p className="text-sm">
                      Nenhuma alteração elegível nas sessões ainda não
                      iniciadas.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">
                        Antes → depois, apenas nas sessões ainda não iniciadas:
                      </p>
                      <ul className="max-h-60 overflow-auto text-sm">
                        {preview.changes.map((c: any) => (
                          <li key={c.row_id}>
                            {c.date} · {c.name}: {c.old_sets} → {c.new_sets}{" "}
                            séries
                          </li>
                        ))}
                      </ul>
                      <Button
                        disabled={!!busy}
                        onClick={() => void act(r.id, "apply")}
                      >
                        Confirmar alteração e publicar no Train
                      </Button>
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
