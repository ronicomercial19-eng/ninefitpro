import { useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { businessDate } from "@/services/dailyContextRules";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function ProfessorCycleBuilder() {
  const w = useProfessorWorkspace();
  return w.selected ? (
    <Builder
      key={w.selected.id}
      athleteId={w.selected.id}
      name={w.selected.name}
    />
  ) : (
    <p>Selecione o aluno para publicar um ciclo.</p>
  );
}
function Builder({ athleteId, name }: { athleteId: string; name: string }) {
  const { user } = useAuth();
  const [start, setStart] = useState(businessDate()),
    [weeks, setWeeks] = useState(4),
    [title, setTitle] = useState("Ciclo de acompanhamento"),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false);
  const receipt = useRef<{ fingerprint: string; id: string } | null>(null),
    writing = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const qc = useQueryClient();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${start}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      weekday: d.getUTCDay() || 7,
      label: d.toLocaleDateString("pt-BR", {
        timeZone: "UTC",
        weekday: "long",
      }),
    };
  });
  const q = useQuery({
    queryKey: ["cycle-week-drafts", user?.id, athleteId, start],
    enabled: !!user,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("student_workout_drafts")
        .select("id,title,workout_date,updated_at,exercises")
        .eq("author_id", user!.id)
        .eq("athlete_id", athleteId)
        .gte("workout_date", start)
        .lte("workout_date", days[6].date)
        .order("workout_date");
      if (error) throw error;
      return data as any[];
    },
  });
  useEffect(() => {
    setReviewed(false);
  }, [q.data]);
  async function publish() {
    if (writing.current || !reviewed || !q.data?.length) return;
    writing.current = true;
    setBusy(true);
    const drafts = q.data.map((d) => ({
      draft_id: d.id,
      updated_at: d.updated_at,
      weekday: days.find((day) => day.date === d.workout_date)!.weekday,
    }));
    const payload = {
      p_athlete_id: athleteId,
      p_start: start,
      p_weeks: weeks,
      p_title: title,
      p_drafts: drafts,
    };
    const fingerprint = JSON.stringify(payload);
    if (receipt.current?.fingerprint !== fingerprint)
      receipt.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const { data, error } = await supabase.rpc(
        "fn_professor_publish_cycle" as any,
        { ...payload, p_request_id: receipt.current.id },
      );
      if (error) throw error;
      if (!(data as any)?.saved) throw new Error("Publicação não confirmada");
      if (!alive.current) return;
      toast.success(
        `Ciclo publicado para ${name}: ${(data as any).sessions} sessões.`,
      );
      setReviewed(false);
      await qc.invalidateQueries({ queryKey: ["student-training-cycles"] });
      await qc.invalidateQueries({ queryKey: ["coach-student-context"] });
    } catch (e) {
      if (alive.current)
        toast.error(
          "Não foi possível publicar o ciclo. " +
            ((e as any)?.message || "Tente novamente."),
        );
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">Publicar ciclo semanal · {name}</h2>
      <p className="text-sm text-muted-foreground">
        Monte e salve os rascunhos da primeira semana no editor de treino. O
        ciclo repetirá essa estrutura revisada, sem aumentar cargas
        automaticamente. Não substitui sessões existentes; conflito cancela toda
        a publicação.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Início
          <input
            type="date"
            value={start}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) {
                setStart(e.target.value);
                setReviewed(false);
              }
            }}
            className="block rounded border bg-background p-2"
          />
        </label>
        <label className="text-sm">
          Semanas
          <input
            type="number"
            min={1}
            max={12}
            value={weeks}
            disabled={busy}
            onChange={(e) => {
              setWeeks(Number(e.target.value));
              setReviewed(false);
            }}
            className="block w-20 rounded border bg-background p-2"
          />
        </label>
        <label className="flex-1 text-sm">
          Nome
          <input
            value={title}
            maxLength={120}
            disabled={busy}
            onChange={(e) => {
              setTitle(e.target.value);
              setReviewed(false);
            }}
            className="block w-full rounded border bg-background p-2"
          />
        </label>
      </div>
      {q.isError ? (
        <p role="alert">
          Falha ao carregar rascunhos.{" "}
          <button onClick={() => void q.refetch()}>Tentar novamente</button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando semana…</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {days.map((day) => {
            const draft = q.data?.find((d) => d.workout_date === day.date);
            return (
              <article key={day.date} className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">
                  {day.label} · {day.date}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {draft
                    ? `${draft.title} · ${draft.exercises.length} exercícios`
                    : "Sem sessão programada neste dia"}
                </p>
                {draft && (
                  <details className="text-xs">
                    <summary>Revisar parâmetros</summary>
                    {draft.exercises.map((e: any, i: number) => (
                      <p key={i}>
                        {e.name || e.exercise_id} · {e.sets} × {e.reps_range} ·{" "}
                        {e.rest_seconds}s
                      </p>
                    ))}
                  </details>
                )}
                <Link
                  className="text-sm text-primary underline"
                  to={`/app/treino-ia?athlete=${athleteId}&date=${day.date}`}
                >
                  Montar / revisar rascunho
                </Link>
              </article>
            );
          })}
        </div>
      )}
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={reviewed}
          disabled={busy}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        Revisei as sessões da semana, o período e as restrições de {name}.
      </label>
      <Button
        disabled={
          busy ||
          !reviewed ||
          q.isError ||
          q.isLoading ||
          !q.data?.length ||
          !title.trim() ||
          !Number.isInteger(weeks) ||
          weeks < 1 ||
          weeks > 12
        }
        onClick={() => void publish()}
      >
        {busy ? "Publicando ciclo…" : "Publicar ciclo no planejamento do aluno"}
      </Button>
    </section>
  );
}
