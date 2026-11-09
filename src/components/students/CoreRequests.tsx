import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withAthlete } from "@/lib/professorWorkspace";
const labels: Record<string, string> = {
  "conversation.handoff": "Atendimento humano solicitado",
  "student.goal_set": "Objetivo do aluno",
  "workout.short_requested": "Treino curto solicitado",
  "checkin.recorded": "Check-in recebido",
  "renewal.requested": "Renovação solicitada",
  "payment.recovery_claimed": "Conferência de pagamento",
};
const states: Record<string, string> = {
  pending: "Em processamento", applied: "Concluído", needs_input: "Precisa de informações",
  needs_review: "Revisão do profissional", unmatched: "Vínculo pendente",
};
type Row = { event_id: string; event_type: string; athlete_id: string | null; state: string; result: { reason?: string; workout_prepared?: boolean; goal_saved?: boolean }; created_at: string };
export function CoreRequests({ athleteId }: { athleteId?: string | null }) {
  const { user } = useAuth();
  const [retrying, setRetrying] = useState<string | null>(null);
  const [retryError, setRetryError] = useState(false);
  const query = useQuery({
    queryKey: ["core-requests", user?.id, athleteId],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      let read = (supabase as any).from("core_action_inbox").select("event_id,event_type,athlete_id,state,result,created_at").order("created_at", { ascending: false }).limit(20);
      if (athleteId) read = read.eq("athlete_id", athleteId);
      const { data, error } = await read;
      if (error) throw new Error("Não foi possível consultar as solicitações.");
      return (data ?? []) as Row[];
    },
  });
  return <section className="rounded-md border bg-card p-4 space-y-3" aria-label="Solicitações do atendimento">
    <h2 className="text-lg font-semibold">Solicitações do atendimento</h2>
    {retryError && <p role="alert" className="text-sm">Não foi possível solicitar uma nova verificação. Tente novamente.</p>}
    {query.isPending ? <p className="text-sm">Carregando solicitações…</p> : query.isError ?
      <p role="alert">Não foi possível carregar. <button className="underline" onClick={() => void query.refetch()}>Tentar novamente</button></p> :
      !query.data?.length ? <p className="text-sm text-muted-foreground">Nenhuma solicitação recebida.</p> :
      <ul className="space-y-3">{query.data.map(row => <li key={row.event_id} className="rounded border p-3">
        <p className="font-medium">{labels[row.event_type] || "Solicitação do aluno"}</p>
        <p className="text-sm text-muted-foreground">{states[row.state] || "Em acompanhamento"}</p>
        {row.result.goal_saved && <p className="text-sm">Objetivo registrado.</p>}
        {row.result.workout_prepared === false && <p className="text-sm">{row.result.reason === "training_restrictions_review" ? "Revise as restrições em Ajuste de Treino com o aluno antes de preparar outra sessão." : "O treino aguarda as informações, o acesso e a calibração do aluno."}</p>}
        {row.result.workout_prepared === false && <button disabled={retrying !== null} className="text-sm underline ml-3 disabled:opacity-50" onClick={async () => {
          setRetrying(row.event_id); setRetryError(false);
          try {
            const r = await (supabase as any).rpc("fn_core_retry_action", { p_event: row.event_id });
            if (r.error || r.data !== true) throw new Error("retry_failed");
            await query.refetch();
          } catch { setRetryError(true); } finally { setRetrying(null); }
        }}>Verificar novamente após a revisão</button>}
        {row.athlete_id && <Link className="text-sm underline" to={withAthlete(
          row.event_type === "renewal.requested" || row.event_type === "payment.recovery_claimed" ? "/app/alunos-assinaturas" : "/app/mensagens", row.athlete_id)}>Abrir acompanhamento</Link>}
      </li>)}</ul>}
  </section>;
}

