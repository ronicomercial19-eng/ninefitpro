import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferenceSeriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSeries, setNewSeries] = useState({
    name: '',
    difficulty: 'Básico',
    exercises: ''
  });

  const handleCreateSeries = () => {
    if (!newSeries.name) {
      toast.error('Por favor, preencha o nome da série');
      return;
    }
    toast.success('Série de referência criada com sucesso!');
    setIsDialogOpen(false);
    setNewSeries({ name: '', difficulty: 'Básico', exercises: '' });
  };

  const referenceSeries: any[] = [];

  const filteredSeries = referenceSeries.filter(series =>
    series.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Básico':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediário':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Avançado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Séries de referência</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-500 hover:bg-green-600">
              <Plus className="w-4 h-4 mr-2" />
              Nova série de referência
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Série de Referência</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Série</Label>
                <Input
                  id="name"
                  value={newSeries.name}
                  onChange={(e) => setNewSeries({...newSeries, name: e.target.value})}
                  placeholder="Ex: Treino Completo de Pernas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Dificuldade</Label>
                <Select
                  value={newSeries.difficulty}
                  onValueChange={(value) => setNewSeries({...newSeries, difficulty: value})}
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
                  value={newSeries.exercises}
                  onChange={(e) => setNewSeries({...newSeries, exercises: e.target.value})}
                  placeholder="Ex: 8"
                />
              </div>
              <Button onClick={handleCreateSeries} className="w-full">
                Criar Série de Referência
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
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-blue-800">
              A série de referência pode ser utilizada na montagem de um treino para seu aluno.
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

      {/* Reference Series Grid */}
      {filteredSeries.length === 0 && (
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