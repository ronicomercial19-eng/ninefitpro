import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, CheckCircle2, Eye, FileText, Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from 'react';
import { toast } from "sonner";

interface HTMLTrainingUploadProps {
  studentId: string;
  studentName: string;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export function HTMLTrainingUpload({ 
  studentId, 
  studentName, 
  onUploadSuccess, 
  onCancel 
}: HTMLTrainingUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [trainingName, setTrainingName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check extension
    if (!file.name.toLowerCase().endsWith('.html')) {
      return 'Apenas arquivos .html são permitidos';
    }
    
    // Check size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return 'O arquivo deve ter no máximo 5MB';
    }
    
    // Check MIME type
    if (file.type && file.type !== 'text/html') {
      return 'Tipo de arquivo inválido. Use arquivos HTML';
    }
    
    return null;
  };

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setError(null);
    
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const content = await selectedFile.text();
      setFile(selectedFile);
      setHtmlContent(content);
      
      // Auto-fill training name from filename if empty
      if (!trainingName) {
        const nameFromFile = selectedFile.name.replace('.html', '').replace(/-|_/g, ' ');
        setTrainingName(nameFromFile);
      }
    } catch (err) {
      setError('Erro ao ler o arquivo');
    }
  }, [trainingName]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const sanitizeFileName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleUpload = async () => {
    if (!file || !trainingName.trim()) {
      toast.error('Preencha o nome do treino e selecione um arquivo');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${studentId}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training-html-files')
        .upload(filePath, file, {
          contentType: 'text/html',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Get public URL (bucket is public now)
      const { data: urlData } = supabase.storage
        .from('training-html-files')
        .getPublicUrl(filePath);

      const htmlUrl = urlData?.publicUrl || '';

      // Create record in student_training_assignments
      const { error: dbError } = await supabase
        .from('student_training_assignments')
        .insert([{
          student_id: studentId,
          created_by: user.id,
          training_name: trainingName.trim(),
          training_data: { source: 'html_upload', original_filename: file.name },
          start_date: startDate,
          end_date: endDate || null,
          is_active: isActive,
          html_file_path: filePath,
          html_file_url: htmlUrl,
          training_type: 'html' as const,
          training_description: description.trim() || null
        }]);

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from('training-html-files').remove([filePath]);
        throw new Error(`Erro ao salvar: ${dbError.message}`);
      }

      toast.success(`Treino HTML "${trainingName}" enviado com sucesso para ${studentName}!`);
      onUploadSuccess();
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao fazer upload do treino');
      toast.error(err.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setHtmlContent('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Upload de Treino HTML</h2>
        <p className="text-sm text-muted-foreground">
          Envie um arquivo HTML personalizado para <strong>{studentName}</strong>
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${file ? 'bg-green-50 border-green-300' : ''}
          ${error ? 'bg-destructive/5 border-destructive' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-3 bg-background px-4 py-2 rounded-lg border">
              <FileText className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={removeFile}
                className="ml-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        ) : (
          <>
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-lg font-medium mb-2">
              {dragActive ? 'Solte o arquivo aqui' : 'Arraste seu arquivo HTML'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar
            </p>
            <Input
              type="file"
              accept=".html"
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trainingName">Nome do Treino *</Label>
          <Input
            id="trainingName"
            value={trainingName}
            onChange={(e) => setTrainingName(e.target.value)}
            placeholder="Ex: Treino de Força - Semana 1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instruções ou observações para o aluno..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Data de Fim (opcional)</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium text-sm">Ativar imediatamente</p>
            <p className="text-xs text-muted-foreground">
              O aluno terá acesso ao treino assim que for enviado
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={uploading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleUpload}
          disabled={!file || !trainingName.trim() || uploading}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Enviar Treino
            </>
          )}
        </Button>
      </div>

      {/* HTML Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview do Treino HTML</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh] border rounded-lg">
            <iframe
              srcDoc={htmlContent}
              sandbox="allow-same-origin"
              className="w-full h-[500px] border-0"
              title="HTML Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
