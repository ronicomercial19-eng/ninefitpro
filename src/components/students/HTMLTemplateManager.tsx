import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Eye, Edit, Copy, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from 'dompurify';

interface Template {
  id: string;
  training_name: string;
  html_file_url: string;
  html_file_path?: string;
  student_id: string;
  is_active: boolean;
  created_at: string;
}

interface Athlete {
  id: string;
  name: string;
}

interface HTMLTemplateManagerProps {
  studentId?: string;
}

export function HTMLTemplateManager({ studentId }: HTMLTemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'edit' | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Assign dialog
  const [showAssign, setShowAssign] = useState(false);
  const [assignAthleteId, setAssignAthleteId] = useState('');
  const [assignTemplate, setAssignTemplate] = useState<Template | null>(null);

  useEffect(() => { fetchData(); }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    const query = supabase.from('student_training_assignments')
      .select('id, training_name, html_file_url, html_file_path, student_id, is_active, created_at')
      .eq('training_type', 'html')
      .not('html_file_url', 'is', null)
      .order('created_at', { ascending: false });

    if (studentId) query.eq('student_id', studentId);

    const [templatesRes, athletesRes] = await Promise.all([
      query, supabase.from('athletes').select('id, name').order('name'),
    ]);

    if (templatesRes.data) setTemplates(templatesRes.data as Template[]);
    if (athletesRes.data) setAthletes(athletesRes.data);
    setLoading(false);
  };

  const handleView = async (template: Template) => {
    setSelectedTemplate(template);
    setViewMode('preview');
  };

  const handleEdit = async (template: Template) => {
    setSelectedTemplate(template);
    setViewMode('edit');
    try {
      const response = await fetch(template.html_file_url);
      const text = await response.text();
      setHtmlContent(text);
    } catch { toast.error('Erro ao carregar HTML'); }
  };

  const handleSaveEdit = async () => {
    if (!selectedTemplate?.html_file_path) { toast.error('Caminho do arquivo não encontrado'); return; }
    setSaving(true);
    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const { error } = await supabase.storage.from('training-html-files').update(selectedTemplate.html_file_path, blob, {
        contentType: 'text/html', upsert: true,
      });
      if (error) throw error;
      toast.success('Template atualizado!');
      setViewMode(null);
    } catch (e: any) { toast.error('Erro: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleAssign = async () => {
    if (!assignTemplate || !assignAthleteId) { toast.error('Selecione o aluno'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('student_training_assignments').insert({
        student_id: assignAthleteId,
        training_name: assignTemplate.training_name,
        training_type: 'html',
        html_file_url: assignTemplate.html_file_url,
        html_file_path: assignTemplate.html_file_path,
        training_data: { source: 'template_copy', original_id: assignTemplate.id },
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
      });
      if (error) throw error;
      toast.success('Template atribuído ao aluno!');
      setShowAssign(false);
      setAssignAthleteId('');
      fetchData();
    } catch (e: any) { toast.error('Erro: ' + e.message); }
    finally { setSaving(false); }
  };

  const getAthleteName = (id: string) => athletes.find(a => a.id === id)?.name || 'Aluno';

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5" />Templates HTML</h3>
        <p className="text-sm text-muted-foreground">{templates.length} template(s)</p>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="py-8 text-center"><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Nenhum template HTML encontrado</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.training_name}</p>
                  <p className="text-xs text-muted-foreground">{getAthleteName(t.student_id)} • {new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <Badge variant={t.is_active ? 'default' : 'secondary'}>{t.is_active ? 'Ativo' : 'Inativo'}</Badge>
                <Button size="sm" variant="outline" onClick={() => handleView(t)} title="Visualizar"><Eye className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleEdit(t)} title="Editar"><Edit className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => { setAssignTemplate(t); setShowAssign(true); }} title="Atribuir a outro aluno"><Copy className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={viewMode === 'preview' && !!selectedTemplate} onOpenChange={() => setViewMode(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader><DialogTitle>{selectedTemplate?.training_name}</DialogTitle></DialogHeader>
          <div className="overflow-auto max-h-[70vh] border rounded-lg bg-white">
            {selectedTemplate?.html_file_url && (
              <iframe src={selectedTemplate.html_file_url} sandbox="allow-scripts allow-same-origin" className="w-full h-[600px] border-0" title={selectedTemplate.training_name} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={viewMode === 'edit' && !!selectedTemplate} onOpenChange={() => setViewMode(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Editar: {selectedTemplate?.training_name}</DialogTitle></DialogHeader>
          <Textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} rows={20} className="font-mono text-xs" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMode(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atribuir Template a Aluno</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Template: <strong>{assignTemplate?.training_name}</strong></p>
            <div className="space-y-2">
              <Label>Selecione o Aluno</Label>
              <Select value={assignAthleteId} onValueChange={setAssignAthleteId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{athletes.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={saving}>
              {saving ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
