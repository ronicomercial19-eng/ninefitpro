import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { businessDate } from "@/services/dailyContextRules";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type WindowDraft = { id: string; workout_date: string; title: string; updated_at: string };

export function ReviewedTrainingWindow({ days, onEdit }: { days: 7 | 30 | 365; onEdit: (date: string) => void }) {
  const { user } = useAuth();
  const { selected } = useProfessorWorkspace();
  const client = useQueryClient();
  const [start, setStart] = useState(businessDate);
  const [date, setDate] = useState(start);
  const [reviewed, setReviewed] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const receipt = useRef<{ fingerprint: string; id: string } | null>(null);
  const lastDate = new Date(start + "T12:00:00Z");
  lastDate.setUTCDate(lastDate.getUTCDate() + days - 1);
  const end = lastDate.toISOString().slice(0, 10);
  const drafts = useQuery({
    queryKey: ["cycle-week-drafts", user?.id, selected?.id, start, end],
    enabled: !!selected && !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("student_workout_drafts")
        .select("id,workout_date,title,updated_at")
        .eq("athlete_id", selected!.id).eq("author_id", user!.id)
        .gte("workout_date", start).lte("workout_date", end).order("workout_date");
      if (error) throw error;
      return data as WindowDraft[];
    },
  });
  const items = (drafts.data ?? []).map(draft => ({ draft_id: draft.id, date: draft.workout_date, updated_at: draft.updated_at }));
  const fingerprint = JSON.stringify([selected?.id, start, days, items]);
  async function publish() {
    if (!selected || lock.current || !items.length || reviewed !== fingerprint || drafts.isError || drafts.isFetching) return;
    lock.current = true;
    setBusy(true);
    if (receipt.current?.fingerprint !== fingerprint) receipt.current = { fingerprint, id: crypto.randomUUID() };
    try {
      const { data, error } = await supabase.rpc("fn_professor_publish_reviewed_window" as never, {
        p_athlete_id: selected.id, p_start: start, p_days: days, p_drafts: items, p_request_id: receipt.current.id,
      } as never);
      if (error) throw error;
      const result = data as { saved?: boolean; sessions?: number } | null;
      if (!result?.saved) throw new Error("Publicação não confirmada.");
      toast.success(`${result.sessions} sessões publicadas para ${selected.name}.`);
      setReviewed("");
      void client.invalidateQueries({ queryKey: ["coach-student-context"] });
    } catch (error) {
      const message = (error as { message?: string }).message;
      toast.error(message === "draft_changed_reload" ? "Um rascunho mudou. Atualize e revise a lista." : "Não foi possível publicar a janela. Confira conflitos com sessões já publicadas e tente novamente.");
      if (message === "draft_changed_reload") void drafts.refetch();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!selected) return <p>Selecione um aluno no topo.</p>;
  return <section className="space-y-4 rounded-xl border bg-card p-4">
    <h2 className="font-semibold">Sessões revisadas · {selected.name}</h2>
    <p className="text-sm text-muted-foreground">Publique os rascunhos das datas escolhidas. Sessões já publicadas são revisadas no editor individual.</p>
    <div className="flex flex-wrap gap-3">
      <label className="text-sm">Início da janela<input className="block min-h-11 rounded border bg-background p-2" type="date" min={businessDate()} value={start} disabled={busy} onChange={event => { if (event.target.value) { setStart(event.target.value); setDate(event.target.value); } }} /></label>
      <label className="text-sm">Dia para editar<input className="block min-h-11 rounded border bg-background p-2" type="date" min={start} max={end} value={date} disabled={busy} onChange={event => setDate(event.target.value)} /></label>
      <Button className="self-end" variant="outline" disabled={busy || date < start || date > end} onClick={() => onEdit(date)}>Editar dia</Button>
    </div>
    {drafts.isPending ? <p>Carregando rascunhos…</p> : drafts.isError ? <Button variant="outline" onClick={() => void drafts.refetch()}>Tentar carregar novamente</Button>
      : !items.length ? <p className="text-sm text-muted-foreground">Nenhum rascunho nessa janela. Escolha um dia e salve a sessão no editor.</p>
      : <ul className="max-h-80 space-y-2 overflow-y-auto">{drafts.data?.map(draft => <li key={draft.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"><span>{draft.workout_date} · {draft.title}</span><Button variant="ghost" disabled={busy} onClick={() => onEdit(draft.workout_date)}>Revisar</Button></li>)}</ul>}
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed === fingerprint} disabled={busy || !items.length} onChange={event => setReviewed(event.target.checked ? fingerprint : "")} /> Revisei os {items.length} rascunhos desta janela.</label>
    <Button disabled={busy || !items.length || reviewed !== fingerprint || drafts.isFetching || drafts.isError || start < businessDate()} onClick={() => void publish()}>{busy ? "Publicando…" : "Publicar sessões revisadas"}</Button>
  </section>;
}
