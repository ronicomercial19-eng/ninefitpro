import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Utensils, 
  Plus, 
  Eye, 
  Trash2, 
  Globe, 
  Code2, 
  FileText,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DietContentUpload } from "../DietContentUpload";

interface Student {
  id: string;
  nome: string;
}

interface DietAssignment {
  id: string;
  diet_name: string;
  diet_description: string | null;
  diet_type: string;
  diet_file_url: string | null;
  diet_file_path: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface StudentDietProps {
  student: Student;
}

export function StudentDiet({ student }: StudentDietProps) {
  const [diets, setDiets] = useState<DietAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDiet, setPreviewDiet] = useState<DietAssignment | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchDiets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_diet_assignments')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiets(data || []);
    } catch (error) {
      console.error('Error fetching diets:', error);
      toast.error('Erro ao carregar dietas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiets();
  }, [student.id]);

  const handleToggleActive = async (diet: DietAssignment) => {
    try {
      const { error } = await supabase
        .from('student_diet_assignments')
        .update({ is_active: !diet.is_active })
        .eq('id', diet.id);

      if (error) throw error;

      setDiets(prev => prev.map(d => 
        d.id === diet.id ? { ...d, is_active: !d.is_active } : d
      ));
      toast.success(diet.is_active ? 'Dieta desativada' : 'Dieta ativada');
    } catch (error) {
      console.error('Error toggling diet:', error);
      toast.error('Erro ao atualizar dieta');
    }
  };

  const handleDelete = async (diet: DietAssignment) => {
    if (!confirm(`Excluir "${diet.diet_name}"?`)) return;

    try {
      // Delete file from storage if exists
      if (diet.diet_file_path) {
        await supabase.storage.from('diet-html-files').remove([diet.diet_file_path]);
      }

      const { error } = await supabase
        .from('student_diet_assignments')
        .delete()
        .eq('id', diet.id);

      if (error) throw error;

      setDiets(prev => prev.filter(d => d.id !== diet.id));
      toast.success('Dieta excluída');
    } catch (error) {
      console.error('Error deleting diet:', error);
      toast.error('Erro ao excluir dieta');
    }
  };

  const handlePreview = async (diet: DietAssignment) => {
    setPreviewDiet(diet);
    
    if (diet.diet_type === 'link') {
      setPreviewContent('');
      return;
    }

    if (diet.diet_file_url) {
      setLoadingPreview(true);
      try {
        const response = await fetch(diet.diet_file_url);
        let content = await response.text();
        
        // Decode HTML entities if needed
        if (content.includes('&lt;') || content.includes('&gt;')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(`<!doctype html><body>${content}`, 'text/html');
          content = doc.body.textContent || '';
        }
        
        setPreviewContent(content);
      } catch (error) {
        console.error('Error fetching diet content:', error);
        toast.error('Erro ao carregar conteúdo');
      } finally {
        setLoadingPreview(false);
      }
    }
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
      'link': { icon: <Globe className="w-3 h-3" />, label: 'Link', color: 'bg-blue-100 text-blue-800' },
      'html': { icon: <Code2 className="w-3 h-3" />, label: 'HTML', color: 'bg-purple-100 text-purple-800' },
      'json': { icon: <FileText className="w-3 h-3" />, label: 'JSON', color: 'bg-green-100 text-green-800' }
    };
    const cfg = config[type] || config['html'];
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Stats
  const totalDiets = diets.length;
  const activeDiets = diets.filter(d => d.is_active).length;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalDiets}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{activeDiets}</p>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </div>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Atribuir Dieta
        </Button>
      </div>

      {/* Diet List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : diets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma dieta atribuída</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Atribuir Dieta" para enviar um plano alimentar
            </p>
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Atribuir Dieta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {diets.map((diet) => (
            <Card key={diet.id} className={!diet.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{diet.diet_name}</h3>
                      {getTypeBadge(diet.diet_type)}
                      <Badge variant={diet.is_active ? 'default' : 'secondary'}>
                        {diet.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    
                    {diet.diet_description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {diet.diet_description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Início: {formatDate(diet.start_date)}
                      </span>
                      {diet.end_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Fim: {formatDate(diet.end_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreview(diet)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleActive(diet)}
                    >
                      {diet.is_active ? (
                        <ToggleRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(diet)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DietContentUpload
            studentId={student.id}
            studentName={student.nome}
            onUploadSuccess={() => {
              setShowUploadModal(false);
              fetchDiets();
            }}
            onCancel={() => setShowUploadModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewDiet} onOpenChange={() => setPreviewDiet(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <h3 className="font-semibold">{previewDiet?.diet_name}</h3>
              <p className="text-sm text-muted-foreground">
                {previewDiet?.diet_type === 'link' ? 'Link externo' : 'Visualização do conteúdo'}
              </p>
            </div>
            {previewDiet?.diet_type === 'link' && previewDiet.diet_file_url && (
              <Button asChild variant="outline">
                <a 
                  href={previewDiet.diet_file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Link
                </a>
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto min-h-[400px]">
            {loadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : previewDiet?.diet_type === 'link' ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Globe className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Este é um link externo. Clique no botão acima para abrir.
                </p>
                <code className="text-sm bg-muted px-3 py-2 rounded break-all">
                  {previewDiet?.diet_file_url}
                </code>
              </div>
            ) : (
              <iframe
                srcDoc={previewContent}
                className="w-full h-full min-h-[400px] border rounded"
                sandbox="allow-same-origin"
                title="Preview da Dieta"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
