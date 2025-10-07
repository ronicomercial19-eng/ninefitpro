import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Search, Grid, List } from 'lucide-react';
import { AddExerciseForm } from '@/components/exercises/AddExerciseForm';

export default function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showAddForm, setShowAddForm] = useState(false);

  const exercises = [
    {
      id: 1,
      name: 'Remada Sentado com Triângulo',
      type: 'Força',
      muscle: 'Dorsal',
      equipment: 'Equipamentos',
      thumbnail: '/lovable-uploads/1b2f13a6-2280-47a3-ad8d-79c6dbb74994.png',
      hasVideo: true
    },
    {
      id: 2,
      name: '1 perna S.L.D.L + elevação do joelho',
      type: 'Força',
      muscle: 'Core, Pernas da seguir, Glúteos, Isquiotibiais, Quadriceps',
      equipment: 'Barra, Haltere',
      thumbnail: '/lovable-uploads/4849dd0e-4880-4fa7-b874-b549ee92d6d6.png',
      hasVideo: true
    },
    {
      id: 3,
      name: '1/2 Agachamento Smith',
      type: 'Hipertrofia',
      muscle: 'Core, Glúteos',
      equipment: 'Smith',
      thumbnail: '/lovable-uploads/50c7d2be-e22b-4cac-b456-e0a80c7180f6.png',
      hasVideo: true
    },
    {
      id: 4,
      name: '3 Pos. Agachamento com Faixa Facial',
      type: 'Hipertrofia',
      muscle: 'Core, Deltoides, Glúteos, Isquiotibiais, Quadriceps, Rhom.',
      equipment: 'Barco, Corpo',
      thumbnail: '/lovable-uploads/84d10bda-c9d1-45f2-bea0-11a422b00b03.png',
      hasVideo: true
    },
    {
      id: 5,
      name: '4 APOIOS EXTENSÃO DE QUADRIL MMI',
      type: 'Fortalecimento',
      muscle: 'Core, Glúteos',
      equipment: 'Corpo',
      thumbnail: '/lovable-uploads/9457d547-5873-496e-9a50-e6af7215946a.png',
      hasVideo: true
    },
    {
      id: 6,
      name: 'Abdominais Oblíquas no Banco Declinado',
      type: 'Fortalecimento',
      muscle: 'Abdômen',
      equipment: 'Banco Declinado',
      thumbnail: '/lovable-uploads/98b1ae85-067d-447c-bfaf-aedc3a6dc8de.png',
      hasVideo: true
    },
    {
      id: 7,
      name: 'Abdominal Canivete Alternado',
      type: 'Funcional',
      muscle: 'Abdômen',
      equipment: 'Corpo',
      thumbnail: '/lovable-uploads/a5ebd2c5-5df1-46c3-a547-93316a2d1fe5.png',
      hasVideo: true
    },
    {
      id: 8,
      name: 'Abdominais Crunch',
      type: 'Fortalecimento',
      muscle: 'Abdômen',
      equipment: 'Colchonete, Corpo',
      thumbnail: '/lovable-uploads/ae95e72e-72b0-4ac4-9e34-698d640ecfe4.png',
      hasVideo: true
    }
  ];

  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || exercise.type === categoryFilter;
    const matchesEquipment = equipmentFilter === 'all' || exercise.equipment.includes(equipmentFilter);
    const matchesMuscle = muscleFilter === 'all' || exercise.muscle.includes(muscleFilter);
    const matchesType = typeFilter === 'all' || exercise.type === typeFilter;

    return matchesSearch && matchesCategory && matchesEquipment && matchesMuscle && matchesType;
  });

  if (showAddForm) {
    return (
      <AddExerciseForm
        onSuccess={() => {
          setShowAddForm(false);
          // Refresh exercises list
        }}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Exercícios</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="bg-orange-500 text-white border-orange-500 hover:bg-orange-600">
            Exercícios para casa
          </Button>
          <Button className="btn-9fit">
            <Grid className="w-4 h-4 mr-2" />
            Biblioteca 9FIT
          </Button>
          <Button 
            className="bg-green-500 hover:bg-green-600"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo exercício
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="Força">Força</SelectItem>
                <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                <SelectItem value="Fortalecimento">Fortalecimento</SelectItem>
                <SelectItem value="Funcional">Funcional</SelectItem>
              </SelectContent>
            </Select>

            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Equipamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os equipamentos</SelectItem>
                <SelectItem value="Barra">Barra</SelectItem>
                <SelectItem value="Haltere">Haltere</SelectItem>
                <SelectItem value="Corpo">Corpo</SelectItem>
                <SelectItem value="Smith">Smith</SelectItem>
              </SelectContent>
            </Select>

            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Músculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os músculos</SelectItem>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Glúteos">Glúteos</SelectItem>
                <SelectItem value="Abdômen">Abdômen</SelectItem>
                <SelectItem value="Dorsal">Dorsal</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Força">Força</SelectItem>
                <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                <SelectItem value="Fortalecimento">Fortalecimento</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="bg-orange-500 text-white px-3 py-1 rounded text-sm inline-block">
            PARA FAZER EM CASA
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center border rounded-lg">
          <Button 
            variant={viewMode === 'grid' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img 
                src={exercise.thumbnail} 
                alt={exercise.name}
                className="w-full h-48 object-cover"
              />
              {exercise.hasVideo && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-gray-800 ml-1" />
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2">{exercise.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Tipo:</span>
                  <Badge variant="secondary" className="text-xs">{exercise.type}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p><span className="font-medium">Músculo:</span> {exercise.muscle}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p><span className="font-medium">Equipamento:</span> {exercise.equipment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum exercício encontrado</h3>
              <p className="text-muted-foreground">Tente ajustar os filtros ou adicione um novo exercício.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}