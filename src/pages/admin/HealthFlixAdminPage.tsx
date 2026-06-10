import { useEffect, useState } from "react";
import { Film, Plus, RefreshCw, Loader2, Maximize2, X } from "lucide-react";
import { ApiConnectorCard } from "@/components/admin/ApiConnectorCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Vid {
  id: string;
  external_id: string;
  name: string;
  thumbnail_url: string | null;
  player_url: string | null;
  category: string | null;
  synced_at: string | null;
}

export default function HealthFlixAdminPage() {
  const [videos, setVideos] = useState<Vid[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loadingEmbed, setLoadingEmbed] = useState(false);
  const [form, setForm] = useState({ external_id: "", name: "", thumbnail_url: "", player_url: "", category: "geral" });

  async function openProfessorPanel() {
    setLoadingEmbed(true);
    try {
      const { data, error } = await supabase.functions.invoke("healthflix-proxy?action=context", {
        body: { role: "professor", fitpro_professor_id: "admin", view: "library" },
      });
      if (error) throw error;
      const url = (data as any)?.embed_url;
      if (!url) throw new Error("embed_url ausente");
      setEmbedUrl(url);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao abrir painel HealthFlix");
    } finally {
      setLoadingEmbed(false);
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("library_items" as any)
      .select("id, external_id, name, thumbnail_url, player_url, category, synced_at")
      .eq("type", "videos").order("synced_at", { ascending: false }).limit(80);
    setVideos(((data as any[]) || []) as Vid[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function syncFromApi() {
    toast.info("Disparando sincronização...");
    try {
      const { data, error } = await supabase.functions.invoke("sync-library-full");
      if (error) throw error;
      const synced = (data as any)?.data?.synced ?? 0;
      toast.success(`Sync concluído: ${synced} itens`);
      load();
    } catch (e: any) {
      toast.warning("Sync indisponível — conecte a API HealthFlix");
    }
  }

  async function validateConnection() {
    try {
      const r = await fetch("https://kixjiwsfogqztlgiiztp.supabase.co/functions/v1/fitpro-health");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      toast.success(`HealthFlix online · v${j.version}`);
    } catch (e: any) {
      toast.error(`Validação falhou: ${e?.message || "sem resposta"}`);
    }
  }

  async function addVideo() {
    if (!form.external_id || !form.name) { toast.error("ID e nome obrigatórios"); return; }
    const { error } = await supabase.from("library_items" as any).upsert({
      ...form, type: "videos", synced_at: new Date().toISOString(),
    }, { onConflict: "external_id" });
    if (error) { toast.error(error.message); return; }
    toast.success("Vídeo adicionado — refletindo nos alunos em tempo real");
    setForm({ external_id: "", name: "", thumbnail_url: "", player_url: "", category: "geral" });
    setAdding(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remover do catálogo?")) return;
    await supabase.from("library_items" as any).delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display uppercase tracking-tight flex items-center gap-3">
            <Film className="w-7 h-7 text-primary" /> HealthFlix
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo de streaming. Tudo que você publicar aqui aparece em tempo real no app do aluno.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openProfessorPanel} disabled={loadingEmbed}>
            {loadingEmbed ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Maximize2 className="w-4 h-4 mr-2" />}
            Painel HealthFlix
          </Button>
          <Button variant="outline" onClick={validateConnection}>Validar</Button>
          <Button variant="outline" onClick={syncFromApi}><RefreshCw className="w-4 h-4 mr-2" /> Sync API</Button>
          <Button onClick={() => setAdding(!adding)}><Plus className="w-4 h-4 mr-2" /> Novo vídeo</Button>
        </div>
      </div>

      {embedUrl && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-xs uppercase tracking-widest text-primary">Painel HealthFlix (Professor)</p>
            <button onClick={() => setEmbedUrl(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <iframe src={embedUrl} className="flex-1 w-full bg-black" sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-presentation" allow="autoplay; fullscreen; encrypted-media" />
        </div>
      )}


      <ApiConnectorCard
        moduleKey="healthflix"
        title="HealthFlix API"
        description="Conecte a API do HealthFlix para sincronizar o catálogo automaticamente."
        endpointPlaceholder="https://api.healthflix.example.com/v1"
        healthPath="/videos"
      />

      {adding && (
        <Card className="border-primary/40">
          <CardContent className="p-6 space-y-3">
            <h3 className="font-display text-lg">Adicionar vídeo manual</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>ID externo</Label><Input value={form.external_id} onChange={e => setForm({ ...form, external_id: e.target.value })} /></div>
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Thumbnail URL</Label><Input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
              <div><Label>Player URL (YouTube/Vimeo embed)</Label><Input value={form.player_url} onChange={e => setForm({ ...form, player_url: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button onClick={addVideo}>Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {videos.map(v => (
            <Card key={v.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Film className="w-6 h-6 text-muted-foreground m-auto mt-12" />}
              </div>
              <CardContent className="p-3 space-y-2">
                <p className="text-xs font-semibold line-clamp-2">{v.name}</p>
                {v.category && <Badge variant="outline" className="text-[10px]">{v.category}</Badge>}
                <Button variant="ghost" size="sm" className="w-full text-destructive text-xs" onClick={() => remove(v.id)}>Remover</Button>
              </CardContent>
            </Card>
          ))}
          {!videos.length && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">
              Nenhum vídeo no catálogo. Conecte a API ou adicione manualmente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
