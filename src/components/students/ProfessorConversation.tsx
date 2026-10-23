import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { professorAI } from "@/services/professorAI";
import { toast } from "sonner";
type Message = { role: "user" | "assistant"; content: string; html?: boolean };
export function ProfessorConversation({
  analysisOnly = false,
}: {
  analysisOnly?: boolean;
}) {
  const w = useProfessorWorkspace();
  if (!w.selected)
    return (
      <p className="rounded-xl border p-6">
        Selecione um aluno no topo para consultar seu contexto.
      </p>
    );
  return (
    <Conversation
      key={w.selected.id}
      athleteId={w.selected.id}
      name={w.selected.name}
      analysisOnly={analysisOnly}
    />
  );
}
function Conversation({
  athleteId,
  name,
  analysisOnly,
}: {
  athleteId: string;
  name: string;
  analysisOnly: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const restored = useRef(false);
  const historyQuery = useQuery({
    queryKey: ["professional-ai-history", user?.id, athleteId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("professional_ai_turns")
        .select("question,answer,mode,created_at")
        .eq("coach_id", user!.id)
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data as any[];
    },
  });
  const [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  const revision = useRef(0),
    writing = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      revision.current++;
    };
  }, []);
  useEffect(() => {
    if (!restored.current && !historyQuery.isFetching && historyQuery.data) {
      restored.current = true;
      setMessages(
        [...historyQuery.data].reverse().flatMap((turn) => [
          { role: "user" as const, content: turn.question },
          {
            role: "assistant" as const,
            content: turn.answer,
            html: turn.mode === "analyze_progress",
          },
        ]),
      );
    }
  }, [historyQuery.data, historyQuery.isFetching]);
  async function clearHistory() {
    if (writing.current || !user) return;
    const { error } = await (supabase as any)
      .from("professional_ai_turns")
      .delete()
      .eq("coach_id", user.id)
      .eq("athlete_id", athleteId);
    if (error) {
      toast.error("Não foi possível limpar o histórico.");
      return;
    }
    revision.current++;
    setMessages([]);
    void qc.invalidateQueries({ queryKey: ["professional-ai-history", user.id, athleteId] });
  }
  async function run(mode: string, text?: string) {
    if (writing.current) return;
    const request = revision.current;
    writing.current = true;
    setBusy(true);
    const next = text
      ? [...messages, { role: "user" as const, content: text }]
      : messages;
    setMessages(next);
    setInput("");
    try {
      const result = await professorAI(
        athleteId,
        mode,
        text,
        messages.map(({ role, content }) => ({ role, content })),
      );
      if (!alive.current || request !== revision.current) return;
      const content = result.recommendations
        ? result.recommendations
            .map((r) => `### ${r.title}\n${r.description}`)
            .join("\n\n")
        : result.content;
      if (typeof content !== "string" || !content.trim())
        throw new Error("A IA não retornou conteúdo válido.");
      const { data: saved, error: saveError } = await supabase.rpc(
        "fn_save_professional_ai_turn" as any,
        {
          p_athlete_id: athleteId,
          p_request_id: crypto.randomUUID(),
          p_question:
            text ||
            (mode === "recommendations"
              ? "Gerar próximos passos"
              : "Analisar registros"),
          p_answer: content,
          p_mode: mode,
        },
      );
      if (!alive.current || request !== revision.current) return;
      if (saveError || !(saved as any)?.saved)
        toast.error(
          "Resposta recebida, mas não foi possível salvar o histórico.",
        );
      else
        void qc.invalidateQueries({
          queryKey: ["professional-ai-history", user?.id, athleteId],
        });
      setMessages([
        ...next,
        { role: "assistant", content, html: mode === "analyze_progress" },
      ]);
    } catch (error) {
      if (alive.current && request === revision.current)
        toast.error(
          error instanceof Error ? error.message : "Falha na consulta.",
        );
    } finally {
      if (alive.current && request === revision.current) {
        setBusy(false);
        writing.current = false;
      }
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h1 className="text-2xl font-bold">
          {analysisOnly ? "Análise do aluno" : "RON · Professor"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Contexto de {name}. Sugestões precisam de revisão; esta conversa não
          altera o treino nem aparece no chat pessoal do aluno.
        </p>
      </div>
      {historyQuery.isError && (
        <p role="alert">
          Não foi possível recuperar o histórico.{" "}
          <button
            onClick={() => void historyQuery.refetch()}
            className="underline"
          >
            Tentar novamente
          </button>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || !restored.current}
          onClick={() => void run("analyze_progress")}
        >
          Analisar registros
        </Button>
        <Button
          variant="outline"
          disabled={busy || !restored.current}
          onClick={() => void run("recommendations")}
        >
          Próximos passos
        </Button>
        <Button
          variant="ghost"
          disabled={busy || !restored.current}
          onClick={() => void clearHistory()}
        >
          Limpar conversa
        </Button>
      </div>
      <div
        className="max-h-[55vh] overflow-y-auto space-y-4"
        aria-live="polite"
      >
        {!messages.length && (
          <p className="text-sm text-muted-foreground">
            Consulte treino executado, relatos, ficha e rotina. A ausência de
            registros será indicada.
          </p>
        )}
        {messages.map((m, i) => (
          <article
            key={i}
            className={`rounded-lg p-4 ${m.role === "user" ? "bg-primary/10" : "bg-muted/40"}`}
          >
            <p className="mb-2 text-xs font-semibold">
              {m.role === "user" ? "Professor" : "RON · sugestão"}
            </p>
            {m.html ? (
              <div
                className="prose prose-sm dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(m.content),
                }}
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            )}
          </article>
        ))}
        {busy && (
          <p role="status">Consultando registros e preparando resposta…</p>
        )}
      </div>
      {!analysisOnly && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) void run("chat", input.trim());
          }}
        >
          <input
            aria-label="Pergunta sobre o aluno"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4000}
            disabled={busy || !restored.current}
            className="min-w-0 flex-1 rounded-lg border bg-background p-3"
            placeholder={`Pergunte sobre ${name}`}
          />
          <Button disabled={busy || !restored.current || !input.trim()}>
            Enviar
          </Button>
        </form>
      )}
    </section>
  );
}
