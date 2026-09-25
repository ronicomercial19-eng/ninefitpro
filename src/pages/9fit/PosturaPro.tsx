import { useEffect, useState } from "react";
import { Activity, Loader2, Upload, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SIDES = ["front", "back", "left", "right"] as const;
type Side = typeof SIDES[number];

export default function NineFitPosturaPro() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState<Partial<Record<Side, File>>>({});
  const [scans, setScans] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from("postura_scans" as any).select("id,status,created_at,result").eq("user_id", user.id).order("created_at", { ascending: false }).limit(8);
    setScans((data as any[]) || []);
  }
  useEffect(() => { void load(); }, [user?.id]);

  async function submit() {
    if (!user) return toast.error("Faça login para continuar");
    const missing = SIDES.filter((side) => !files[side]);
    if (missing.length) return toast.error(`Envie: ${missing.join(", ")}`);
    setSaving(true);
    const uploadedPaths: string[] = [];
    try {
      const urls: Record<string, string> = {};
      for (const side of SIDES) {
        const file = files[side]!;
        const path = `${user.id}/${Date.now()}_${side}_${file.name}`;
        const { error } = await supabase.storage.from("assessments").upload(path, file, { upsert: true });
        if (error) throw error;
        uploadedPaths.push(path);
        urls[`${side}_url`] = supabase.storage.from("assessments").getPublicUrl(path).data.publicUrl;
      }
      const { data: scan, error } = await supabase.from("postura_scans" as any).insert({ user_id: user.id, ...urls, status: "pending" }).select("id").single();
      if (error) throw error;
      const { error: fnError } = await supabase.functions.invoke("postura-pro-scan", { body: { scan_id: (scan as any).id } });
      if (fnError) throw fnError;
      toast.success("Análise postural enviada");
      setFiles({});
      await load();
    } catch (error: any) {
      if (uploadedPaths.length) await supabase.storage.from("assessments").remove(uploadedPaths);
      toast.error(error?.message || "Não foi possível enviar a análise");
    } finally { setSaving(false); }
  }

  return <div className="min-h-screen bg-background pb-32 text-foreground">
    <div className="px-4 pt-6 flex items-center gap-3"><button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button><div><p className="text-[10px] tracking-[0.3em] text-primary">9FIT // POSTURA PRO</p><h1 className="text-3xl font-display">Análise Postural</h1></div></div>
    <p className="px-4 mt-2 text-sm text-muted-foreground">Envie quatro fotos para receber sua análise postural.</p>
    <div className="mx-4 mt-6 grid grid-cols-2 gap-3">{SIDES.map((side) => <label key={side} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center cursor-pointer"><Upload className="mx-auto mb-2 text-primary" /><span className="text-xs uppercase">{side === "front" ? "Frente" : side === "back" ? "Costas" : side === "left" ? "Lado esquerdo" : "Lado direito"}</span>{files[side] && <p className="mt-2 truncate text-[10px] text-emerald-400">✓ {files[side]!.name}</p>}<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setFiles((current) => ({ ...current, [side]: e.target.files![0] }))} /></label>)}</div>
    <button onClick={submit} disabled={saving} className="mx-4 mt-5 w-[calc(100%-2rem)] rounded-2xl bg-primary py-4 text-primary-foreground font-semibold flex items-center justify-center gap-2">{saving ? <Loader2 className="animate-spin" /> : <Activity />} {saving ? "Enviando…" : "Analisar postura"}</button>
    <div className="mx-4 mt-8"><h2 className="text-xl font-display mb-3">Minhas análises</h2>{scans.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma análise realizada.</p> : scans.map((scan) => <div key={scan.id} className="mb-2 rounded-xl border border-white/10 p-3 flex items-center gap-3"><Activity className="text-primary" /><div><p className="text-sm">{scan.status === "done" ? "Análise concluída" : "Processando análise"}</p><p className="text-[11px] text-muted-foreground">{new Date(scan.created_at).toLocaleString("pt-BR")}</p></div></div>)}</div>
    <BottomNavigation />
  </div>;
}
