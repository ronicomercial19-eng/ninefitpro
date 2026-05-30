import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Trash2, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Offer = {
  id?: string;
  name: string;
  description?: string;
  category: string;
  checkout_url?: string;
  iframe_url?: string;
  thumbnail_url?: string;
  status: "active" | "inactive" | "draft";
  priority: number;
};

const empty: Offer = {
  name: "", description: "", category: "prime", status: "draft", priority: 0,
};

export default function MonetizacaoPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("monetization_offers").select("*").order("priority", { ascending: false });
    setOffers((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (!editing.name) { toast.error("Nome obrigatório"); return; }
    const payload = { ...editing, priority: Number(editing.priority) || 0 };
    const { error } = editing.id
      ? await supabase.from("monetization_offers").update(payload).eq("id", editing.id)
      : await supabase.from("monetization_offers").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remover oferta?")) return;
    const { error } = await supabase.from("monetization_offers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removida");
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display italic">Monetização</h1>
            <p className="text-xs text-muted-foreground">Crie e gerencie ofertas com checkout 9Pay sem deploy.</p>
          </div>
        </div>
        <Button onClick={() => setEditing({ ...empty })}>
          <Plus className="w-4 h-4 mr-2" /> Nova oferta
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {offers.map((o) => (
            <Card key={o.id} className="border-border">
              <CardContent className="p-4 flex items-center gap-4">
                {o.thumbnail_url && (
                  <img src={o.thumbnail_url} alt="" className="w-16 h-16 rounded-md object-cover border border-border" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{o.name}</h3>
                    <Badge variant={o.status === "active" ? "default" : "outline"}>{o.status}</Badge>
                    <span className="text-xs text-muted-foreground">prio {o.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.category} · {o.iframe_url ? "iframe" : o.checkout_url ? "link" : "—"}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditing(o)}>Editar</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(o.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
          {!offers.length && <p className="text-sm text-muted-foreground">Nenhuma oferta cadastrada.</p>}
        </div>
      )}

      {editing && (
        <Card className="border-primary/40">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-display text-lg">{editing.id ? "Editar" : "Nova"} oferta</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Categoria</Label><Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
              <div className="space-y-1 md:col-span-2"><Label>Descrição</Label><Textarea rows={3} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="space-y-1"><Label>Checkout URL</Label><Input value={editing.checkout_url ?? ""} onChange={(e) => setEditing({ ...editing, checkout_url: e.target.value })} placeholder="https://..." /></div>
              <div className="space-y-1"><Label>Iframe URL (9Pay)</Label><Input value={editing.iframe_url ?? ""} onChange={(e) => setEditing({ ...editing, iframe_url: e.target.value })} placeholder="https://checkout.9pay..." /></div>
              <div className="space-y-1"><Label>Thumbnail URL</Label><Input value={editing.thumbnail_url ?? ""} onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })} /></div>
              <div className="space-y-1"><Label>Prioridade</Label><Input type="number" value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <select className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                  <option value="draft">draft</option>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
