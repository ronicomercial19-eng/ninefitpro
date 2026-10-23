import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function ProfessionalMessages({
  athleteId,
  professional = false,
  name,
}: {
  athleteId: string;
  professional?: boolean;
  name?: string;
}) {
  const { user } = useAuth();
  const [text, setText] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<{ id: string; body: string } | null>(null),
    writing = useRef(false),
    alive = useRef(true);
  const qc = useQueryClient();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  type Message = {
    id: string;
    sender_user_id: string;
    sender_role: string;
    body: string;
    created_at: string;
  };
  const query = useInfiniteQuery({
    queryKey: ["professional-messages", user?.id, athleteId],
    enabled: !!user,
    initialPageParam: null as { created_at: string; id: string } | null,
    refetchInterval: (q) => (q.state.data?.pages.length === 1 ? 5000 : false),
    queryFn: async ({ pageParam }) => {
      let read = (supabase as any)
        .from("student_professional_messages")
        .select("id,sender_user_id,sender_role,body,created_at")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(50);
      if (pageParam)
        read = read.or(
          `created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`,
        );
      const { data, error } = await read;
      if (error) throw error;
      return (data ?? []) as Message[];
    },
    getNextPageParam: (last: Message[]) =>
      last.length === 50
        ? {
            created_at: last[last.length - 1].created_at,
            id: last[last.length - 1].id,
          }
        : undefined,
  });
  const messages = query.data?.pages.flat() ?? [];
  async function send() {
    if (writing.current || !text.trim()) return;
    writing.current = true;
    setBusy(true);
    const body = text.trim();
    if (pending.current?.body !== body)
      pending.current = { id: crypto.randomUUID(), body };
    try {
      const { data, error } = await supabase.rpc(
        "fn_send_student_message" as any,
        {
          p_athlete_id: athleteId,
          p_body: body,
          p_request_id: pending.current.id,
        },
      );
      if (error) throw error;
      if (!(data as any)?.saved) throw new Error("Mensagem não confirmada");
      await qc.invalidateQueries({
        queryKey: ["professional-messages", user?.id, athleteId],
      });
      if (alive.current) {
        toast.dismiss(`professional-message-failure:${athleteId}`);
        setText("");
        pending.current = null;
      }
    } catch {
      if (alive.current)
        toast.error(
          "Não foi possível confirmar o envio. Seu texto foi preservado para tentar novamente.",
          { id: `professional-message-failure:${athleteId}` },
        );
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="text-xl font-semibold">
        {professional
          ? "Conversa com " + (name || "aluno")
          : "Meu profissional" + (name ? " · " + name : "")}
      </h2>
      <p className="text-sm text-muted-foreground">
        Conversa humana de acompanhamento. O RON e o atendimento da equipe têm
        espaços separados.
      </p>
      {query.isError ? (
        <div role="alert">
          Falha ao carregar mensagens.{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : query.isLoading ? (
        <p>Carregando conversa…</p>
      ) : (
        <>
          <div
            className="max-h-[50vh] space-y-3 overflow-y-auto"
            aria-live="polite"
          >
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem nesta conversa.
              </p>
            )}
            {[...messages].reverse().map((m) => (
              <article
                key={m.id}
                className={`rounded-lg p-3 ${m.sender_user_id === user?.id ? "bg-primary/10" : "bg-muted"}`}
              >
                <p className="text-xs text-muted-foreground">
                  {m.sender_role === "professional" ? "Profissional" : "Aluno"}{" "}
                  ·{" "}
                  {new Date(m.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {m.body}
                </p>
              </article>
            ))}
          </div>
          {query.hasNextPage && (
            <Button
              variant="ghost"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage
                ? "Carregando…"
                : "Carregar mensagens anteriores"}
            </Button>
          )}
          <Button
            variant="ghost"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Atualizar conversa
          </Button>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="space-y-2"
      >
        <textarea
          aria-label="Mensagem ao profissional ou aluno"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          disabled={busy}
          className="w-full rounded-lg border bg-background p-3"
          placeholder="Escreva sua mensagem"
        />
        <Button disabled={busy || !text.trim()}>
          {busy ? "Confirmando envio…" : "Enviar mensagem"}
        </Button>
      </form>
    </section>
  );
}
