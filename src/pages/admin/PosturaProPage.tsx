import { useEffect, useState } from "react";
import { Activity, ScanLine, Upload, Loader2, CheckCircle2 } from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Scan {
  id: string; status: string; created_at: string; result: any;
  front_url?: string | null; back_url?: string | null; left_url?: string | null; right_url?: string | null;
}

const SIDES = ["front", "back", "left", "right"] as const;
type Side = typeof SIDES[number];

export default function PosturaProPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<Partial<Record<Side, File>>>({});
  const [uploading, setUploading] = useState(false);
  const [scans, setScans] = useState<Scan[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("postura_scans" as any)
      .select("*").order("created_at", { ascending: false }).limit(10);
    setScans(((data as any[]) || []) as Scan[]);
  }
  useEffect(() => { load(); }, []);

  async function uploadAndScan() {
    if (!user) return toast.error("Faça login");
    const missing = SIDES.filter(s => !files[s]);
    if (missing.length) return toast.error(`Faltam fotos: ${missing.join(", ")}`);

    setUploading(true);
    try {
      const urls: any = {};
      for (const side of SIDES) {
        const f = files[side]!;
        const path = `${user.id}/${Date.now()}_${side}_${f.name}`;
        const { error } = await supabase.storage.from("assessments").upload(path, f, { upsert: true });
        if (error) throw error;
        const { data: pub } = supabase.storage.from("assessments").getPublicUrl(path);
        urls[`${side}_url`] = pub.publicUrl;
      }
      const { data: scan, error: insErr } = await supabase.from("postura_scans" as any)
        .insert({ user_id: user.id, ...urls, status: "pending" })
        .select().single();
      if (insErr) throw insErr;

      setRunning((scan as any).id);
      const { error: fnErr } = await supabase.functions.invoke("postura-pro-scan", {
        body: { scan_id: (scan as any).id },
      });
      if (fnErr) throw fnErr;
      toast.success("Análise postural concluída!");
      setFiles({});
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload/análise");
    } finally {
      setUploading(false);
      setRunning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
          <Activity className="w-7 h-7 text-primary" /> Postura Pro Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Envie 4 fotos (frente, costas, lado esquerdo, lado direito) — a IA postural gera laudo.
        </p>
      </div>

      <ApiConnectorCard
        moduleKey="postura_pro"
        title="Postura Pro Analyzer API"
        description="Conecte o serviço externo de análise postural para laudos completos."
        icon={ScanLine}
        endpointPlaceholder="https://api.posturapro.example.com/v1"
        healthPath="/health"
      />

      <Card className="border-primary/30">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-display text-lg">Novo Scan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SIDES.map(side => (
              <label key={side} className="cursor-pointer border-2 border-dashed border-primary/30 rounded-xl p-4 text-center hover:bg-primary/5 transition">
                <Upload className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-xs uppercase font-bold">{side === "front" ? "Frente" : side === "back" ? "Costas" : side === "left" ? "Lado Esq." : "Lado Dir."}</p>
                {files[side] && <p className="text-[10px] text-emerald-400 mt-1 truncate">✓ {files[side]!.name}</p>}
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && setFiles({ ...files, [side]: e.target.files[0] })} />
              </label>
            ))}
          </div>
          <Button onClick={uploadAndScan} disabled={uploading} className="w-full">
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
            {running ? "Processando IA postural..." : "Analisar postura"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm uppercase tracking-widest text-primary font-bold">Histórico</h3>
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum scan ainda.</p>
        ) : scans.map(s => (
          <Card key={s.id}>
            <CardContent className="p-4 flex items-start gap-4">
              {s.front_url && <img src={s.front_url} alt="" className="w-16 h-20 object-cover rounded" />}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={s.status === "done" ? "default" : "outline"}>{s.status}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</span>
                  {s.result?.score && <Badge className="bg-emerald-500/15 text-emerald-400">Score {s.result.score}</Badge>}
                </div>
                {s.result?.summary && <p className="text-sm text-foreground/80">{s.result.summary}</p>}
                {Array.isArray(s.result?.findings) && (
                  <ul className="text-xs text-muted-foreground mt-2 space-y-0.5">
                    {s.result.findings.slice(0, 3).map((f: any, i: number) => (
                      <li key={i}>• <b>{f.region}:</b> {f.note} ({f.severity})</li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
