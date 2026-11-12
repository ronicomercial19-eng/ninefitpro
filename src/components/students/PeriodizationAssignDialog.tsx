import { localDate } from "@/lib/assignedProtocols";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Code2, BookOpen, Loader2 } from "lucide-react";
import { mirrorEvent } from "@/services/intelligenceHub.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PeriodizationPreviewDialog, {
  type PeriodizationModelPreview,
} from "./PeriodizationPreviewDialog";

interface Props {
  inline?: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  studentId: string;
  studentName: string;
  onSuccess: () => void;
}

export function PeriodizationAssignDialog({
  inline = false,
  open,
  onOpenChange,
  studentId,
  studentName,
  onSuccess,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // HTML
  const [htmlContent, setHtmlContent] = useState("");

  // Models
  const [models, setModels] = useState<PeriodizationModelPreview[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loadingModels, setLoadingModels] = useState(false);

  // Splash de visualização macro — mostrado ANTES de atribuir de verdade.
  const [previewModel, setPreviewModel] = useState<PeriodizationModelPreview | null>(null);
  const [confirmingAssign, setConfirmingAssign] = useState(false);

  useEffect(() => {
    if (open) {
      setLoadingModels(true);
      supabase
        .from("periodization_models")
        .select("id, title, goal, duration, description, recommended_for, macrocycle, detailed_mesocycles")
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
    start_date: localDate(),
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
      const { error: upErr } = await supabase.storage
        .from("plans-pdfs")
        .upload(path, pdfFile);
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("student_training_assignments")
        .insert(
          baseInsert({
            created_by: coachId,
            content_type: "pdf",
            periodization_file_url: path,
            training_data: { source: "periodization_pdf", file_path: path },
          }) as any,
        );
      if (error) throw error;
      toast.success("Periodização (PDF) atribuída!");
      mirrorEvent(
        "periodization_assigned",
        { athlete_id: studentId, content_type: "pdf" },
        studentId,
      );
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
      const { error } = await supabase
        .from("student_training_assignments")
        .insert(
          baseInsert({
            created_by: coachId,
            content_type: "html",
            periodization_html: htmlContent,
            training_data: { source: "periodization_html" },
          }) as any,
        );
      if (error) throw error;
      toast.success("Periodização (HTML) atribuída!");
      mirrorEvent(
        "periodization_assigned",
        { athlete_id: studentId, content_type: "html" },
        studentId,
      );
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Abre o splash de preview em vez de atribuir direto. A atribuição de
  // verdade só acontece em confirmModelAssign, depois do "De acordo".
  const handleModelAssign = () => {
    if (!selectedModel) return toast.error("Selecione um modelo");
    const model = models.find((m) => m.id === selectedModel);
    if (!model) return toast.error("Modelo não encontrado");
    setPreviewModel(model);
  };

  // Mantém o insert histórico em student_training_assignments (inalterado) E
  // agora também materializa de verdade em athlete_periodizations +
  // periodization_annual_plans via a mesma RPC já usada e testada no
  // SmartPeriodizer individual — fechando a conexão real de entrega.
  const confirmModelAssign = async (model: PeriodizationModelPreview) => {
    setConfirmingAssign(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const coachId = session.session?.user?.id || "";

      const { error: histError } = await supabase
        .from("student_training_assignments")
        .insert(
          baseInsert({
            created_by: coachId,
            training_name: name.trim() || model.title || "Periodização",
            content_type: "model",
            training_data: {
              source: "periodization_model",
              model_id: model.id,
              model_title: model.title,
              goal: model.goal,
              duration: model.duration,
            },
          }) as any,
        );
      if (histError) throw histError;

      const { error: rpcError } = await supabase.rpc(
        "fn_generate_plan_from_bank_model" as any,
        {
          p_athlete_id: studentId,
          p_model_id: model.id,
          p_coach_id: coachId || null,
        },
      );
      if (rpcError) {
        throw new Error(
          "A periodização foi registrada, mas não foi possível ativá-la de verdade para o aluno: " +
            rpcError.message,
        );
      }

      toast.success("Periodização atribuída e ativa para o aluno!");
      mirrorEvent(
        "periodization_assigned",
        {
          athlete_id: studentId,
          content_type: "model",
          model_id: model.id,
        },
        studentId,
      );
      reset();
      setPreviewModel(null);
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setConfirmingAssign(false);
    }
  };

  const form = (
    <>
        <div className="space-y-3 mb-4">
          <div>
            <Label>Nome da Periodização *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Periodização Hipertrofia 12 sem."
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <Tabs defaultValue={inline ? "model" : "pdf"}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="pdf">
              <Upload className="w-4 h-4 mr-2" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="html">
              <Code2 className="w-4 h-4 mr-2" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="model">
              <BookOpen className="w-4 h-4 mr-2" />
              Modelo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdf" className="space-y-4 pt-4">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            {pdfFile && (
              <p className="text-xs text-muted-foreground">
                {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
            <Button
              onClick={handlePdfUpload}
              disabled={saving || !pdfFile}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
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
            <Button
              onClick={handleHtmlSave}
              disabled={saving || !htmlContent.trim()}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Code2 className="w-4 h-4 mr-2" />
              )}
              Salvar HTML e Atribuir
            </Button>
          </TabsContent>

          <TabsContent value="model" className="space-y-4 pt-4">
            {loadingModels ? (
              <p className="text-center text-muted-foreground py-4">
                Carregando modelos...
              </p>
            ) : models.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum modelo cadastrado.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full text-left p-3 border rounded-md transition-colors ${
                      selectedModel === m.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
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
            <Button
              onClick={handleModelAssign}
              disabled={saving || !selectedModel}
              className="w-full"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <BookOpen className="w-4 h-4 mr-2" />
              )}
              Ver periodização e atribuir
            </Button>
          </TabsContent>
        </Tabs>
    </>
  );
  return (
    <>
      {inline ? (
        <section className="rounded-xl border bg-card p-4">{form}</section>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
            <DialogHeader><DialogTitle>Atribuir periodização · {studentName}</DialogTitle></DialogHeader>
            {form}
          </DialogContent>
        </Dialog>
      )}
      <PeriodizationPreviewDialog
        model={previewModel}
        open={!!previewModel}
        onOpenChange={(o) => { if (!o) setPreviewModel(null); }}
        onConfirm={confirmModelAssign}
        confirming={confirmingAssign}
      />
    </>
  );
}
