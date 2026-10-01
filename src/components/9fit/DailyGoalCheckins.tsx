import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function DailyGoalCheckins() {
  const { user } = useAuth();
  const [done, setDone] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const date = format(new Date(), "yyyy-MM-dd");
  const hour = new Date().getHours();
  const slot = hour < 10 ? "Café da manhã" : hour < 15 ? "Almoço" : hour < 18 ? "Lanche" : "Jantar";
  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase.from("master_registry").select("payload").eq("user_id",user.id).eq("source","fitpro_daily_checkin").contains("payload",{date}).then(({data})=>{
      if (active) setDone((data || []).map(row => { const p = row.payload as Record<string,string>; return p.kind === "nutri" ? `nutri:${p.slot}` : p.kind; }));
    });
    return () => { active = false; };
  }, [user?.id,date]);
  async function complete(kind: string) {
    const key = kind === "nutri" ? `nutri:${slot}` : kind;
    if (saving || done.includes(key)) return;
    setSaving(key);
    try {
      const {data,error} = await supabase.rpc("fn_fitpro_daily_checkin" as any,{p_kind:kind,p_date:date,p_slot:kind === "nutri" ? slot : ""});
      if(error) throw error;
      if(!(data as any)?.success) throw new Error("Não foi possível salvar.");
      setDone(values=>[...values,key]);
      window.dispatchEvent(new Event("9fit:sync_updated"));
      toast.success("Conclusão registrada");
    } catch(error: any) { toast.error(error.message || "Falha ao registrar conclusão"); }
    finally { setSaving(null); }
  }
  return <section className="space-y-2" aria-label="Metas diárias"><p className="text-xs text-muted-foreground">Toque para confirmar o que você já fez hoje.</p><div className="grid grid-cols-3 gap-2">{["move","nutri","treino"].map(kind=>{
    const key = kind === "nutri" ? `nutri:${slot}` : kind;
    return <button key={kind} type="button" disabled={!!saving || done.includes(key)} onClick={()=>void complete(kind)} className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs disabled:opacity-70"><strong className="block uppercase">{kind}</strong><span>{saving === key ? "Salvando…" : done.includes(key) ? "✓ Concluído" : kind === "nutri" ? slot : kind === "move" ? "Fiz minha meta" : "Fiz o treino"}</span></button>;
  })}</div></section>;
}
