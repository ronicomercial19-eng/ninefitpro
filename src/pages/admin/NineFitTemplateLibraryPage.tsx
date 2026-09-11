import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Template = {
  id: string;
  slug: string;
  name: string;
  template_type: string;
  status: string;
  source_url: string | null;
  source_html: string | null;
  required_variables: string[] | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};

const statusLabels: Record<string, string> = { draft: "Rascunho", approved: "Aprovado", archived: "Arquivado" };

export default function NineFitTemplateLibraryPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ninefit_template_library" as never)
      .select("id,slug,name,template_type,status,source_url,source_html,required_variables,metadata,updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setTemplates((data ?? []) as unknown as Template[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const visible = useMemo(
    () => filter === "all" ? templates : templates.filter((item) => item.status === filter),
    [filter, templates],
  );

  const review = async (status: "approved" | "archived" | "draft") => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.rpc("fn_review_ninefit_template" as never, {
      p_template_id: selected.id,
      p_status: status,
    } as never);
    if (error) toast.error(error.message);
    else { toast.success(`Modelo ${statusLabels[status].toLowerCase()}.`); await load(); setSelected((current) => current ? { ...current, status } : null); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Biblioteca de modelos 9FIT</h1>
        <p className="text-muted-foreground">Revise e aprove modelos de design, prescrição e protocolos antes de aplicar a alunos.</p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({templates.length})</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="archived">Arquivados</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {loading ? <p className="text-muted-foreground">Carregando modelos…</p> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
          <Card>
            <CardHeader><CardTitle>Modelos ({visible.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {visible.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected(item)} className={`w-full rounded-md border p-3 text-left transition hover:bg-muted ${selected?.id === item.id ? "border-primary bg-muted" : ""}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{item.name}</span><Badge variant={item.status === "approved" ? "default" : "secondary"}>{statusLabels[item.status] ?? item.status}</Badge></div>
                  <p className="text-xs text-muted-foreground">{item.template_type} · {item.slug}</p>
                </button>
              ))}
              {!visible.length && <p className="text-sm text-muted-foreground">Nenhum modelo neste filtro.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{selected ? selected.name : "Selecione um modelo"}</CardTitle></CardHeader>
            <CardContent>
              {selected ? <div className="space-y-4">
                <div className="flex flex-wrap gap-2"><Badge>{selected.template_type}</Badge><Badge variant="outline">{statusLabels[selected.status] ?? selected.status}</Badge></div>
                <p className="text-sm text-muted-foreground">Variáveis: {selected.required_variables?.join(", ") || "nenhuma"}</p>
                {selected.source_url && <a className="text-sm text-primary underline" href={selected.source_url} target="_blank" rel="noreferrer">Abrir fonte</a>}
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{selected.source_html?.slice(0, 6000) || "Sem HTML de origem."}</pre>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving || selected.status === "approved"} onClick={() => void review("approved")}>Aprovar</Button>
                  <Button variant="outline" disabled={saving || selected.status === "archived"} onClick={() => void review("archived")}>Arquivar</Button>
                  <Button variant="ghost" disabled={saving || selected.status === "draft"} onClick={() => void review("draft")}>Voltar para rascunho</Button>
                </div>
                <p className="text-xs text-muted-foreground">A autorização final é validada no RPC do Supabase conforme o papel do usuário.</p>
              </div> : <p className="text-sm text-muted-foreground">Escolha um modelo à esquerda para revisar.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
