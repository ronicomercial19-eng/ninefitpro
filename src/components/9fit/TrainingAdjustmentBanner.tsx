import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AdjustmentNotification = { id: string; related_id: string | null; title: string; message: string | null };

export function TrainingAdjustmentBanner() {
  const { user } = useAuth();
  const [item, setItem] = useState<AdjustmentNotification | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("id,related_id,title,message").eq("user_id", user.id).eq("type", "training_adjustment").eq("is_read", false).order("created_at", { ascending: false }).limit(1);
    setItem((data?.[0] as AdjustmentNotification | undefined) ?? null);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const submit = async (accepted: boolean) => {
    if (!item?.related_id) return;
    setSaving(true);
    const { error } = await supabase.functions.invoke("training-adjustment-feedback", { body: { recommendation_id: item.related_id, accepted, rating, notes, outcome: accepted ? "Ajuste recebido" : "Ajuste recusado" } });
    setSaving(false);
    if (error) { toast.error("Não foi possível registrar seu feedback."); return; }
    await supabase.from("notifications").update({ is_read: true }).eq("id", item.id);
    setItem(null); setOpen(false); setRating(null); setNotes("");
    toast.success("Feedback registrado. O Smart Treino vai usar sua resposta na próxima semana.");
  };

  if (!item) return null;
  return (
    <>
      <section className="mx-4 mb-3 rounded-2xl border border-primary/40 bg-primary/[0.08] p-4 shadow-[0_0_24px_hsl(var(--primary)/0.12)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-primary/15 p-2"><Sparkles className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Ajuste inteligente</p>
            <h2 className="mt-1 text-sm font-bold text-foreground">{item.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{item.message || "Seu treino foi atualizado com base no seu feedback."}</p>
            <button onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><MessageSquare className="h-3.5 w-3.5" /> Como foi?</button>
          </div>
        </div>
      </section>
      {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => !saving && setOpen(false)}>
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Feedback rápido</p><h3 className="mt-1 text-lg font-bold">Como ficou seu treino?</h3></div><button onClick={() => setOpen(false)} disabled={saving}><X className="h-5 w-5 text-muted-foreground" /></button></div>
          <div className="mb-4 flex justify-between gap-2">{[1,2,3,4,5].map((n) => <button key={n} onClick={() => setRating(n)} className={`flex-1 rounded-xl border py-3 text-sm font-bold ${rating === n ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{n}</button>)}</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quer contar algo sobre o ajuste? (opcional)" className="min-h-24 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary" />
          <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => submit(false)} disabled={saving} className="rounded-xl border border-border px-3 py-3 text-xs font-bold text-muted-foreground disabled:opacity-50">Não funcionou</button><button onClick={() => submit(true)} disabled={saving || !rating} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-xs font-bold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? "Salvando..." : "Funcionou"}</button></div>
        </div>
      </div>}
    </>
  );
}
