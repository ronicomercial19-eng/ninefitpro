import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  validatePrescriptionExercises,
  type PrescriptionExercise,
} from "../../../supabase/functions/_shared/professorContract";
type Template = {
  id: string;
  name: string;
  exercises: PrescriptionExercise[];
  created_by: string;
  updated_at: string;
};
export function TrainingTemplateLibrary({
  kind,
}: {
  kind: "super_sets" | "reference_series";
}) {
  const { user, isAdmin } = useAuth(),
    w = useProfessorWorkspace(),
    navigate = useNavigate(),
    qc = useQueryClient();
  const [editing, setEditing] = useState<Template | null>(null),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const q = useQuery({
    queryKey: ["training-templates", kind, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(kind)
        .select("id,name,exercises,created_by,updated_at")
        .order("name");
      if (error) throw error;
      return data as unknown as Template[];
    },
  });
  const catalog = useQuery({
    queryKey: ["template-exercises", search],
    enabled: !!editing,
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("id,name")
        .order("name")
        .limit(30);
      if (search.trim())
        query = query.ilike("name", `%${search.replace(/[%_]/g, "")}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  async function save() {
    if (!editing || !user || writing.current) return;
    writing.current = true;
    setBusy(true);
    try {
      const exercises = validatePrescriptionExercises(editing.exercises);
      if (
        !editing.name.trim() ||
        (kind === "super_sets" && exercises.length < 2)
      )
        throw new Error(
          "Informe nome e exercícios; super série exige ao menos dois.",
        );
      const existing = q.data?.find((t) => t.id === editing.id),
        payload = {
          name: editing.name.trim(),
          exercises: editing.exercises,
          ...(kind === "super_sets"
            ? { exercise_count: exercises.length }
            : {}),
          updated_at: new Date().toISOString(),
        };
      const { error } = existing
        ? await supabase
            .from(kind)
            .update(payload as any)
            .eq("id", editing.id)
            .eq("updated_at", editing.updated_at)
            .select("id")
            .single()
        : await supabase
            .from(kind)
            .upsert(
              { ...payload, id: editing.id, created_by: user.id } as any,
              { onConflict: "id" },
            )
            .select("id")
            .single();
      if (error) throw error;
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["training-templates", kind] });
      toast.success(
        "Modelo salvo com exercícios. Revise no editor antes de publicar ao aluno.",
      );
    } catch (e) {
      toast.error(
        (e as Error).message || "Gravação não confirmada. Atualize a lista.",
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  async function remove(t: Template) {
    if (
      writing.current ||
      !window.confirm(
        `Excluir ${t.name}? Treinos publicados serão preservados.`,
      )
    )
      return;
    writing.current = true;
    setBusy(true);
    try {
      const { error } = await supabase
        .from(kind)
        .delete()
        .eq("id", t.id)
        .eq("updated_at", t.updated_at)
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["training-templates", kind] });
      toast.success("Modelo excluído.");
    } catch {
      toast.error("Exclusão não confirmada. Atualize a lista.");
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  function change(i: number, k: string, v: string | number) {
    setEditing((t) =>
      t
        ? {
            ...t,
            exercises: t.exercises.map((e, j) =>
              j === i ? { ...e, [k]: v } : e,
            ),
          }
        : t,
    );
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">
        {kind === "super_sets" ? "Super Séries" : "Séries de referência"}
      </h1>
      <p>
        Modelos com exercícios reais. A entrega passa pelo editor, revisão e
        publicação. Complete os modelos antigos vazios antes de usar.
      </p>
      <Button
        disabled={busy}
        onClick={() =>
          setEditing({
            id: crypto.randomUUID(),
            name: "",
            exercises: [],
            created_by: user!.id,
            updated_at: "",
          })
        }
      >
        Novo modelo
      </Button>
      {q.isError ? (
        <p role="alert">
          Falha ao carregar.{" "}
          <Button onClick={() => void q.refetch()}>Tentar novamente</Button>
        </p>
      ) : q.isLoading ? (
        <p>Carregando…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data?.map((t) => (
            <article key={t.id} className="rounded-xl border p-4 space-y-3">
              <h2>{t.name}</h2>
              <p>
                {Array.isArray(t.exercises) ? t.exercises.length : 0} exercícios
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    busy ||
                    !w.selected ||
                    !Array.isArray(t.exercises) ||
                    !t.exercises.length
                  }
                  onClick={() =>
                    navigate(
                      w.link(
                        `/app/treino-ia?template=${t.id}&templateKind=${kind}`,
                      ),
                    )
                  }
                >
                  Usar para {w.selected?.name || "aluno selecionado"}
                </Button>
                {(isAdmin || t.created_by === user?.id) && (
                  <>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() =>
                        setEditing({
                          ...t,
                          exercises: Array.isArray(t.exercises)
                            ? t.exercises
                            : [],
                        })
                      }
                    >
                      Editar
                    </Button>
                    <Button
                      disabled={busy}
                      variant="destructive"
                      onClick={() => void remove(t)}
                    >
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
          {!q.data?.length && <p>Nenhum modelo cadastrado.</p>}
        </div>
      )}
      {editing && (
        <section className="rounded-xl border p-4 space-y-3">
          <h2>Editar modelo</h2>
          <label className="block">
            Nome
            <input
              maxLength={120}
              disabled={busy}
              className="block w-full rounded border bg-background p-2"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="block">
            Buscar exercício
            <input
              disabled={busy}
              className="block w-full rounded border bg-background p-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="max-h-40 overflow-auto">
            {catalog.isError ? (
              <Button onClick={() => void catalog.refetch()}>
                Recarregar acervo
              </Button>
            ) : (
              catalog.data?.map((e) => (
                <button
                  disabled={busy || editing.exercises.length >= 40}
                  className="block p-2 text-left"
                  key={e.id}
                  onClick={() =>
                    setEditing({
                      ...editing,
                      exercises: [
                        ...editing.exercises,
                        {
                          exercise_id: e.id,
                          name: e.name,
                          sets: 3,
                          reps_range: "8-12",
                          rest_seconds: 60,
                        },
                      ],
                    })
                  }
                >
                  + {e.name}
                </button>
              ))
            )}
          </div>
          {editing.exercises.map((e, i) => (
            <div key={i} className="rounded border p-3 space-y-2">
              <strong>
                {i + 1}. {e.name || e.exercise_id}
              </strong>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Séries", "sets", "number"],
                  ["Repetições", "reps_range", "text"],
                  ["Descanso (s)", "rest_seconds", "number"],
                  ["Orientações", "notes", "text"],
                ].map(([label, key, type]) => (
                  <label key={key} className="text-sm">
                    {label}
                    <input
                      disabled={busy}
                      className="block w-36 rounded border bg-background p-2"
                      type={type}
                      value={(e as any)[key] ?? ""}
                      onChange={(ev) =>
                        change(
                          i,
                          key,
                          type === "number"
                            ? Number(ev.target.value)
                            : ev.target.value,
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() =>
                  setEditing({
                    ...editing,
                    exercises: editing.exercises.filter((_, j) => j !== i),
                  })
                }
              >
                Remover exercício
              </Button>
            </div>
          ))}
          {kind === "super_sets" && (
            <p>
              A ordem e as orientações serão copiadas. Revise os intervalos e a
              execução combinada antes de entregar.
            </p>
          )}
          <Button disabled={busy} onClick={() => void save()}>
            Salvar modelo
          </Button>{" "}
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => setEditing(null)}
          >
            Cancelar
          </Button>
        </section>
      )}
    </div>
  );
}
