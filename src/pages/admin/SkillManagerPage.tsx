import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Brain, Plus, Save, Trash2, Power, Loader2, BookOpen, Upload, ChevronRight } from "lucide-react";
import { SkillUploader } from "@/components/admin/SkillUploader";
import { toast } from "sonner";
import { SKILLS_BIBLE, SKILL_CATEGORIES, type SkillSpec } from "@/data/skillsBible";

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
  const [expanded, setExpanded] = useState<string | null>(null);

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

  async function installFromBible(spec: SkillSpec) {
    const payload = {
      slug: spec.slug, name: spec.name, description: spec.mission,
      category: spec.category, tags: [`tier-${spec.tier}`, spec.id],
      version: 1, status: "active" as const,
      content: { tier: spec.tier, inputs: spec.inputs, outputs: spec.outputs },
    };
    const exists = skills.find((s) => s.slug === spec.slug);
    if (exists) { toast.info("Já instalada"); return; }
    const { error } = await supabase.from("skills").insert(payload as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`${spec.id} instalada`);
    load();
  }

  const installedSlugs = new Set(skills.map((s) => s.slug));

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
        <Button onClick={() => setEditing({ ...empty })}><Plus className="w-4 h-4 mr-2" /> Nova Skill</Button>
      </div>

      <Tabs defaultValue="installed" className="w-full">
        <TabsList>
          <TabsTrigger value="installed"><Power className="w-3 h-3 mr-1" /> Instaladas</TabsTrigger>
          <TabsTrigger value="bible"><BookOpen className="w-3 h-3 mr-1" /> Biblioteca (Bible v1)</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="w-3 h-3 mr-1" /> Upload</TabsTrigger>
        </TabsList>

        {/* INSTALLED */}
        <TabsContent value="installed" className="space-y-3">
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
              {!skills.length && <p className="text-sm text-muted-foreground">Nenhuma skill instalada. Vá em "Biblioteca" para começar.</p>}
            </div>
          )}
        </TabsContent>

        {/* BIBLE */}
        <TabsContent value="bible" className="space-y-6">
          <p className="text-xs text-muted-foreground">
            19 skills autônomas do <b>9FIT Skill Bible v1.0</b>. Instale qualquer uma com 1 clique — ela será gravada
            em <code className="font-mono">skills</code> e ativada via Nexus para todos os alunos.
          </p>
          {SKILL_CATEGORIES.map((cat) => {
            const list = SKILLS_BIBLE.filter((s) => s.category === cat.key);
            if (!list.length) return null;
            return (
              <div key={cat.key}>
                <p className="text-xs uppercase tracking-widest text-primary font-bold mb-2">{cat.label}</p>
                <div className="grid md:grid-cols-2 gap-3">
                  {list.map((s) => {
                    const installed = installedSlugs.has(s.slug);
                    const open = expanded === s.id;
                    return (
                      <Card key={s.id} className={installed ? "border-primary/40" : ""}>
                        <CardContent className="p-4">
                          <button onClick={() => setExpanded(open ? null : s.id)} className="w-full text-left">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono text-muted-foreground">{s.id}</span>
                                  <Badge variant="outline">Tier {s.tier}</Badge>
                                  {installed && <Badge>instalada</Badge>}
                                </div>
                                <h4 className="font-semibold mt-1">{s.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.mission}</p>
                              </div>
                              <ChevronRight className={`w-4 h-4 mt-1 transition ${open ? "rotate-90" : ""}`} />
                            </div>
                          </button>
                          {open && (
                            <div className="mt-3 space-y-2 text-xs">
                              <div>
                                <p className="font-semibold">Inputs</p>
                                <p className="text-muted-foreground">{s.inputs.join(" · ")}</p>
                              </div>
                              <div>
                                <p className="font-semibold">Outputs</p>
                                <p className="text-muted-foreground">{s.outputs.join(" · ")}</p>
                              </div>
                            </div>
                          )}
                          <div className="mt-3 flex justify-end">
                            <Button
                              size="sm"
                              variant={installed ? "outline" : "default"}
                              disabled={installed}
                              onClick={() => installFromBible(s)}
                            >
                              {installed ? "Já instalada" : "Instalar"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* UPLOAD */}
        <TabsContent value="upload">
          <SkillUploader onDone={load} />
          <p className="text-xs text-muted-foreground mt-3">
            Aceita <code className="font-mono">.skill .md .json .tsx</code>. O Skill Engine organiza e arquiteta as ações no FitPro.
          </p>
        </TabsContent>
      </Tabs>

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
