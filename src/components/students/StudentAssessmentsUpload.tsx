import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Trash2, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  studentId: string;
  userId?: string;
}

interface Assessment {
  id: string;
  file_url: string;
  file_type: string;
  category?: string;
  notes?: string;
  assessment_date: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "bioimpedancia", label: "Bioimpedância" },
  { value: "dexa", label: "DEXA" },
  { value: "exame_sangue", label: "Exame de Sangue" },
  { value: "outros", label: "Outros" },
];

export function StudentAssessmentsUpload({ studentId, userId }: Props) {
  const [items, setItems] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("bioimpedancia");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [studentId]);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("user_assessments")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Selecione um arquivo");
    setSaving(true);
    try {
      const path = `${studentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("assessments").upload(path, file);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assessments").getPublicUrl(path);

      const { error } = await (supabase as any).from("user_assessments").insert({
        student_id: studentId,
        user_id: userId,
        file_url: urlData.publicUrl,
        file_type: file.type,
        category,
        notes,
        assessment_date: date,
      });
      if (error) throw error;
      toast.success("Avaliação anexada!");
      setFile(null);
      setNotes("");
      fetchItems();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir?")) return;
    const { error } = await (supabase as any).from("user_assessments").delete().eq("id", id);
    if (error) return toast.error("Erro");
    toast.success("Excluído");
    fetchItems();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5" />
          Documentos / Avaliações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Categoria</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background border border-input rounded-md px-2 py-1.5 text-sm">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Arquivo (PDF / imagem)</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div>
            <Label className="text-xs">Notas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <Button onClick={handleUpload} disabled={saving || !file} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Anexar Avaliação
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma avaliação anexada.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 p-2 border rounded-md">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{it.category || "Avaliação"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(it.assessment_date).toLocaleDateString("pt-BR")}
                    {it.notes && ` • ${it.notes.slice(0, 50)}`}
                  </p>
                </div>
                <a href={it.file_url} target="_blank" rel="noopener" className="p-1.5 hover:bg-muted rounded">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => handleDelete(it.id)} className="p-1.5 hover:bg-destructive/10 rounded">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
