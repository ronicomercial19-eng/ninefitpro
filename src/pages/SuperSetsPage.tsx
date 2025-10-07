import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperSetsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSuperSet, setNewSuperSet] = useState({
    name: '',
    difficulty: 'Básico',
    exercises: ''
  });

  const handleCreateSuperSet = () => {
    if (!newSuperSet.name) {
      toast.error('Por favor, preencha o nome da super série');
      return;
    }
    toast.success('Super série criada com sucesso!');
    setIsDialogOpen(false);
    setNewSuperSet({ name: '', difficulty: 'Básico', exercises: '' });
  };

  const superSets: any[] = [];

  const filteredSuperSets = superSets.filter(superSet =>
    superSet.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Super séries</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova super série
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Super Série</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Super Série</Label>
                <Input
                  id="name"
                  value={newSuperSet.name}
                  onChange={(e) => setNewSuperSet({...newSuperSet, name: e.target.value})}
                  placeholder="Ex: Bi-set Peito e Costas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Dificuldade</Label>
                <Select
                  value={newSuperSet.difficulty}
                  onValueChange={(value) => setNewSuperSet({...newSuperSet, difficulty: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Básico">Básico</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercises">Número de Exercícios</Label>
                <Input
                  id="exercises"
                  type="number"
                  value={newSuperSet.exercises}
                  onChange={(e) => setNewSuperSet({...newSuperSet, exercises: e.target.value})}
                  placeholder="Ex: 2"
                />
              </div>
              <Button onClick={handleCreateSuperSet} className="w-full">
                Criar Super Série
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Super Sets Grid */}
      {filteredSuperSets.length === 0 && (
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