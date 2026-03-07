import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Upload, Loader2 } from 'lucide-react';

interface AddExerciseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddExerciseForm({ onSuccess, onCancel }: AddExerciseFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', description: '', target_muscles: [] as string[],
    phase: '', goal: '', equipment: '', difficulty_level: '',
    video_url: '', instructions: '', image_url: '',
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const path = `images/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('exercicios').upload(path, imageFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('exercicios').getPublicUrl(path);
      return urlData.publicUrl;
    } catch (e: any) {
      toast.error('Erro no upload: ' + e.message);
      return null;
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = formData.image_url;
      if (imageFile) {
        const uploaded = await uploadImage();
        if (uploaded) imageUrl = uploaded;
      }
      const { error } = await supabase.from('exercises').insert([{ ...formData, image_url: imageUrl || null }]);
      if (error) throw error;
      toast.success('Exercício adicionado!');
      onSuccess();
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally { setLoading(false); }
  };

  const handleMuscleToggle = (muscle: string) => {
    setFormData(prev => ({
      ...prev,
      target_muscles: prev.target_muscles.includes(muscle)
        ? prev.target_muscles.filter(m => m !== muscle)
        : [...prev.target_muscles, muscle]
    }));
  };

  const muscleGroups = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteos', 'Abdômen', 'Panturrilha', 'Core', 'Quadriceps', 'Isquiotibiais'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Adicionar Novo Exercício</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Supino Reto" />
            </div>
            <div className="space-y-2">
              <Label>Equipamento</Label>
              <Input value={formData.equipment} onChange={(e) => setFormData({ ...formData, equipment: e.target.value })} placeholder="Ex: Barra, Haltere" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descreva o exercício" rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={formData.phase} onValueChange={(v) => setFormData({ ...formData, phase: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aquecimento">Aquecimento</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="finalizacao">Finalização</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Select value={formData.goal} onValueChange={(v) => setFormData({ ...formData, goal: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                  <SelectItem value="forca">Força</SelectItem>
                  <SelectItem value="resistencia">Resistência</SelectItem>
                  <SelectItem value="mobilidade">Mobilidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dificuldade</Label>
              <Select value={formData.difficulty_level} onValueChange={(v) => setFormData({ ...formData, difficulty_level: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Músculos Alvo</Label>
            <div className="flex flex-wrap gap-2">
              {muscleGroups.map((m) => (
                <Button key={m} type="button" variant={formData.target_muscles.includes(m) ? 'default' : 'outline'} size="sm" onClick={() => handleMuscleToggle(m)}>{m}</Button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagem do Exercício</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{imageFile ? imageFile.name : 'Selecionar imagem'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
              {imagePreview && <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded object-cover" />}
            </div>
            <p className="text-xs text-muted-foreground">Ou cole uma URL de imagem:</p>
            <Input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label>URL do Vídeo (YouTube/Vimeo)</Label>
            <Input type="url" value={formData.video_url} onChange={(e) => setFormData({ ...formData, video_url: e.target.value })} placeholder="https://youtube.com/..." />
            <p className="text-xs text-muted-foreground">O sistema suporta URLs externas de vídeo. Até ~100 exercícios com vídeo sem impacto na performance.</p>
          </div>

          <div className="space-y-2">
            <Label>Instruções</Label>
            <Textarea value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} placeholder="Instruções passo a passo" rows={4} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={loading || uploading} className="bg-green-500 hover:bg-green-600">
              {(loading || uploading) ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Salvando...</> : 'Adicionar Exercício'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
