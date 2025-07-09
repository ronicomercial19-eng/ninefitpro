
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Search, Filter } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [filterGoal, setFilterGoal] = useState("all");
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    name: "",
    description: "",
    target_muscles: [],
    phase: "base",
    goal: "hypertrophy",
    equipment: "",
    difficulty_level: "beginner",
    is_optional: false,
    video_url: "",
    instructions: ""
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchTerm, filterPhase, filterGoal]);

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
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises;

    if (searchTerm) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ex.target_muscles.some(muscle => muscle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterPhase !== "all") {
      filtered = filtered.filter(ex => ex.phase === filterPhase);
    }

    if (filterGoal !== "all") {
      filtered = filtered.filter(ex => ex.goal === filterGoal);
    }

    setFilteredExercises(filtered);
  };

  const handleAddExercise = async () => {
    try {
      if (!newExercise.name || !newExercise.target_muscles?.length) {
        toast.error('Nome e músculos-alvo são obrigatórios');
        return;
      }

      const { data, error } = await supabase
        .from('exercises')
        .insert([newExercise])
        .select()
        .single();

      if (error) throw error;

      setExercises([...exercises, data]);
      setNewExercise({
        name: "",
        description: "",
        target_muscles: [],
        phase: "base",
        goal: "hypertrophy",
        equipment: "",
        difficulty_level: "beginner",
        is_optional: false,
        video_url: "",
        instructions: ""
      });
      setShowAddForm(false);
      toast.success('Exercício adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error);
      toast.error('Erro ao adicionar exercício');
    }
  };

  const handleMuscleChange = (muscle: string) => {
    const currentMuscles = newExercise.target_muscles || [];
    const updatedMuscles = currentMuscles.includes(muscle)
      ? currentMuscles.filter(m => m !== muscle)
      : [...currentMuscles, muscle];
    
    setNewExercise({ ...newExercise, target_muscles: updatedMuscles });
  };

  const availableMuscles = [
    'peitoral', 'dorsais', 'ombros', 'bíceps', 'tríceps', 'antebraços',
    'quadríceps', 'posteriores', 'glúteos', 'panturrilhas', 'core', 'trapézio'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Biblioteca de Exercícios</h2>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Exercício
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome ou músculo-alvo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={filterPhase} onValueChange={setFilterPhase}>
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
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={filterGoal} onValueChange={setFilterGoal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os objetivos</SelectItem>
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

      {/* Formulário de Adicionar */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Novo Exercício</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  placeholder="Nome do exercício"
                />
              </div>
              <div className="space-y-2">
                <Label>Equipamento</Label>
                <Input
                  value={newExercise.equipment}
                  onChange={(e) => setNewExercise({ ...newExercise, equipment: e.target.value })}
                  placeholder="Barra, halteres, máquina..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={newExercise.description}
                onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                placeholder="Descrição do exercício"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fase</Label>
                <Select 
                  value={newExercise.phase} 
                  onValueChange={(value) => setNewExercise({ ...newExercise, phase: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="intensification">Intensificação</SelectItem>
                    <SelectItem value="peaking">Pico</SelectItem>
                    <SelectItem value="recovery">Recuperação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Objetivo</Label>
                <Select 
                  value={newExercise.goal} 
                  onValueChange={(value) => setNewExercise({ ...newExercise, goal: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hypertrophy">Hipertrofia</SelectItem>
                    <SelectItem value="strength">Força</SelectItem>
                    <SelectItem value="power">Potência</SelectItem>
                    <SelectItem value="endurance">Resistência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select 
                  value={newExercise.difficulty_level} 
                  onValueChange={(value) => setNewExercise({ ...newExercise, difficulty_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Iniciante</SelectItem>
                    <SelectItem value="intermediate">Intermediário</SelectItem>
                    <SelectItem value="advanced">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Músculos-alvo *</Label>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {availableMuscles.map(muscle => (
                  <div key={muscle} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={muscle}
                      checked={newExercise.target_muscles?.includes(muscle)}
                      onChange={() => handleMuscleChange(muscle)}
                      className="rounded"
                    />
                    <label htmlFor={muscle} className="text-sm capitalize">
                      {muscle}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Vídeo</Label>
              <Input
                value={newExercise.video_url}
                onChange={(e) => setNewExercise({ ...newExercise, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddExercise} className="bg-green-600 hover:bg-green-700">
                Salvar Exercício
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Exercícios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{exercise.name}</CardTitle>
              <div className="flex flex-wrap gap-1">
                {exercise.target_muscles.map(muscle => (
                  <Badge key={muscle} variant="secondary" className="text-xs">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {exercise.description && (
                <p className="text-sm text-gray-600 mb-3">{exercise.description}</p>
              )}
              <div className="space-y-2 text-sm">
                {exercise.phase && (
                  <div className="flex justify-between">
                    <span className="font-medium">Fase:</span>
                    <Badge variant="outline">{exercise.phase}</Badge>
                  </div>
                )}
                {exercise.goal && (
                  <div className="flex justify-between">
                    <span className="font-medium">Objetivo:</span>
                    <Badge variant="outline">{exercise.goal}</Badge>
                  </div>
                )}
                {exercise.difficulty_level && (
                  <div className="flex justify-between">
                    <span className="font-medium">Dificuldade:</span>
                    <Badge variant="outline">{exercise.difficulty_level}</Badge>
                  </div>
                )}
                {exercise.equipment && (
                  <div className="flex justify-between">
                    <span className="font-medium">Equipamento:</span>
                    <span>{exercise.equipment}</span>
                  </div>
                )}
              </div>
              {exercise.video_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => window.open(exercise.video_url, '_blank')}
                >
                  Ver Vídeo
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum exercício encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};
