
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Database, AlertTriangle, CheckCircle } from "lucide-react";
import { Exercise } from "@/types/training";

const exerciseDatabase: Exercise[] = [
  {
    id: "1",
    name: "Supino reto com halteres",
    category: "Peito",
    muscle_groups: ["Peitoral maior", "Deltoides anterior", "Tríceps"],
    equipment_type: "Halteres",
    difficulty_level: "intermediate",
    instructions: [
      "Deite-se no banco com halteres nas mãos",
      "Mantenha os ombros retraídos e o core contraído",
      "Desça os halteres controladamente até o peito",
      "Empurre com força, mantendo o controle"
    ],
    sets: 3,
    reps: "8-12",
    rest_seconds: 90,
    rpe_target: 7,
    load_percentage: "70-80%",
    tempo: "3-1-1-0",
    notes: "Manter ombros retraídos durante todo movimento",
    contraindications: ["Lesão no ombro", "Instabilidade escapular"],
    alternatives: ["Supino com máquina", "Flexão de braço"]
  },
  {
    id: "2",
    name: "Agachamento com barra",
    category: "Pernas",
    muscle_groups: ["Quadríceps", "Glúteos", "Isquiotibiais"],
    equipment_type: "Barra",
    difficulty_level: "advanced",
    instructions: [
      "Posicione a barra no trapézio superior",
      "Mantenha os pés na largura dos ombros",
      "Desça mantendo o peito erguido",
      "Suba explodindo com os calcanhares"
    ],
    sets: 4,
    reps: "6-8",
    rest_seconds: 120,
    rpe_target: 8,
    load_percentage: "80-85%",
    tempo: "3-0-1-0",
    notes: "Manter joelhos alinhados com os pés",
    contraindications: ["Lesão lombar", "Lesão no joelho"],
    alternatives: ["Leg press", "Agachamento goblet"]
  },
  {
    id: "3",
    name: "Remada curvada",
    category: "Costas",
    muscle_groups: ["Latíssimo do dorso", "Romboides", "Bíceps"],
    equipment_type: "Barra",
    difficulty_level: "intermediate",
    instructions: [
      "Curve o tronco a 45 graus",
      "Segure a barra com pegada pronada",
      "Puxe a barra em direção ao abdômen",
      "Controle a descida"
    ],
    sets: 3,
    reps: "8-10",
    rest_seconds: 90,
    rpe_target: 7,
    load_percentage: "70-75%",
    tempo: "2-1-1-0",
    notes: "Manter coluna neutra durante o movimento",
    contraindications: ["Lesão lombar"],
    alternatives: ["Remada na máquina", "Remada com halteres"]
  },
  {
    id: "4",
    name: "Flexão de braço",
    category: "Peito",
    muscle_groups: ["Peitoral maior", "Deltoides anterior", "Tríceps"],
    equipment_type: "Peso corporal",
    difficulty_level: "beginner",
    instructions: [
      "Posição de prancha com mãos no chão",
      "Desça o corpo até quase tocar o chão",
      "Empurre com força até estender os braços",
      "Mantenha o core contraído"
    ],
    sets: 3,
    reps: "8-15",
    rest_seconds: 60,
    rpe_target: 6,
    notes: "Manter corpo alinhado como uma prancha",
    contraindications: ["Lesão no punho"],
    alternatives: ["Flexão com joelhos apoiados", "Flexão inclinada"]
  },
  {
    id: "5",
    name: "Prancha abdominal",
    category: "Core",
    muscle_groups: ["Reto abdominal", "Transverso abdominal", "Oblíquos"],
    equipment_type: "Peso corporal",
    difficulty_level: "beginner",
    instructions: [
      "Apoie-se nos antebraços e pontas dos pés",
      "Mantenha o corpo alinhado",
      "Contraia o core e respire normalmente",
      "Mantenha a posição pelo tempo determinado"
    ],
    sets: 3,
    reps: "30-60s",
    rest_seconds: 45,
    rpe_target: 7,
    notes: "Evitar elevar o quadril ou deixar cair",
    contraindications: ["Lesão lombar severa"],
    alternatives: ["Prancha com joelhos apoiados", "Dead bug"]
  }
];

export const ExerciseDatabase = () => {
  const [exercises, setExercises] = useState<Exercise[]>(exerciseDatabase);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>(exerciseDatabase);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all");

  useEffect(() => {
    let filtered = exercises;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscle_groups.some(muscle => 
          muscle.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filtro por categoria
    if (categoryFilter !== "all") {
      filtered = filtered.filter(exercise => exercise.category === categoryFilter);
    }

    // Filtro por dificuldade
    if (difficultyFilter !== "all") {
      filtered = filtered.filter(exercise => exercise.difficulty_level === difficultyFilter);
    }

    // Filtro por equipamento
    if (equipmentFilter !== "all") {
      filtered = filtered.filter(exercise => exercise.equipment_type === equipmentFilter);
    }

    setFilteredExercises(filtered);
  }, [searchTerm, categoryFilter, difficultyFilter, equipmentFilter, exercises]);

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Iniciante';
      case 'intermediate':
        return 'Intermediário';
      case 'advanced':
        return 'Avançado';
      default:
        return level;
    }
  };

  const categories = [...new Set(exercises.map(e => e.category))];
  const equipmentTypes = [...new Set(exercises.map(e => e.equipment_type))];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6 text-orange-500" />
            Banco de Exercícios Científico
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                <SelectItem value="beginner">Iniciante</SelectItem>
                <SelectItem value="intermediate">Intermediário</SelectItem>
                <SelectItem value="advanced">Avançado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Equipamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os equipamentos</SelectItem>
                {equipmentTypes.map(equipment => (
                  <SelectItem key={equipment} value={equipment}>{equipment}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredExercises.length}</div>
              <div className="text-sm text-blue-600">Exercícios</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredExercises.filter(e => e.difficulty_level === 'beginner').length}
              </div>
              <div className="text-sm text-green-600">Iniciante</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {filteredExercises.filter(e => e.difficulty_level === 'intermediate').length}
              </div>
              <div className="text-sm text-yellow-600">Intermediário</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredExercises.filter(e => e.difficulty_level === 'advanced').length}
              </div>
              <div className="text-sm text-red-600">Avançado</div>
            </div>
          </div>

          {/* Lista de Exercícios */}
          <div className="grid gap-4">
            {filteredExercises.map((exercise) => (
              <Card key={exercise.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{exercise.name}</h3>
                      <p className="text-gray-600">{exercise.muscle_groups.join(', ')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                        {getDifficultyLabel(exercise.difficulty_level)}
                      </Badge>
                      <Badge variant="outline">{exercise.equipment_type}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Instruções:</h4>
                      <ol className="text-sm space-y-1">
                        {exercise.instructions.map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-orange-500 font-medium">{idx + 1}.</span>
                            <span>{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Séries:</span> {exercise.sets}
                        </div>
                        <div>
                          <span className="font-medium">Reps:</span> {exercise.reps}
                        </div>
                        <div>
                          <span className="font-medium">Descanso:</span> {exercise.rest_seconds}s
                        </div>
                        <div>
                          <span className="font-medium">RPE:</span> {exercise.rpe_target}
                        </div>
                      </div>

                      {exercise.notes && (
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-orange-900 text-sm">Dica Técnica:</p>
                              <p className="text-orange-800 text-sm">{exercise.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {exercise.contraindications && exercise.contraindications.length > 0 && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-900 text-sm">Contraindicações:</p>
                              <p className="text-red-800 text-sm">{exercise.contraindications.join(', ')}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {exercise.alternatives && exercise.alternatives.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="font-medium text-blue-900 text-sm">Alternativas:</p>
                          <p className="text-blue-800 text-sm">{exercise.alternatives.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredExercises.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum exercício encontrado</h3>
              <p className="text-gray-600">Tente ajustar os filtros para encontrar exercícios.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
