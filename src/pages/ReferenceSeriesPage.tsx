import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, BookOpen, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ReferenceSeries {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  difficulty_level: string;
  exercises: any;
  duration_weeks: number | null;
  created_at: string;
}

export default function ReferenceSeriesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [series, setSeries] = useState<ReferenceSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSeries, setNewSeries] = useState({ name: '', difficulty_level: 'beginner', duration_weeks: '' });

  useEffect(() => { fetchSeries(); }, []);

  const fetchSeries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reference_series')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSeries(data);
    if (error) console.error('Error:', error);
    setLoading(false);
  };

  const handleCreateSeries = async () => {
    if (!newSeries.name) { toast.error('Preencha o nome da série'); return; }
    const { error } = await supabase.from('reference_series').insert({
      name: newSeries.name,
      difficulty_level: newSeries.difficulty_level as any,
      duration_weeks: parseInt(newSeries.duration_weeks) || null,
      created_by: user?.id,
    });
    if (error) { toast.error('Erro ao criar: ' + error.message); return; }
    toast.success('Série de referência criada!');
    setIsDialogOpen(false);
    setNewSeries({ name: '', difficulty_level: 'beginner', duration_weeks: '' });
    fetchSeries();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('reference_series').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Série excluída');
    fetchSeries();
  };

  const filteredSeries = series.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyLabel = (d: string) => {
    if (d === 'beginner') return 'Básico';
    if (d === 'intermediate') return 'Intermediário';
    if (d === 'advanced') return 'Avançado';
    return d;
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'beginner') return 'bg-green-100 text-green-800';
    if (d === 'intermediate') return 'bg-orange-100 text-orange-800';
    if (d === 'advanced') return 'bg-red-100 text-red-800';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Séries de referência</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />Nova série de referência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Série de Referência</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Série</Label>
                <Input value={newSeries.name} onChange={(e) => setNewSeries({...newSeries, name: e.target.value})}
                  placeholder="Ex: Treino Completo de Pernas" />
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={newSeries.difficulty_level} onValueChange={(v) => setNewSeries({...newSeries, difficulty_level: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Básico</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (semanas)</Label>
                <Input type="number" value={newSeries.duration_weeks}
                  onChange={(e) => setNewSeries({...newSeries, duration_weeks: e.target.value})} placeholder="Ex: 8" />
              </div>
              <Button onClick={handleCreateSeries} className="w-full">Criar Série de Referência</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800">
              A série de referência pode ser utilizada na montagem de um treino para seu aluno.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : filteredSeries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSeries.map(s => (
            <Card key={s.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    {s.duration_weeks && (
                      <p className="text-sm text-muted-foreground mt-1">{s.duration_weeks} semanas</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(s.difficulty_level)}>
                      {getDifficultyLabel(s.difficulty_level)}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma série encontrada</h3>
              <p className="text-muted-foreground">Tente ajustar a pesquisa ou crie uma nova série de referência.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
