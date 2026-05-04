import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Code2, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId: string;
  studentName: string;
  onSuccess: () => void;
}

interface PeriodizationModel {
  id: string;
  title: string;
  goal?: string;
  duration?: string;
}

export function PeriodizationAssignDialog({ open, onOpenChange, studentId, studentName, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // HTML
  const [htmlContent, setHtmlContent] = useState("");

  // Models
  const [models, setModels] = useState<PeriodizationModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingModels(true);
      supabase
        .from("periodization_models")
        .select("id, title, goal, duration")
        .limit(100)
        .then(({ data }) => {
          setModels((data as any) || []);
          setLoadingModels(false);
        });
    }
  }, [open]);

  const reset = () => {
    setName("");
    setDescription("");
    setPdfFile(null);
    setHtmlContent("");
    setSelectedModel("");
  };

  const baseInsert = (extra: any) => ({
    student_id: studentId,
    training_name: name.trim() || "Periodização",
    training_description: description.trim() || null,
    training_type: "periodization",
    start_date: new Date().toISOString().split("T")[0],
    is_active: true,
    ...extra,
  });

  const handlePdfUpload = async () => {
    if (!pdfFile) return toast.error("Selecione um arquivo PDF");
    if (!name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const coachId = session.session?.user?.id || "";
      const path = `${studentId}/${Date.now()}-${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("plans-pdfs").upload(path, pdfFile);
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("plans-pdfs").getPublicUrl(path);
      const { error } = await supabase.from("student_training_assignments").insert(
        baseInsert({
          created_by: coachId,
          content_type: "pdf",
          periodization_file_url: urlData.publicUrl,
          training_data: { source: "periodization_pdf", file_path: path },
        }) as any
      );
      if (error) throw error;
      toast.success("Periodização (PDF) atribuída!");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleHtmlSave = async () => {
    if (!htmlContent.trim()) return toast.error("Cole o HTML");
    if (!name.trim()) return toast.error("Informe o nome");
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const coachId = session.session?.user?.id || "";
      const { error } = await supabase.from("student_training_assignments").insert(
        baseInsert({
          created_by: coachId,
          content_type: "html",
          periodization_html: htmlContent,
          training_data: { source: "periodization_html" },
        }) as any
      );
      if (error) throw error;
      toast.success("Periodização (HTML) atribuída!");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleModelAssign = async () => {
    if (!selectedModel) return toast.error("Selecione um modelo");
    setSaving(true);
    try {
      const model = models.find((m) => m.id === selectedModel);
      const { data: session } = await supabase.auth.getSession();
      const coachId = session.session?.user?.id || "";
      const { error } = await supabase.from("student_training_assignments").insert(
        baseInsert({
          created_by: coachId,
          training_name: name.trim() || model?.title || "Periodização",
          content_type: "model",
          training_data: {
            source: "periodization_model",
            model_id: selectedModel,
            model_title: model?.title,
            goal: model?.goal,
            duration: model?.duration,
          },
        }) as any
      );
      if (error) throw error;
      toast.success("Periodização atribuída a partir de modelo!");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Periodização — {studentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mb-4">
          <div>
            <Label>Nome da Periodização *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Periodização Hipertrofia 12 sem." />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>

        <Tabs defaultValue="pdf">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pdf"><Upload className="w-4 h-4 mr-2" />PDF</TabsTrigger>
            <TabsTrigger value="html"><Code2 className="w-4 h-4 mr-2" />HTML</TabsTrigger>
            <TabsTrigger value="model"><BookOpen className="w-4 h-4 mr-2" />Modelo</TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="space-y-4 pt-4">
            <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            {pdfFile && <p className="text-xs text-muted-foreground">{pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)</p>}
            <Button onClick={handlePdfUpload} disabled={saving || !pdfFile} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Enviar PDF e Atribuir
            </Button>
          </TabsContent>

          <TabsContent value="html" className="space-y-4 pt-4">
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Cole o HTML da periodização aqui..."
              rows={10}
              className="font-mono text-xs"
            />
            <Button onClick={handleHtmlSave} disabled={saving || !htmlContent.trim()} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Code2 className="w-4 h-4 mr-2" />}
              Salvar HTML e Atribuir
            </Button>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 pt-4">
            {loadingModels ? (
              <p className="text-center text-muted-foreground py-4">Carregando modelos...</p>
            ) : models.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">Nenhum modelo cadastrado.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full text-left p-3 border rounded-md transition-colors ${
                      selectedModel === m.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                  >
                    <p className="font-medium text-sm">{m.title}</p>
                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                      {m.goal && <span>Objetivo: {m.goal}</span>}
                      {m.duration && <span>Duração: {m.duration}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <Button onClick={handleModelAssign} disabled={saving || !selectedModel} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BookOpen className="w-4 h-4 mr-2" />}
              Atribuir Modelo
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
