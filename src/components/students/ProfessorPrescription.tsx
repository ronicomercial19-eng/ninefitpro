import { isAthleteId } from "@/lib/professorWorkspace";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { businessDate } from "@/services/dailyContextRules";
import { professorAI } from "@/services/professorAI";
import {
  validatePrescriptionExercises,
  type PrescriptionExercise,
} from "../../../supabase/functions/_shared/professorContract";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
export function ProfessorPrescription() {
  const w = useProfessorWorkspace();
  return w.selected ? (
    <Editor
      key={w.selected.id}
      athleteId={w.selected.id}
      name={w.selected.name}
    />
  ) : (
    <p className="rounded-xl border p-6">
      Selecione o aluno para revisar e publicar o treino.
    </p>
  );
}
function Editor({ athleteId, name }: { athleteId: string; name: string }) {
  const { user } = useAuth();
  const location = useLocation();
  const queryDate = new URLSearchParams(location.search).get("date");
  const recParam = new URLSearchParams(location.search).get("recommendation");
  const recommendationId = isAthleteId(recParam) ? recParam : null;
  const templateId = new URLSearchParams(location.search).get("template");
  const templateKind = new URLSearchParams(location.search).get("templateKind");
  const [date, setDate] = useState(
      queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)
        ? queryDate
        : businessDate(),
    ),
    [title, setTitle] = useState("Treino do dia"),
    [rows, setRows] = useState<PrescriptionExercise[]>([]),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [expected, setExpected] = useState<string | null>(null),
    [reload, setReload] = useState(0),
    [reviewed, setReviewed] = useState(false),
    [prompt, setPrompt] = useState("");
  const requestId = useRef(crypto.randomUUID()),
    revision = useRef(0),
    writing = useRef(false),
    alive = useRef(true);
  const qc = useQueryClient();
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      revision.current++;
    };
  }, []);
  const catalog = useQuery({
    queryKey: ["exercise-catalog", search],
    queryFn: async () => {
      let q = supabase
        .from("exercises")
        .select("id,name")
        .order("name")
        .limit(30);
      if (search.trim())
        q = q.ilike("name", `%${search.trim().replace(/[%_]/g, "")}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    let active = true;
    revision.current++;
    setLoading(true);
    setLoadError(false);
    setRows([]);
    setExpected(null);
    setReviewed(false);
    requestId.current = crypto.randomUUID();
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("daily_workouts")
          .select(
            "id,day_name,updated_at,created_at,workout_exercises(exercise_id,sets,reps_range,rest_seconds,notes,exercise_order,exercises(name))",
          )
          .eq("athlete_id", athleteId)
          .eq("workout_date", date)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setTitle(data?.day_name || "Treino do dia");
        setExpected(data?.updated_at || data?.created_at || null);
        setRows(
          ((data as any)?.workout_exercises ?? [])
            .sort((a: any, b: any) => a.exercise_order - b.exercise_order)
            .map((e: any) => ({ ...e, name: e.exercises?.name })),
        );
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteId, date, reload]);
  function changed() {
    requestId.current = crypto.randomUUID();
    setReviewed(false);
  }
  function update(index: number, value: Partial<PrescriptionExercise>) {
    changed();
    setRows((list) =>
      list.map((r, i) => (i === index ? { ...r, ...value } : r)),
    );
  }
  async function generate() {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    const request = revision.current;
    try {
      const result = await professorAI(
        athleteId,
        "draft_training",
        prompt || undefined,
      );
      if (!alive.current || request !== revision.current) return;
      if (!result.draft) throw new Error("Rascunho ausente");
      setRows(result.draft.exercises);
      setTitle(result.draft.title);
      changed();
      toast.info("Rascunho pronto para revisão. Ainda não foi publicado.");
    } catch (e) {
      if (alive.current && request === revision.current)
        toast.error(e instanceof Error ? e.message : "Falha ao gerar.");
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function saveDraft() {
    if (writing.current || !user) return;
    writing.current = true;
    setBusy(true);
    try {
      const exercises = validatePrescriptionExercises(rows);
      const { error } = await (supabase as any)
        .from("student_workout_drafts")
        .upsert(
          {
            author_id: user.id,
            athlete_id: athleteId,
            workout_date: date,
            title,
            exercises: rows,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "author_id,athlete_id,workout_date" },
        )
        .select("id")
        .single();
      if (error) throw error;
      if (alive.current) toast.success("Rascunho salvo. Ainda não publicado.");
    } catch (e) {
      if (alive.current)
        toast.error((e as any)?.message || "Falha ao salvar rascunho.");
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function restoreDraft() {
    if (writing.current || !user) return;
    writing.current = true;
    setBusy(true);
    const request = revision.current;
    try {
      const { data, error } = await (supabase as any)
        .from("student_workout_drafts")
        .select("title,exercises")
        .eq("author_id", user.id)
        .eq("athlete_id", athleteId)
        .eq("workout_date", date)
        .maybeSingle();
      if (error) throw error;
      if (!alive.current || request !== revision.current) return;
      if (!data) return toast.info("Nenhum rascunho salvo para esta data.");
      validatePrescriptionExercises(data.exercises);
      setTitle(data.title);
      setRows(data.exercises);
      changed();
      toast.info("Rascunho recuperado para revisão.");
    } catch {
      if (alive.current) toast.error("Não foi possível recuperar o rascunho.");
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function importTemplate() {
    if (
      writing.current ||
      !isAthleteId(templateId) ||
      !["super_sets", "reference_series"].includes(templateKind || "")
    )
      return;
    if (
      rows.length &&
      !window.confirm(
        "Substituir os exercícios deste rascunho pelo modelo? A sessão publicada só muda após revisão e publicação.",
      )
    )
      return;
    writing.current = true;
    setBusy(true);
    const request = revision.current;
    try {
      const { data, error } = await supabase
        .from(templateKind as "super_sets" | "reference_series")
        .select("name,exercises")
        .eq("id", templateId)
        .single();
      if (error) throw error;
      const validated = validatePrescriptionExercises(data.exercises);
      const { data: catalogRows, error: catalogError } = await supabase
        .from("exercises")
        .select("id,name")
        .in(
          "id",
          validated.map((e) => e.exercise_id),
        );
      if (catalogError) throw catalogError;
      if (!alive.current || request !== revision.current) return;
      const names = new Map((catalogRows || []).map((e) => [e.id, e.name]));
      if (validated.some((e) => !names.has(e.exercise_id)))
        throw new Error("Modelo contém exercício indisponível.");
      setRows(
        validated.map((e) => ({
          ...e,
          name: names.get(e.exercise_id),
          notes:
            templateKind === "super_sets"
              ? `Super série: ${data.name}. ${e.notes || ""}`
              : e.notes,
        })),
      );
      setTitle(data.name);
      changed();
      toast.info("Modelo carregado no rascunho. Revise antes de publicar.");
    } catch (e) {
      if (alive.current)
        toast.error((e as Error).message || "Modelo indisponível.");
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function publish() {
    if (writing.current || !reviewed) return;
    let exercises: PrescriptionExercise[];
    try {
      exercises = validatePrescriptionExercises(rows);
    } catch (e) {
      toast.error((e as Error).message);
      return;
    }
    writing.current = true;
    setBusy(true);
    const request = revision.current;
    try {
      const args: any = {
        p_athlete_id: athleteId,
        p_date: date,
        p_title: title,
        p_exercises: exercises,
        p_request_id: requestId.current,
        p_expected_updated_at: expected,
      };
      if (recommendationId) args.p_recommendation_id = recommendationId;
      else args.p_athlete_id = athleteId;
      const { data, error } = await supabase.rpc(
        (recommendationId
          ? "fn_professor_publish_reviewed_adjustment"
          : "fn_professor_publish_workout") as any,
        args,
      );
      if (error) throw error;
      if (!(data as any)?.saved || (data as any)?.athlete_id !== athleteId)
        throw new Error("Publicação não confirmada");
      await qc.invalidateQueries({ queryKey: ["coach-student-context"] });
      if (!alive.current || request !== revision.current) return;
      toast.success("Treino publicado para " + name);
      setReload((v) => v + 1);
      window.dispatchEvent(new Event("9fit:workout-updated"));
    } catch (e) {
      if (alive.current && request === revision.current)
        toast.error(
          "Não foi possível publicar. " +
            ((e as any)?.message || "Tente novamente."),
        );
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">
        Revisar e entregar treino · {name}
      </h2>
      {recommendationId && (
        <p className="text-sm text-primary">
          Revisão manual de recomendação: a publicação também registrará a
          aplicação desta revisão.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        A publicação grava a sessão que aparece no Train do aluno. Sessões
        iniciadas são preservadas; cada publicação guarda uma versão.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          Data em São Paulo
          <input
            aria-label="Data do treino"
            type="date"
            value={date}
            disabled={busy}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
            className="block rounded border bg-background p-2"
          />
        </label>
        <label className="flex-1 text-sm">
          Nome
          <input
            value={title}
            disabled={busy || loading}
            maxLength={120}
            onChange={(e) => {
              changed();
              setTitle(e.target.value);
            }}
            className="block w-full rounded border bg-background p-2"
          />
        </label>
      </div>
      {loading ? (
        <p>Carregando sessão…</p>
      ) : loadError ? (
        <div role="alert">
          Falha ao carregar a sessão.{" "}
          <Button onClick={() => setReload((v) => v + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          {isAthleteId(templateId) && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void importTemplate()}
            >
              Carregar modelo selecionado para revisão
            </Button>
          )}
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer">Pedir rascunho à IA</summary>
            <textarea
              aria-label="Orientações para rascunho"
              className="mt-3 w-full rounded border bg-background p-2"
              value={prompt}
              maxLength={2000}
              disabled={busy}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Objetivo desta sessão e orientações para revisão"
            />
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void generate()}
            >
              Gerar rascunho para revisar
            </Button>
          </details>
          <label className="block text-sm">
            Buscar exercício do acervo
            <input
              value={search}
              disabled={busy}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1 w-full rounded border bg-background p-2"
            />
          </label>
          <div className="max-h-40 overflow-auto rounded-lg border">
            {catalog.isError ? (
              <p role="alert" className="p-3">
                Catálogo indisponível.{" "}
                <button onClick={() => void catalog.refetch()}>
                  Tentar novamente
                </button>
              </p>
            ) : catalog.isLoading ? (
              <p className="p-3">Buscando…</p>
            ) : !catalog.data?.length ? (
              <p className="p-3">Nenhum exercício encontrado.</p>
            ) : (
              catalog.data.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  disabled={busy || rows.length >= 40}
                  onClick={() => {
                    changed();
                    setRows((list) => [
                      ...list,
                      {
                        exercise_id: e.id,
                        name: e.name,
                        sets: 3,
                        reps_range: "8-12",
                        rest_seconds: 60,
                      },
                    ]);
                  }}
                  className="block w-full border-b p-2 text-left text-sm hover:bg-muted"
                >
                  + {e.name}
                </button>
              ))
            )}
          </div>
          {!rows.length && (
            <p className="text-sm text-muted-foreground">
              Adicione exercícios ou gere um rascunho para revisão.
            </p>
          )}
          <ol className="space-y-3">
            {rows.map((r, index) => (
              <li key={index} className="rounded-lg border p-3">
                <div className="flex justify-between gap-3">
                  <strong>
                    {index + 1}. {r.name || r.exercise_id}
                  </strong>
                  <button
                    disabled={busy}
                    onClick={() => {
                      changed();
                      setRows((list) => list.filter((_, i) => i !== index));
                    }}
                    className="text-sm text-destructive"
                  >
                    Remover
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[
                    ["Séries", "sets", "number"],
                    ["Repetições", "reps_range", "text"],
                    ["Descanso (s)", "rest_seconds", "number"],
                  ].map(([label, key, type]) => (
                    <label key={key} className="text-xs">
                      {label}
                      <input
                        aria-label={`${label} de ${r.name}`}
                        type={type}
                        disabled={busy}
                        value={(r as any)[key]}
                        onChange={(e) =>
                          update(index, {
                            [key]:
                              type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                        className="mt-1 block w-28 rounded border bg-background p-2"
                      />
                    </label>
                  ))}
                </div>
                <input
                  aria-label={`Orientação de ${r.name}`}
                  placeholder="Orientação técnica"
                  value={r.notes || ""}
                  maxLength={1000}
                  disabled={busy}
                  onChange={(e) => update(index, { notes: e.target.value })}
                  className="mt-3 w-full rounded border bg-background p-2 text-sm"
                />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={busy || !rows.length}
              onClick={() => void saveDraft()}
            >
              Salvar rascunho
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void restoreDraft()}
            >
              Recuperar rascunho desta data
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={busy}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            Revisei aluno, data, restrições e parâmetros antes da publicação.
          </label>
          <Button
            disabled={busy || !reviewed || !rows.length || !title.trim()}
            onClick={() => void publish()}
          >
            {busy ? "Aguarde…" : "Publicar no app de " + name}
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => setReload((v) => v + 1)}
          >
            Recarregar sessão
          </Button>
        </>
      )}
    </section>
  );
}
