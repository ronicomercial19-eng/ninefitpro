import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
export function LegacyAIDrafts() {
  const { user } = useAuth(),
    w = useProfessorWorkspace();
  const q = useQuery({
    queryKey: ["legacy-ai-drafts", user?.id, w.athleteId],
    enabled: !!user,
    queryFn: async () => {
      let query = (supabase as any)
        .from("ai_training_generations")
        .select("id,student_name,html,created_at")
        .eq("coach_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (w.athleteId) query = query.eq("athlete_id", w.athleteId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
  return (
    <details className="rounded-xl border bg-card p-4">
      <summary>Histórico de gerações anteriores · consulta</summary>
      <p className="my-3 text-sm text-muted-foreground">
        HTML gerado anteriormente não comprova entrega no Train. Use a revisão
        de sessão para publicar exercícios executáveis.
      </p>
      {q.isError ? (
        <p>
          Falha ao consultar histórico.{" "}
          <button onClick={() => void q.refetch()}>Tentar novamente</button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando…</p>
      ) : !q.data?.length ? (
        <p>Nenhum registro neste escopo.</p>
      ) : (
        q.data.map((d) => (
          <details key={d.id} className="border-t p-3">
            <summary>
              {d.student_name} ·{" "}
              {new Date(d.created_at).toLocaleDateString("pt-BR")}
            </summary>
            <div
              className="prose prose-sm dark:prose-invert"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(d.html ?? ""),
              }}
            />
          </details>
        ))
      )}
    </details>
  );
}
