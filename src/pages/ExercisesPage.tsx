import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Search, Grid, List, Loader2, Image as ImageIcon } from 'lucide-react';
import { AddExerciseForm } from '@/components/exercises/AddExerciseForm';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Search, Grid, List, Loader2, Image as ImageIcon } from 'lucide-react';
import { AddExerciseForm } from '@/components/exercises/AddExerciseForm';
import { ExerciseVideoPlayer } from '@/components/exercises/ExerciseVideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Exercise {
  id: string;
  name: string;
  target_muscles: string[];
  equipment: string | null;
  difficulty_level: string | null;
  phase: string | null;
  goal: string | null;
  image_url: string | null;
  video_url: string | null;
  gif_url: string | null;
  description: string | null;
}

export default function ExercisesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [goalFilter, setGoalFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [showAddForm, setShowAddForm] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => { fetchExercises(); }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('exercises').select('id, name, target_muscles, equipment, difficulty_level, phase, goal, image_url, video_url, gif_url, description').order('name');
    if (error) { toast.error('Erro ao carregar exercícios'); console.error(error); }
    else setExercises(data || []);
    setLoading(false);
  };

  const allMuscles = [...new Set(exercises.flatMap(e => e.target_muscles || []))].sort();
  const allEquipment = [...new Set(exercises.map(e => e.equipment).filter(Boolean))].sort();
  const allGoals = [...new Set(exercises.map(e => e.goal).filter(Boolean))].sort();

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMuscle = muscleFilter === 'all' || (e.target_muscles || []).some(m => m.toLowerCase().includes(muscleFilter.toLowerCase()));
    const matchEquip = equipmentFilter === 'all' || e.equipment === equipmentFilter;
    const matchGoal = goalFilter === 'all' || e.goal === goalFilter;
    return matchSearch && matchMuscle && matchEquip && matchGoal;
  });

  if (showAddForm) {
    return <AddExerciseForm onSuccess={() => { setShowAddForm(false); fetchExercises(); }} onCancel={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Exercícios</h1>
        <div className="flex items-center gap-2">
          <Button className="bg-green-500 hover:bg-green-600" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />Novo exercício
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger><SelectValue placeholder="Músculo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os músculos</SelectItem>
                {allMuscles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {allEquipment.map(e => <SelectItem key={e!} value={e!}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {allGoals.map(g => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} exercício(s) encontrado(s)</p>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex justify-end">
        <div className="flex items-center border rounded-lg">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')}><Grid className="w-4 h-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-3"}>
          {filtered.map((exercise) => (
            <Card key={exercise.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                {exercise.image_url || exercise.gif_url ? (
                  <img src={exercise.image_url || exercise.gif_url || ''} alt={exercise.name} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center"><ImageIcon className="w-12 h-12 text-muted-foreground" /></div>
                )}
                {exercise.video_url && (
                  <button onClick={() => setSelectedVideo(exercise.video_url)} className="absolute inset-0 bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors">
                    <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center"><Play className="w-8 h-8 text-foreground ml-1" /></div>
                  </button>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{exercise.name}</h3>
                <div className="space-y-2">
                  {exercise.target_muscles?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {exercise.target_muscles.slice(0, 3).map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
                    </div>
                  )}
                  {exercise.equipment && <p className="text-xs text-muted-foreground"><span className="font-medium">Equipamento:</span> {exercise.equipment}</p>}
                  {exercise.difficulty_level && <p className="text-xs text-muted-foreground"><span className="font-medium">Nível:</span> {exercise.difficulty_level}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card><CardContent className="py-12"><div className="text-center"><h3 className="text-lg font-medium text-foreground mb-2">Nenhum exercício encontrado</h3><p className="text-muted-foreground">Adicione exercícios ou ajuste os filtros.</p></div></CardContent></Card>
      )}

      {/* Video Player Dialog */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-card rounded-lg p-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="aspect-video">
              <iframe src={selectedVideo} className="w-full h-full rounded-lg" allowFullScreen title="Exercise Video" />
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setSelectedVideo(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
