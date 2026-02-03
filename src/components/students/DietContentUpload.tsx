import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { 
  AlertCircle, 
  Code2, 
  Eye, 
  FileText, 
  Globe, 
  Loader2, 
  Upload, 
  X 
} from "lucide-react";
import { useCallback, useState } from 'react';
import { toast } from "sonner";

interface DietContentUploadProps {
  studentId: string;
  studentName: string;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

type ContentType = 'link' | 'html_code' | 'html_file';

export function DietContentUpload({ 
  studentId, 
  studentName, 
  onUploadSuccess, 
  onCancel 
}: DietContentUploadProps) {
  const [contentType, setContentType] = useState<ContentType>('link');
  
  // Common fields
  const [dietName, setDietName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Link specific
  const [externalLink, setExternalLink] = useState('');
  
  // HTML Code specific
  const [htmlCode, setHtmlCode] = useState('');
  
  // File upload specific
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.html') && !file.name.toLowerCase().endsWith('.htm')) {
      return 'Apenas arquivos .html ou .htm são permitidos';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'O arquivo deve ter no máximo 10MB';
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
      setFileContent(content);
      
      if (!dietName) {
        const nameFromFile = selectedFile.name.replace(/\.(html|htm)$/i, '').replace(/[-_]/g, ' ');
        setDietName(nameFromFile);
      }
    } catch (err) {
      setError('Erro ao ler o arquivo');
    }
  }, [dietName]);

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

  const getPreviewContent = (): string => {
    switch (contentType) {
      case 'link':
        return externalLink;
      case 'html_code':
        return htmlCode;
      case 'html_file':
        return fileContent;
      default:
        return '';
    }
  };

  const handleSubmit = async () => {
    if (!dietName.trim()) {
      toast.error('Preencha o nome da dieta');
      return;
    }

    // Validate based on content type
    if (contentType === 'link' && !externalLink.trim()) {
      toast.error('Cole o link da dieta');
      return;
    }
    if (contentType === 'link' && !validateUrl(externalLink.trim())) {
      toast.error('URL inválida. Use um link completo (ex: https://...)');
      return;
    }
    if (contentType === 'html_code' && !htmlCode.trim()) {
      toast.error('Cole o código HTML da dieta');
      return;
    }
    if (contentType === 'html_file' && !file) {
      toast.error('Selecione um arquivo HTML');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let htmlUrl = '';
      let htmlPath = '';
      let dietType = '';
      let dietData: any = {};

      if (contentType === 'link') {
        // Store link directly
        dietType = 'link';
        htmlUrl = externalLink.trim();
        dietData = { 
          source: 'external_link', 
          original_url: externalLink.trim() 
        };
      } else if (contentType === 'html_code') {
        // Upload HTML code as file to storage
        dietType = 'html';
        const timestamp = Date.now();
        const fileName = `${sanitizeFileName(dietName)}_${timestamp}.html`;
        const filePath = `${studentId}/${fileName}`;
        
        // Create blob from HTML code
        const htmlBlob = new Blob([htmlCode], { type: 'text/html' });
        
        const { error: uploadError } = await supabase.storage
          .from('diet-html-files')
          .upload(filePath, htmlBlob, {
            contentType: 'text/html',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('diet-html-files')
          .getPublicUrl(filePath);

        htmlUrl = urlData?.publicUrl || '';
        htmlPath = filePath;
        dietData = { 
          source: 'html_code_paste', 
          content_size: htmlCode.length 
        };
      } else if (contentType === 'html_file' && file) {
        // Upload file to storage
        dietType = 'html';
        const timestamp = Date.now();
        const sanitizedName = sanitizeFileName(file.name);
        const filePath = `${studentId}/${timestamp}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('diet-html-files')
          .upload(filePath, file, {
            contentType: 'text/html',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('diet-html-files')
          .getPublicUrl(filePath);

        htmlUrl = urlData?.publicUrl || '';
        htmlPath = filePath;
        dietData = { 
          source: 'html_file_upload', 
          original_filename: file.name 
        };
      }

      // Create record in database
      const { error: dbError } = await supabase
        .from('student_diet_assignments')
        .insert([{
          student_id: studentId,
          created_by: user.id,
          diet_name: dietName.trim(),
          diet_data: dietData,
          start_date: startDate,
          end_date: endDate || null,
          is_active: isActive,
          diet_file_path: htmlPath || null,
          diet_file_url: htmlUrl,
          diet_type: dietType,
          diet_description: description.trim() || null
        }]);

      if (dbError) {
        // Rollback: delete uploaded file if exists
        if (htmlPath) {
          await supabase.storage.from('diet-html-files').remove([htmlPath]);
        }
        throw new Error(`Erro ao salvar: ${dbError.message}`);
      }

      const typeLabels = {
        'link': 'Link',
        'html_code': 'Código HTML',
        'html_file': 'Arquivo HTML'
      };
      
      toast.success(`Dieta "${dietName}" (${typeLabels[contentType]}) enviada para ${studentName}!`);
      onUploadSuccess();
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao enviar dieta');
      toast.error(err.message || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileContent('');
    setError(null);
  };

  const canSubmit = () => {
    if (!dietName.trim()) return false;
    switch (contentType) {
      case 'link':
        return externalLink.trim() && validateUrl(externalLink.trim());
      case 'html_code':
        return htmlCode.trim().length > 0;
      case 'html_file':
        return !!file;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Atribuir Dieta</h2>
        <p className="text-sm text-muted-foreground">
          Envie um plano alimentar para <strong>{studentName}</strong>
        </p>
      </div>

      {/* Content Type Tabs */}
      <Tabs value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="link" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Link</span>
          </TabsTrigger>
          <TabsTrigger value="html_code" className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            <span className="hidden sm:inline">Código HTML</span>
          </TabsTrigger>
          <TabsTrigger value="html_file" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
        </TabsList>

        {/* Link Tab */}
        <TabsContent value="link" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="externalLink">Link da Dieta *</Label>
            <div className="flex gap-2">
              <Input
                id="externalLink"
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://docs.google.com/..."
                className="flex-1"
              />
              {externalLink && validateUrl(externalLink) && (
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowPreview(true)}
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Cole um link público (Google Docs, Sheets, ou qualquer URL acessível)
            </p>
          </div>
        </TabsContent>

        {/* HTML Code Tab */}
        <TabsContent value="html_code" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="htmlCode">Código HTML *</Label>
              {htmlCode && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              )}
            </div>
            <Textarea
              id="htmlCode"
              value={htmlCode}
              onChange={(e) => setHtmlCode(e.target.value)}
              placeholder="Cole o código HTML aqui..."
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Cole o código HTML completo da dieta (incluindo &lt;html&gt;, &lt;head&gt;, &lt;body&gt;)
            </p>
          </div>
        </TabsContent>

        {/* File Upload Tab */}
        <TabsContent value="html_file" className="space-y-4 mt-4">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${file ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700' : ''}
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
                  <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
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
                  ou clique para selecionar (máx. 10MB)
                </p>
                <Input
                  type="file"
                  accept=".html,.htm"
                  onChange={handleInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Common Form Fields */}
      <div className="space-y-4 border-t pt-4">
        <div className="space-y-2">
          <Label htmlFor="dietName">Nome da Dieta *</Label>
          <Input
            id="dietName"
            value={dietName}
            onChange={(e) => setDietName(e.target.value)}
            placeholder="Ex: Plano Alimentar - Semana 1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instruções ou observações para o aluno..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início *</Label>
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
              min={startDate}
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="isActive" className="text-sm font-medium">Ativar Dieta</Label>
            <p className="text-xs text-muted-foreground">
              Dietas ativas ficam visíveis para o aluno
            </p>
          </div>
          <Switch
            id="isActive"
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
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={!canSubmit() || uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            'Enviar Dieta'
          )}
        </Button>
      </div>

      {/* Preview Dialog */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Preview da Dieta</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {contentType === 'link' ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Este é um link externo. Clique abaixo para visualizar:
                  </p>
                  <a 
                    href={externalLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {externalLink}
                  </a>
                </div>
              ) : (
                <iframe
                  srcDoc={getPreviewContent()}
                  className="w-full h-[60vh] border rounded"
                  sandbox="allow-same-origin"
                  title="Preview da Dieta"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
