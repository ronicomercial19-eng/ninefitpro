import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, Eye, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentPhoto {
  id: string;
  photo_url: string;
  photo_type: string;
  photo_category: string;
  description?: string;
  taken_date: string;
  created_at: string;
}

interface StudentPhotosProps {
  studentId: string;
}

export function StudentPhotos({ studentId }: StudentPhotosProps) {
  const [photos, setPhotos] = useState<StudentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({
    photo_type: 'frente',
    photo_category: 'progresso',
    description: '',
    taken_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchPhotos();
  }, [studentId]);

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('student_photos')
        .select('*')
        .eq('student_id', studentId)
        .order('taken_date', { ascending: false });

      if (error) throw error;

      setPhotos(data || []);
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      toast.error('Erro ao carregar fotos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione uma foto');
      return;
    }

    try {
      // Upload para o Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${studentId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Obter URL público
      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(fileName);

      // Salvar referência no banco
      const { data, error } = await supabase
        .from('student_photos')
        .insert({
          student_id: studentId,
          photo_url: publicUrl,
          ...uploadData
        })
        .select()
        .single();

      if (error) throw error;

      setPhotos([data, ...photos]);
      setSelectedFile(null);
      setUploadData({
        photo_type: 'frente',
        photo_category: 'progresso',
        description: '',
        taken_date: new Date().toISOString().split('T')[0]
      });
      setShowUploadForm(false);
      toast.success('Foto adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao fazer upload da foto');
    }
  };

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      // Extrair nome do arquivo da URL
      const fileName = photoUrl.split('/').pop();
      
      // Deletar do storage
      if (fileName) {
        await supabase.storage
          .from('student-photos')
          .remove([fileName]);
      }

      // Deletar do banco
      const { error } = await supabase
        .from('student_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      setPhotos(photos.filter(photo => photo.id !== photoId));
      toast.success('Foto removida com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      toast.error('Erro ao deletar foto');
    }
  };

  const getPhotoTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'frente': 'Frente',
      'costas': 'Costas',
      'perfil': 'Perfil',
      'outros': 'Outros'
    };
    return types[type] || type;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'progresso': 'bg-blue-100 text-blue-800',
      'avaliacao': 'bg-green-100 text-green-800',
      'outros': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors['outros'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-3">Carregando fotos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Fotos</h2>
        </div>
        
        <Button 
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Foto
        </Button>
      </div>

      {/* Formulário de Upload */}
      {showUploadForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Foto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Selecionar Foto</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data da Foto</Label>
                <Input
                  type="date"
                  value={uploadData.taken_date}
                  onChange={(e) => setUploadData({...uploadData, taken_date: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo de Foto</Label>
                <Select 
                  value={uploadData.photo_type} 
                  onValueChange={(value) => setUploadData({...uploadData, photo_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frente">Frente</SelectItem>
                    <SelectItem value="costas">Costas</SelectItem>
                    <SelectItem value="perfil">Perfil</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={uploadData.photo_category} 
                  onValueChange={(value) => setUploadData({...uploadData, photo_category: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="progresso">Progresso</SelectItem>
                    <SelectItem value="avaliacao">Avaliação</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição da foto..."
                value={uploadData.description}
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFileUpload} disabled={!selectedFile}>
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </Button>
              <Button variant="outline" onClick={() => setShowUploadForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Galeria de Fotos */}
      <Card>
        <CardHeader>
          <CardTitle>Galeria de Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma foto adicionada
              </h3>
              <p className="text-gray-600 mb-6">
                Adicione fotos para acompanhar o progresso do aluno
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src={photo.photo_url}
                      alt={photo.description || `Foto ${photo.photo_type}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Overlay com informações */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-end">
                    <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {getPhotoTypeLabel(photo.photo_type)}
                          </p>
                          <p className="text-xs">
                            {new Date(photo.taken_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-white hover:bg-red-500/50"
                            onClick={() => deletePhoto(photo.id, photo.photo_url)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Badge da categoria */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(photo.photo_category)}`}>
                      {photo.photo_category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organização por Tipo */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['frente', 'costas', 'perfil', 'outros'].map((type) => {
            const typePhotos = photos.filter(photo => photo.photo_type === type);
            
            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {getPhotoTypeLabel(type)} ({typePhotos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {typePhotos.length > 0 ? (
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={typePhotos[0].photo_url}
                        alt={`Última foto ${type}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  
                  {typePhotos.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      Última: {new Date(typePhotos[0].taken_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}