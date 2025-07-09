
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Play, Plus, Edit, Search, Filter, ExternalLink, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoExercise {
  id: string;
  name: string;
  description?: string;
  target_muscles: string[];
  phase?: string;
  goal?: string;
  equipment?: string;
  difficulty_level?: string;
  video_url?: string;
  instructions?: string;
}

export const VideoManager = () => {
  const [exercises, setExercises] = useState<VideoExercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<VideoExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPhase, setFilterPhase] = useState("all");
  const [editingExercise, setEditingExercise] = useState<VideoExercise | null>(null);
  const [videoForm, setVideoForm] = useState({
    id: "",
    name: "",
    video_url: "",
    description: "",
    instructions: ""
  });

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, searchTerm, filterPhase]);

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .not('video_url', 'is', null)
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Erro ao buscar exercícios com vídeo:', error);
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

    setFilteredExercises(filtered);
  };

  const extractYouTubeId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const generateYouTubeThumbnail = (url: string) => {
    const videoId = extractYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  const handleVideoUpdate = async () => {
    try {
      if (!videoForm.id || !videoForm.video_url) {
        toast.error('URL do vídeo é obrigatória');
        return;
      }

      const { error } = await supabase
        .from('exercises')
        .update({
          video_url: videoForm.video_url,
          instructions: videoForm.instructions,
          description: videoForm.description || undefined
        })
        .eq('id', videoForm.id);

      if (error) throw error;

      // Atualizar lista local
      setExercises(exercises.map(ex => 
        ex.id === videoForm.id 
          ? { 
              ...ex, 
              video_url: videoForm.video_url,
              instructions: videoForm.instructions,
              description: videoForm.description || ex.description
            }
          : ex
      ));

      setEditingExercise(null);
      setVideoForm({ id: "", name: "", video_url: "", description: "", instructions: "" });
      toast.success('Vídeo atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar vídeo:', error);
      toast.error('Erro ao atualizar vídeo');
    }
  };

  const startEditing = (exercise: VideoExercise) => {
    setEditingExercise(exercise);
    setVideoForm({
      id: exercise.id,
      name: exercise.name,
      video_url: exercise.video_url || "",
      description: exercise.description || "",
      instructions: exercise.instructions || ""
    });
  };

  const openVideo = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando vídeos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold">Gerenciador de Vídeos</h2>
          <Badge variant="secondary">{exercises.length} vídeos</Badge>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome do exercício..."
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
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Edição */}
      {editingExercise && (
        <Card>
          <CardHeader>
            <CardTitle>Editar Vídeo - {editingExercise.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Vídeo *</Label>
              <Input
                value={videoForm.video_url}
                onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={videoForm.description}
                onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                placeholder="Descrição do exercício"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Instruções</Label>
              <Textarea
                value={videoForm.instructions}
                onChange={(e) => setVideoForm({ ...videoForm, instructions: e.target.value })}
                placeholder="Instruções detalhadas de execução"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleVideoUpdate} className="bg-green-600 hover:bg-green-700">
                Salvar Alterações
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setEditingExercise(null);
                  setVideoForm({ id: "", name: "", video_url: "", description: "", instructions: "" });
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Vídeos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExercises.map((exercise) => (
          <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{exercise.name}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startEditing(exercise)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </CardTitle>
              <div className="flex flex-wrap gap-1">
                {exercise.target_muscles.slice(0, 3).map(muscle => (
                  <Badge key={muscle} variant="secondary" className="text-xs">
                    {muscle}
                  </Badge>
                ))}
                {exercise.target_muscles.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{exercise.target_muscles.length - 3}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Thumbnail do YouTube */}
              {exercise.video_url && generateYouTubeThumbnail(exercise.video_url) && (
                <div className="relative mb-4 cursor-pointer" onClick={() => openVideo(exercise.video_url!)}>
                  <img
                    src={generateYouTubeThumbnail(exercise.video_url)}
                    alt={exercise.name}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg hover:bg-opacity-40 transition-all">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </div>
              )}

              {exercise.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{exercise.description}</p>
              )}

              <div className="space-y-2 text-sm mb-4">
                <div className="flex flex-wrap gap-1">
                  {exercise.phase && (
                    <Badge variant="outline">{exercise.phase}</Badge>
                  )}
                  {exercise.goal && (
                    <Badge variant="outline">{exercise.goal}</Badge>
                  )}
                  {exercise.difficulty_level && (
                    <Badge variant="outline">{exercise.difficulty_level}</Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => exercise.video_url && openVideo(exercise.video_url)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Assistir
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => startEditing(exercise)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>

              {exercise.instructions && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  <p className="font-medium mb-1">Instruções:</p>
                  <p className="line-clamp-2">{exercise.instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredExercises.length === 0 && (
        <div className="text-center py-12">
          <Youtube className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {searchTerm ? 'Nenhum vídeo encontrado' : 'Nenhum exercício com vídeo cadastrado'}
          </p>
          <p className="text-gray-400 text-sm">
            {searchTerm 
              ? 'Tente alterar os filtros de busca'
              : 'Adicione URLs de vídeo aos exercícios na biblioteca'
            }
          </p>
        </div>
      )}
    </div>
  );
};
