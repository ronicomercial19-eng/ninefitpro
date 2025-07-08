
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, Edit, Trash2, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Video {
  id: string;
  title: string;
  youtube_url: string;
  exercise_name: string;
  description?: string;
  created_at: string;
}

export const VideoManager = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    youtube_url: '',
    exercise_name: '',
    description: ''
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      // For now, we'll use a mock data structure
      // In a real implementation, you would fetch from a videos table
      const mockVideos: Video[] = [
        {
          id: '1',
          title: 'Agachamento Livre - Técnica Correta',
          youtube_url: 'https://www.youtube.com/watch?v=example1',
          exercise_name: 'Agachamento Livre',
          description: 'Demonstração da técnica correta para agachamento livre',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'Supino Reto - Execução Perfeita',
          youtube_url: 'https://www.youtube.com/watch?v=example2',
          exercise_name: 'Supino Reto',
          description: 'Como executar o supino reto com segurança',
          created_at: new Date().toISOString()
        }
      ];
      setVideos(mockVideos);
    } catch (error) {
      console.error('Erro ao buscar vídeos:', error);
    }
  };

  const addVideo = async () => {
    if (!newVideo.title || !newVideo.youtube_url || !newVideo.exercise_name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // In a real implementation, you would insert into a videos table
      const videoId = `video_${Date.now()}`;
      const videoData: Video = {
        id: videoId,
        ...newVideo,
        created_at: new Date().toISOString()
      };

      setVideos(prev => [videoData, ...prev]);
      setNewVideo({ title: '', youtube_url: '', exercise_name: '', description: '' });
      setIsAddingVideo(false);
      toast.success('Vídeo adicionado com sucesso!');
    } catch (error) {
      console.error('Erro ao adicionar vídeo:', error);
      toast.error('Erro ao adicionar vídeo');
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const deleteVideo = (videoId: string) => {
    setVideos(prev => prev.filter(video => video.id !== videoId));
    toast.success('Vídeo removido com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciar Vídeos</h2>
        <Button 
          onClick={() => setIsAddingVideo(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Vídeo
        </Button>
      </div>

      {isAddingVideo && (
        <Card>
          <CardHeader>
            <CardTitle>Novo Vídeo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Agachamento - Técnica Correta"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise">Nome do Exercício *</Label>
                <Input
                  id="exercise"
                  value={newVideo.exercise_name}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, exercise_name: e.target.value }))}
                  placeholder="Ex: Agachamento Livre"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="youtube_url">URL do YouTube *</Label>
              <Input
                id="youtube_url"
                value={newVideo.youtube_url}
                onChange={(e) => setNewVideo(prev => ({ ...prev, youtube_url: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={newVideo.description}
                onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do vídeo..."
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={addVideo} className="bg-green-500 hover:bg-green-600">
                Salvar Vídeo
              </Button>
              <Button variant="outline" onClick={() => setIsAddingVideo(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const videoId = getYouTubeVideoId(video.youtube_url);
          const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';

          return (
            <Card key={video.id} className="overflow-hidden">
              <div className="relative">
                {thumbnailUrl ? (
                  <img 
                    src={thumbnailUrl} 
                    alt={video.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <Youtube className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => window.open(video.youtube_url, '_blank')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Assistir
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                  <Badge variant="outline" className="text-xs">
                    {video.exercise_name}
                  </Badge>
                  {video.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {video.description}
                    </p>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-muted-foreground">
                    {new Date(video.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteVideo(video.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {videos.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Youtube className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Nenhum vídeo cadastrado</h3>
            <p className="text-muted-foreground mb-4">
              Adicione vídeos do YouTube para enriquecer os treinos
            </p>
            <Button onClick={() => setIsAddingVideo(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Vídeo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
