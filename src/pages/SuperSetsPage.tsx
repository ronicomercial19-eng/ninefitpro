import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Zap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface SuperSet {
  id: string;
  name: string;
  difficulty: string;
  exercise_count: number;
  exercises: any;
  created_at: string;
}

export default function SuperSetsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [superSets, setSuperSets] = useState<SuperSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSuperSet, setNewSuperSet] = useState({ name: '', difficulty: 'Básico', exercises: '' });

  useEffect(() => { fetchSuperSets(); }, []);

  const fetchSuperSets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('super_sets')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSuperSets(data);
    if (error) console.error('Error:', error);
    setLoading(false);
  };

  const handleCreateSuperSet = async () => {
    if (!newSuperSet.name) { toast.error('Preencha o nome da super série'); return; }
    const { error } = await supabase.from('super_sets').insert({
      name: newSuperSet.name,
      difficulty: newSuperSet.difficulty,
      exercise_count: parseInt(newSuperSet.exercises) || 0,
      created_by: user?.id,
    });
    if (error) { toast.error('Erro ao criar: ' + error.message); return; }
    toast.success('Super série criada!');
    setIsDialogOpen(false);
    setNewSuperSet({ name: '', difficulty: 'Básico', exercises: '' });
    fetchSuperSets();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('super_sets').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); return; }
    toast.success('Super série excluída');
    fetchSuperSets();
  };

  const filteredSuperSets = superSets.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (d: string) => {
    if (d === 'Básico') return 'bg-green-100 text-green-800';
    if (d === 'Intermediário') return 'bg-orange-100 text-orange-800';
    if (d === 'Avançado') return 'bg-red-100 text-red-800';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Super séries</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />Nova super série
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Nova Super Série</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={newSuperSet.name} onChange={(e) => setNewSuperSet({...newSuperSet, name: e.target.value})}
                  placeholder="Ex: Bi-set Peito e Costas" />
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={newSuperSet.difficulty} onValueChange={(v) => setNewSuperSet({...newSuperSet, difficulty: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Básico">Básico</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número de Exercícios</Label>
                <Input type="number" value={newSuperSet.exercises}
                  onChange={(e) => setNewSuperSet({...newSuperSet, exercises: e.target.value})} placeholder="Ex: 2" />
              </div>
              <Button onClick={handleCreateSuperSet} className="w-full">Criar Super Série</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800">
              A super série é um circuito com dois ou mais exercícios que pode ser utilizado na montagem de uma série para seu aluno.
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
      ) : filteredSuperSets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuperSets.map(ss => (
            <Card key={ss.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{ss.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{ss.exercise_count} exercícios</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(ss.difficulty)}>{ss.difficulty}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ss.id)}>
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
              <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma super série encontrada</h3>
              <p className="text-muted-foreground">Tente ajustar a pesquisa ou crie uma nova super série.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
