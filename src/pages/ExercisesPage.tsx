import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Search, Grid, List, Loader2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { AddExerciseForm } from '@/components/exercises/AddExerciseForm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Exercise {
  id: string; name: string; target_muscles: string[]; equipment: string | null;
  difficulty_level: string | null; phase: string | null; goal: string | null;
  image_url: string | null; video_url: string | null; gif_url: string | null; description: string | null;
}

const LIBRARY_URL = "https://bibliteoca9fit.lovable.app/api/exercises.json";

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
  const [syncing, setSyncing] = useState(false);

  const syncLibrary = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) { toast.error('Sessão expirada. Faça login novamente.'); return; }

      // Frontend fallback: fetch exercises directly from public API
      let libraryExercises: any[] = [];
      try {
        const resp = await fetch(LIBRARY_URL, {
          headers: { "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const ct = resp.headers.get("content-type") || "";
          if (ct.includes("json")) {
            const payload = await resp.json();
            libraryExercises = Array.isArray(payload) ? payload : (payload?.exercises || []);
          }
        }
      } catch (e) {
        console.log("Frontend fetch failed, edge function will try:", e);
      }

      // Send exercises in body so edge function doesn't need to fetch
      const { data, error } = await supabase.functions.invoke('sync-exercise-library', {
        body: libraryExercises.length > 0 ? { exercises: libraryExercises } : {},
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) throw error;
      if (data?.success === false) {
        toast.error(data?.hint || data?.error || 'API da biblioteca indisponível');
        return;
      }
      const synced = data?.data?.synced || 0;
      const errors = data?.data?.errors || 0;
      toast.success(`Sincronizado! ${synced} exercícios importados${errors > 0 ? `, ${errors} erros` : ''}.`);
      fetchExercises();
    } catch (err: any) {
      const msg = err?.message || 'Erro ao sincronizar';
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { fetchExercises(); }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('exercises')
      .select('id, name, target_muscles, equipment, difficulty_level, phase, goal, image_url, video_url, gif_url, description')
      .order('name')
      .limit(2000);
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

  if (showAddForm) return <AddExerciseForm onSuccess={() => { setShowAddForm(false); fetchExercises(); }} onCancel={() => setShowAddForm(false)} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">Exercícios</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncLibrary} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar Biblioteca 9FIT
          </Button>
          <Button className="bg-green-500 hover:bg-green-600" onClick={() => setShowAddForm(true)}><Plus className="w-4 h-4 mr-2" />Novo exercício</Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Select value={muscleFilter} onValueChange={setMuscleFilter}>
              <SelectTrigger><SelectValue placeholder="Músculo" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos os músculos</SelectItem>{allMuscles.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
              <SelectTrigger><SelectValue placeholder="Equipamento" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{allEquipment.map(e => <SelectItem key={e!} value={e!}>{e}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={goalFilter} onValueChange={setGoalFilter}>
              <SelectTrigger><SelectValue placeholder="Objetivo" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{allGoals.map(g => <SelectItem key={g!} value={g!}>{g}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} exercício(s) encontrado(s)</p>
        </CardContent>
      </Card>

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
                  {exercise.target_muscles?.length > 0 && <div className="flex flex-wrap gap-1">{exercise.target_muscles.slice(0, 3).map(m => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}</div>}
                  {exercise.equipment && <p className="text-xs text-muted-foreground"><span className="font-medium">Equipamento:</span> {exercise.equipment}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <Card><CardContent className="py-12"><div className="text-center"><h3 className="text-lg font-medium text-foreground mb-2">Nenhum exercício encontrado</h3><p className="text-muted-foreground">Adicione exercícios ou ajuste os filtros.</p></div></CardContent></Card>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-card rounded-lg p-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="aspect-video"><iframe src={selectedVideo} className="w-full h-full rounded-lg" allowFullScreen title="Exercise Video" /></div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setSelectedVideo(null)}>Fechar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
