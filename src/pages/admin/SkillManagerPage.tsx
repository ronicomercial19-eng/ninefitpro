import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Plus, Save, Trash2, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Skill = {
  id?: string;
  slug: string; name: string; description?: string;
  category: string; tags: string[]; version: number;
  status: "draft" | "active" | "archived";
  content: any;
};

const empty: Skill = { slug: "", name: "", category: "general", tags: [], version: 1, status: "draft", content: {} };

export default function SkillManagerPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("skills").select("*").order("updated_at", { ascending: false });
    setSkills((data ?? []) as any);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (!editing.slug || !editing.name) { toast.error("slug e nome obrigatórios"); return; }
    const payload = { ...editing, version: editing.id ? editing.version + 1 : 1 };
    const { error } = editing.id
      ? await supabase.from("skills").update(payload).eq("id", editing.id)
      : await supabase.from("skills").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Skill salva");
    setEditing(null); load();
  }

  async function toggleActive(s: Skill) {
    const next = s.status === "active" ? "draft" : "active";
    const { error } = await supabase.from("skills").update({ status: next }).eq("id", s.id!);
    if (error) { toast.error(error.message); return; }
    if (next === "active") {
      await supabase.from("skill_activations").insert({
        skill_id: s.id!, scope: "global", active: true,
      } as any);
    }
    toast.success(next === "active" ? "Skill ativada (Nexus)" : "Skill em rascunho");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remover skill?")) return;
    await supabase.from("skills").delete().eq("id", id);
    load();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display italic">Skill Engine</h1>
            <p className="text-xs text-muted-foreground">Professor publica → Nexus sincroniza → Aluno consome.</p>
          </div>
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-2" /> Nova skill</Button>
      </div>

      {loading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : (
        <div className="grid gap-3">
          {skills.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                    <span className="text-xs text-muted-foreground">v{s.version} · {s.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{s.slug}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => toggleActive(s)}>
                  <Power className="w-3 h-3 mr-1" /> {s.status === "active" ? "Desativar" : "Ativar"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(s)}>Editar</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id!)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
          {!skills.length && <p className="text-sm text-muted-foreground">Nenhuma skill cadastrada.</p>}
        </div>
      )}

      {editing && (
        <Card className="border-primary/40">
          <CardContent className="p-6 space-y-3">
            <h2 className="font-display text-lg">{editing.id ? "Editar" : "Nova"} skill</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Slug</Label><Input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div><Label>Nome</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
              <div><Label>Tags (csv)</Label><Input value={editing.tags.join(",")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} /></div>
              <div className="md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Content (JSON)</Label>
                <Textarea rows={8} className="font-mono text-xs" value={JSON.stringify(editing.content, null, 2)}
                  onChange={(e) => { try { setEditing({ ...editing, content: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
