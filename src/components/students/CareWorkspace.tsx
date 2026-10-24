import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CARE_MODULES, careModule } from "@/data/careModules";
import { isAthleteId, withAthlete } from "@/lib/professorWorkspace";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
type Thread = {
  id: string;
  athlete_id: string;
  module: string;
  subject: string;
  status: string;
  revision: number;
  student_seen_revision: number;
  professional_seen_revision: number;
  resolution_requested: boolean;
  updated_at: string;
  athletes?: { name: string };
};
type CareEvent = {
  id: string;
  body: string;
  actor_role: string;
  action: string;
  revision: number;
  created_at: string;
};
function careError(error: unknown) {
  const e = error as { code?: string; message?: string };
  if (e.code === "40001")
    return "Este acompanhamento recebeu uma atualização. Confira o histórico atualizado antes de responder.";
  if (e.message?.includes("professional_unavailable"))
    return "Não há profissional vinculado disponível. Confira seu acompanhamento com a equipe.";
  if (e.code === "42501")
    return "Seu vínculo não permite esta ação. Confira o aluno selecionado e sua sessão.";
  if (e.message?.includes("request_conflict"))
    return "Esta tentativa já foi usada com outro conteúdo. Atualize o acompanhamento antes de continuar.";
  if (e.message?.startsWith("Este acompanhamento pertence")) return e.message;
  return "Não foi possível confirmar o acompanhamento. Seu texto foi preservado; atualize e tente novamente.";
}
const statusLabel: Record<string, string> = {
  awaiting_professional: "Aguardando profissional",
  awaiting_student: "Aguardando aluno",
  closed: "Confirmado pelo aluno",
};
export function CareWorkspace({
  professional = false,
  athleteId,
}: {
  professional?: boolean;
  athleteId?: string | null;
}) {
  const { user } = useAuth(),
    qc = useQueryClient(),
    [params, setParams] = useSearchParams();
  const selected = params.get("care"),
    [filter, setFilter] = useState("open"),
    [page, setPage] = useState(0),
    [compose, setCompose] = useState(!!params.get("module"));
  const q = useQuery({
    queryKey: ["care-inbox", user?.id, professional, athleteId, filter, page],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      let query = (supabase as any)
        .from("student_care_threads")
        .select(
          "id,athlete_id,module,subject,status,revision,student_seen_revision,professional_seen_revision,resolution_requested,updated_at,athletes(name)",
          { count: "exact" },
        );
      if (athleteId) query = query.eq("athlete_id", athleteId);
      if (filter === "open") query = query.neq("status", "closed");
      else if (filter === "mine")
        query = query.eq(
          "status",
          professional ? "awaiting_professional" : "awaiting_student",
        );
      else if (filter === "closed") query = query.eq("status", "closed");
      const { data, error, count } = await query
        .order("updated_at", { ascending: false })
        .order("id")
        .range(page * 20, page * 20 + 19);
      if (error) throw error;
      return { rows: data as Thread[], count: count || 0 };
    },
  });
  function open(id: string) {
    const next = new URLSearchParams(params);
    next.set("care", id);
    setParams(next);
    setCompose(false);
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          {professional ? "Caixa de acompanhamento" : "Meu acompanhamento"}
        </h2>
        <Button
          disabled={professional && !athleteId}
          onClick={() => setCompose((v) => !v)}
        >
          {professional ? "Nova orientação ao aluno" : "Solicitar orientação"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {professional
          ? "Solicitações, devolutivas e confirmações vinculadas ao aluno e ao módulo. Consulte os registros antes de decidir."
          : "Conte ao seu profissional o que precisa. O texto enviado aqui será compartilhado com ele; suas conversas pessoais com RON permanecem separadas."}
      </p>
      {professional && !athleteId && (
        <p className="text-sm">
          A fila reúne sua carteira autorizada. Selecione um aluno na barra para
          iniciar uma orientação.
        </p>
      )}
      {compose && (
        <NewCare
          professional={professional}
          athleteId={athleteId}
          initialModule={params.get("module")}
          onSaved={(id) => {
            setCompose(false);
            open(id);
          }}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <label className="text-sm">
          Exibir{" "}
          <select
            aria-label="Filtro de acompanhamento"
            className="rounded border bg-background p-2"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="open">Em acompanhamento</option>
            <option value="mine">Precisa da minha resposta</option>
            <option value="closed">Confirmados pelo aluno</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <Button
          variant="outline"
          onClick={() =>
            void qc.invalidateQueries({ queryKey: ["care-inbox"] })
          }
        >
          Atualizar
        </Button>
      </div>
      {q.isError ? (
        <p role="alert">
          Não foi possível carregar a fila.{" "}
          <Button onClick={() => void q.refetch()}>Tentar novamente</Button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando acompanhamento…</p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {q.data?.count} registro(s) neste filtro.
          </p>
          <div className="space-y-2">
            {q.data?.rows.map((t) => (
              <button
                key={t.id}
                onClick={() => open(t.id)}
                className="block w-full rounded-lg border p-3 text-left hover:bg-muted"
              >
                <span className="block font-semibold">{t.subject}</span>
                <span className="block text-sm">
                  {professional && t.athletes?.name
                    ? `${t.athletes.name} · `
                    : ""}
                  {careModule(t.module).title} · {statusLabel[t.status]}
                </span>
                {(professional
                  ? t.professional_seen_revision
                  : t.student_seen_revision) < t.revision && (
                  <span className="text-xs text-primary">
                    Atualização não visualizada
                  </span>
                )}
              </button>
            ))}
            {!q.data?.rows.length && <p>Nenhum acompanhamento neste filtro.</p>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((v) => v - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={(page + 1) * 20 >= (q.data?.count || 0)}
              onClick={() => setPage((v) => v + 1)}
            >
              Próxima
            </Button>
          </div>
        </>
      )}
      {isAthleteId(selected) && (
        <CareDetail
          key={`${user?.id}:${selected}:${athleteId}`}
          id={selected}
          professional={professional}
          athleteId={athleteId}
        />
      )}
    </section>
  );
}
function NewCare({
  professional,
  athleteId,
  initialModule,
  onSaved,
}: {
  professional: boolean;
  athleteId?: string | null;
  initialModule: string | null;
  onSaved: (id: string) => void;
}) {
  const [module, setModule] = useState<string>(careModule(initialModule).key),
    [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false);
  const id = useRef(crypto.randomUUID()),
    event = useRef(crypto.randomUUID()),
    writing = useRef(false),
    alive = useRef(true);
  const qc = useQueryClient();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function send() {
    if (writing.current || !subject.trim() || !body.trim()) return;
    writing.current = true;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("fn_care_write" as any, {
        p_id: id.current,
        p_module: module,
        p_subject: subject.trim(),
        p_body: body.trim(),
        p_event_id: event.current,
        p_action: "open",
        p_expected_revision: null,
        p_athlete_id: professional ? athleteId : null,
      });
      if (error) throw error;
      if (!(data as any)?.saved) throw new Error("Envio não confirmado.");
      await qc.invalidateQueries({ queryKey: ["care-inbox"] });
      if (alive.current) {
        toast.success(
          professional
            ? "Orientação entregue para resposta do aluno."
            : "Solicitação registrada para seu profissional.",
        );
        onSaved(id.current);
      }
    } catch (e) {
      if (alive.current) toast.error(careError(e));
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function changed() {
    event.current = crypto.randomUUID();
  }
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <label className="block text-sm">
        Assunto do acompanhamento
        <select
          disabled={busy}
          className="block w-full rounded border bg-background p-2"
          value={module}
          onChange={(e) => {
            changed();
            setModule(e.target.value);
          }}
        >
          {CARE_MODULES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.title}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">
        {careModule(module).cycle}
      </p>
      <label className="block text-sm">
        Título
        <input
          disabled={busy}
          maxLength={160}
          className="block w-full rounded border bg-background p-2"
          value={subject}
          onChange={(e) => {
            changed();
            setSubject(e.target.value);
          }}
        />
      </label>
      <label className="block text-sm">
        {professional
          ? "Orientação e próximo passo"
          : "O que você precisa compartilhar?"}
        <textarea
          disabled={busy}
          maxLength={4000}
          rows={4}
          className="block w-full rounded border bg-background p-2"
          value={body}
          onChange={(e) => {
            changed();
            setBody(e.target.value);
          }}
        />
      </label>
      <Button
        disabled={busy || !subject.trim() || !body.trim()}
        onClick={() => void send()}
      >
        {busy ? "Confirmando…" : "Enviar acompanhamento"}
      </Button>
    </div>
  );
}
function CareDetail({
  id,
  professional,
  athleteId,
}: {
  id: string;
  professional: boolean;
  athleteId?: string | null;
}) {
  const { user } = useAuth(),
    qc = useQueryClient(),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [limit, setLimit] = useState(50);
  const writing = useRef(false),
    alive = useRef(true),
    seen = useRef(0),
    pending = useRef<{ intent: string; payload: any } | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const q = useQuery({
    queryKey: ["care-detail", user?.id, id, limit],
    refetchInterval: 15000,
    queryFn: async () => {
      const { data: t, error } = await (supabase as any)
        .from("student_care_threads")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      if (athleteId && t.athlete_id !== athleteId)
        throw new Error(
          "Este acompanhamento pertence a outro aluno. Abra o item na carteira correspondente.",
        );
      const { data: events, error: e } = await (supabase as any)
        .from("student_care_events")
        .select("id,body,actor_role,action,revision,created_at")
        .eq("thread_id", id)
        .order("revision", { ascending: false })
        .limit(limit);
      if (e) throw e;
      return { thread: t as Thread, events: (events as CareEvent[]).reverse() };
    },
  });
  useEffect(() => {
    const t = q.data?.thread;
    if (!t || seen.current >= t.revision) return;
    const revision = t.revision;
    seen.current = revision;
    void supabase
      .rpc("fn_care_seen" as any, { p_id: id, p_revision: revision })
      .then(({ error }) => {
        if (error) {
          seen.current = 0;
          return;
        }
        void qc.invalidateQueries({ queryKey: ["care-inbox"] });
      });
  }, [q.data, id, qc]);
  async function respond(action: string) {
    const t = q.data?.thread;
    if (!t || writing.current) return;
    writing.current = true;
    setBusy(true);
    const intent = JSON.stringify({ id, body: body.trim(), action });
    if (pending.current?.intent !== intent)
      pending.current = {
        intent,
        payload: {
          p_id: id,
          p_module: t.module,
          p_subject: t.subject,
          p_body: body.trim(),
          p_event_id: crypto.randomUUID(),
          p_action: action,
          p_expected_revision: t.revision,
          p_athlete_id: t.athlete_id,
        },
      };
    try {
      const { data, error } = await supabase.rpc(
        "fn_care_write" as any,
        pending.current.payload,
      );
      if (error) throw error;
      if (!(data as any)?.saved) throw new Error("Resposta não confirmada.");
      await qc.invalidateQueries({ queryKey: ["care-detail"] });
      await qc.invalidateQueries({ queryKey: ["care-inbox"] });
      if (alive.current) {
        setBody("");
        pending.current = null;
        toast.success(
          action === "acknowledge"
            ? "Orientação confirmada."
            : "Resposta entregue no acompanhamento.",
        );
      }
    } catch (e) {
      if ((e as any)?.code === "40001") {
        pending.current = null;
        await qc.invalidateQueries({ queryKey: ["care-detail"] });
      }
      if (alive.current)
        toast.error(careError(e));
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (q.isError)
    return (
      <p role="alert">
        {careError(q.error)}
        <Button onClick={() => void q.refetch()}>Tentar novamente</Button>
      </p>
    );
  if (!q.data) return <p>Carregando devolutiva…</p>;
  const t = q.data.thread,
    m = careModule(t.module);
  return (
    <article className="space-y-4 rounded-xl border border-primary/30 p-4">
      <h3 className="text-lg font-semibold">{t.subject}</h3>
      <p>
        {m.title} · {statusLabel[t.status]}
      </p>
      <p className="text-xs text-muted-foreground">
        Revisão {t.revision} ·{" "}
        {professional
          ? `Aluno visualizou até a revisão ${t.student_seen_revision}.`
          : `Equipe visualizou até a revisão ${t.professional_seen_revision}.`}{" "}
        Leitura não confirma execução.
      </p>
      <Link
        className="text-primary underline"
        to={
          professional
            ? withAthlete(m.professionalPath + "?care=" + t.id, t.athlete_id)
            : (m.studentPaths[0] || "/9fit/os") + "?care=" + t.id
        }
      >
        {professional ? m.actionLabel : "Abrir módulo relacionado"}
      </Link>
      {q.data.events.length >= limit && (
        <Button variant="outline" onClick={() => setLimit((v) => v + 50)}>
          Carregar registros anteriores
        </Button>
      )}
      <ol className="space-y-3">
        {q.data.events.map((e) => (
          <li key={e.id} className="rounded border p-3">
            <p className="text-xs text-muted-foreground">
              {e.actor_role === "professional" ? "Profissional" : "Aluno"} ·{" "}
              {new Date(e.created_at).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · revisão {e.revision}
            </p>
            <p className="whitespace-pre-wrap break-words">{e.body}</p>
          </li>
        ))}
      </ol>
      {t.resolution_requested && (
        <p className="text-sm">
          O profissional devolveu a orientação e pediu sua confirmação.
          Confirmar recebimento não registra um treino como realizado.
        </p>
      )}
      <label className="block text-sm">
        {professional
          ? "Devolutiva e próximo passo"
          : "Responder ao acompanhamento"}
        <textarea
          rows={3}
          maxLength={4000}
          disabled={busy}
          className="block w-full rounded border bg-background p-2"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={busy || !body.trim()}
          onClick={() => void respond("reply")}
        >
          {professional ? "Enviar devolutiva" : "Enviar resposta"}
        </Button>
        {professional && (
          <>
            <Button
              disabled={busy || !body.trim()}
              variant="outline"
              onClick={() => void respond("request_info")}
            >
              Pedir informação
            </Button>
            <Button
              disabled={busy || !body.trim()}
              variant="outline"
              onClick={() => void respond("resolve")}
            >
              Orientar e pedir confirmação
            </Button>
          </>
        )}
        {!professional && t.status === "awaiting_student" && (
          <Button
            disabled={busy || !!body.trim()}
            title={
              body.trim()
                ? "Envie ou limpe seu texto antes de confirmar."
                : undefined
            }
            variant="outline"
            onClick={() => void respond("acknowledge")}
          >
            Recebi a orientação · confirmar
          </Button>
        )}
      </div>
    </article>
  );
}
