
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  description?: string;
  target_muscles: string[];
  phase?: string;
  goal?: string;
  equipment?: string;
  difficulty_level?: string;
  is_optional?: boolean;
  video_url?: string;
  instructions?: string;
}

export const ExerciseDatabase = () => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(false);

  const [newExercise, setNewExercise] = useState({
    name: "",
    description: "",
    target_muscles: [] as string[],
    phase: "",
    goal: "",
    equipment: "",
    difficulty_level: "",
    video_url: "",
    instructions: ""
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchTerm, phaseFilter, goalFilter]);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios:', error);
      toast.error('Erro ao carregar exercícios');
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    if (searchTerm) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.target_muscles.some(muscle => 
          muscle.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (phaseFilter !== "all") {
      filtered = filtered.filter(exercise => exercise.phase === phaseFilter);
    }

    if (goalFilter !== "all") {
      filtered = filtered.filter(exercise => exercise.goal === goalFilter);
    }

    setFilteredExercises(filtered);
  };

  const handleSaveExercise = async () => {
    if (!newExercise.name.trim()) {
      toast.error('Nome do exercício é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const exerciseData = {
        name: newExercise.name,
        description: newExercise.description || null,
        target_muscles: newExercise.target_muscles,
        phase: newExercise.phase || null,
        goal: newExercise.goal || null,
        equipment: newExercise.equipment || null,
        difficulty_level: newExercise.difficulty_level || null,
        video_url: newExercise.video_url || null,
        instructions: newExercise.instructions || null
      };

      if (editingExercise) {
        const { error } = await supabase
          .from('exercises')
          .update(exerciseData)
          .eq('id', editingExercise.id);

        if (error) throw error;
        toast.success('Exercício atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert([exerciseData]);

        if (error) throw error;
        toast.success('Exercício adicionado com sucesso!');
      }

      setNewExercise({
        name: "",
        description: "",
        target_muscles: [],
        phase: "",
        goal: "",
        equipment: "",
        difficulty_level: "",
        video_url: "",
        instructions: ""
      });
      setShowAddForm(false);
      setEditingExercise(null);
      fetchExercises();
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      toast.error('Erro ao salvar exercício');
    } finally {
      setLoading(false);
    }
  };

  const handleEditExercise = (exercise: Exercise) => {
    setNewExercise({
      name: exercise.name,
      description: exercise.description || "",
      target_muscles: exercise.target_muscles,
      phase: exercise.phase || "",
      goal: exercise.goal || "",
      equipment: exercise.equipment || "",
      difficulty_level: exercise.difficulty_level || "",
      video_url: exercise.video_url || "",
      instructions: exercise.instructions || ""
    });
    setEditingExercise(exercise);
    setShowAddForm(true);
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return;

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Exercício excluído com sucesso!');
      fetchExercises();
    } catch (error) {
      console.error('Erro ao excluir exercício:', error);
      toast.error('Erro ao excluir exercício');
    }
  };

  const handleTargetMuscleChange = (muscle: string) => {
    setNewExercise(prev => ({
      ...prev,
      target_muscles: prev.target_muscles.includes(muscle)
        ? prev.target_muscles.filter(m => m !== muscle)
        : [...prev.target_muscles, muscle]
    }));
  };

  const muscleOptions = [
    'peitoral', 'deltoides', 'tríceps', 'bíceps', 'latíssimo', 'romboides', 
    'trapézio', 'quadríceps', 'glúteos', 'isquiotibiais', 'panturrilha', 
    'core', 'erectores'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Biblioteca de Exercícios</h2>
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Exercício
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou músculo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label>Fase</Label>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fases</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="intensification">Intensificação</SelectItem>
                  <SelectItem value="peaking">Pico</SelectItem>
                  <SelectItem value="recovery">Recuperação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Objetivo</Label>
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos objetivos</SelectItem>
                  <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                  <SelectItem value="strength">Força</SelectItem>
                  <SelectItem value="power">Potência</SelectItem>
                  <SelectItem value="endurance">Resistência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Exercícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{exercise.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditExercise(exercise)}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteExercise(exercise.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {exercise.description && (
                <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {exercise.target_muscles.map((muscle, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  {exercise.phase && <span>Fase: {exercise.phase}</span>}
                  {exercise.goal && <span>Objetivo: {exercise.goal}</span>}
                </div>
                
                {exercise.equipment && (
                  <div className="text-xs text-gray-500">
                    Equipamento: {exercise.equipment}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Formulário de Adicionar/Editar */}
      {showAddForm && (
        <Card className="border-2 border-orange-200">
          <CardHeader>
            <CardTitle>
              {editingExercise ? 'Editar Exercício' : 'Novo Exercício'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({...newExercise, name: e.target.value})}
                  placeholder="Nome do exercício"
                />
              </div>

              <div>
                <Label htmlFor="equipment">Equipamento</Label>
                <Input
                  id="equipment"
                  value={newExercise.equipment}
                  onChange={(e) => setNewExercise({...newExercise, equipment: e.target.value})}
                  placeholder="Ex: barra, halteres"
                />
              </div>

              <div>
                <Label>Fase</Label>
                <Select value={newExercise.phase} onValueChange={(value) => setNewExercise({...newExercise, phase: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="intensification">Intensificação</SelectItem>
                    <SelectItem value="peaking">Pico</SelectItem>
                    <SelectItem value="recovery">Recuperação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Objetivo</Label>
                <Select value={newExercise.goal} onValueChange={(value) => setNewExercise({...newExercise, goal: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                    <SelectItem value="strength">Força</SelectItem>
                    <SelectItem value="power">Potência</SelectItem>
                    <SelectItem value="endurance">Resistência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nível de Dificuldade</Label>
                <Select value={newExercise.difficulty_level} onValueChange={(value) => setNewExercise({...newExercise, difficulty_level: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="video_url">URL do Vídeo</Label>
                <Input
                  id="video_url"
                  value={newExercise.video_url}
                  onChange={(e) => setNewExercise({...newExercise, video_url: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={newExercise.description}
                onChange={(e) => setNewExercise({...newExercise, description: e.target.value})}
                placeholder="Descrição do exercício"
              />
            </div>

            <div>
              <Label>Músculos Alvo</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {muscleOptions.map((muscle) => (
                  <label key={muscle} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExercise.target_muscles.includes(muscle)}
                      onChange={() => handleTargetMuscleChange(muscle)}
                      className="rounded"
                    />
                    <span className="text-sm">{muscle}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="instructions">Instruções</Label>
              <textarea
                id="instructions"
                value={newExercise.instructions}
                onChange={(e) => setNewExercise({...newExercise, instructions: e.target.value})}
                placeholder="Instruções detalhadas do exercício"
                className="w-full p-2 border rounded-md h-20 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveExercise}
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {loading ? 'Salvando...' : editingExercise ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingExercise(null);
                  setNewExercise({
                    name: "",
                    description: "",
                    target_muscles: [],
                    phase: "",
                    goal: "",
                    equipment: "",
                    difficulty_level: "",
                    video_url: "",
                    instructions: ""
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredExercises.length === 0 && !showAddForm && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">Nenhum exercício encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
