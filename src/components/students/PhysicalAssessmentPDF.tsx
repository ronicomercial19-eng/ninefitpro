import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Eye, 
  Download,
  X,
  Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Assessment {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  description?: string;
}

interface PhysicalAssessmentPDFProps {
  studentId: string;
}

export function PhysicalAssessmentPDF({ studentId }: PhysicalAssessmentPDFProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [viewingTitle, setViewingTitle] = useState('');

  useEffect(() => {
    fetchAssessments();
  }, [studentId]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('student_pdf_assessments' as any)
        .select('*')
        .eq('student_id', studentId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setAssessments((data as unknown as Assessment[]) || []);
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Por favor, selecione um arquivo PDF');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('O arquivo deve ter no máximo 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo PDF');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${studentId}/${Date.now()}_${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assessments')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assessments')
        .getPublicUrl(fileName);

      // Save to database
      const { data, error } = await supabase
        .from('student_pdf_assessments' as any)
        .insert({
          student_id: studentId,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          description: description || null,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setAssessments([(data as unknown as Assessment), ...assessments]);
      setSelectedFile(null);
      setDescription('');
      toast.success('Avaliação física enviada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao enviar avaliação:', error);
      toast.error(error.message || 'Erro ao enviar avaliação');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (assessment: Assessment) => {
    if (!confirm('Deseja realmente excluir esta avaliação?')) return;

    try {
      // Delete from storage
      const filePath = assessment.file_url.split('/assessments/')[1];
      if (filePath) {
        await supabase.storage.from('assessments').remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('student_pdf_assessments' as any)
        .delete()
        .eq('id', assessment.id);

      if (error) throw error;

      setAssessments(assessments.filter(a => a.id !== assessment.id));
      toast.success('Avaliação excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      toast.error('Erro ao excluir avaliação');
    }
  };

  const handleView = (assessment: Assessment) => {
    setViewingPdf(assessment.file_url);
    setViewingTitle(assessment.file_name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando avaliações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Avaliação Física (PDF)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Arquivo PDF</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {selectedFile && (
                <p className="text-sm text-green-600">
                  ✓ {selectedFile.name}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Avaliação inicial, Reavaliação 3 meses..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploading}
            className="bg-neon-400 hover:bg-neon-400/90 text-black"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Enviar Avaliação
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* List of Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Avaliações Físicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma avaliação física enviada ainda</p>
              <p className="text-sm">Faça upload de um PDF para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">{assessment.file_name}</p>
                      {assessment.description && (
                        <p className="text-sm text-gray-500">{assessment.description}</p>
                      )}
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(assessment.uploaded_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(assessment)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(assessment.file_url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(assessment)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!viewingPdf} onOpenChange={() => setViewingPdf(null)}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {viewingTitle}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingPdf(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full min-h-0">
            {viewingPdf && (
              <iframe
                src={viewingPdf}
                className="w-full h-[calc(90vh-100px)] rounded-lg border"
                title="PDF Viewer"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
