import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Play,
  Plus,
  Search,
  Grid,
  List,
  Loader2,
  Image as ImageIcon,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { AddExerciseForm } from "@/components/exercises/AddExerciseForm";
import { LibraryAssignDialog } from "@/components/students/LibraryAssignDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface LibItem {
  id: string;
  external_id: string;
  type: string;
  slug: string | null;
  name: string;
  category: string | null;
  subcategory: string | null;
  thumbnail_url: string | null;
  player_url: string | null;
}

const LIBRARY_URL = "https://bibliteoca9fit.lovable.app/api/exercises.json";

export default function ExercisesPage() {
  const [facets, setFacets] = useState<{
    muscles: string[];
    equipment: string[];
    goals: string[];
  }>({ muscles: [], equipment: [], goals: [] });
  useEffect(() => {
    let active = true;
    supabase
      .rpc("fn_professor_exercise_facets" as any)
      .then(({ data, error }) => {
        if (active && !error && data) setFacets(data as any);
      });
    return () => {
      active = false;
    };
  }, []);
  const [page, setPage] = useState(0);
  const [totalExercises, setTotalExercises] = useState(0);
  const [exerciseError, setExerciseError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showAddForm, setShowAddForm] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [libItems, setLibItems] = useState<LibItem[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libType, setLibType] = useState<string>("infoproduto");
  const [assignTarget, setAssignTarget] = useState<LibItem | null>(null);

  const fetchLibrary = async (type: string) => {
    setLibLoading(true);
    const { data, error, count } = await supabase
      .from("library_items")
      .select(
        "id, external_id, type, slug, name, category, subcategory, thumbnail_url, player_url, payload",
        { count: "exact" },
      )
      .eq("type", type)
      .order("name")
      .limit(2000);
    if (error) toast.error("Erro ao carregar biblioteca");
    else {
      setLibItems((data as any) || []);
      if ((count ?? 0) > (data?.length ?? 0)) {
        toast.info(
          `Mostrando ${data?.length}/${count} itens. Sincronize para atualizar.`,
        );
      }
    }
    setLibLoading(false);
  };

  useEffect(() => {
    fetchLibrary(libType);
    // Realtime: invalidate on library changes
    const ch = supabase
      .channel("library_items-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "library_items" },
        () => fetchLibrary(libType),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [libType]);

  const syncFullLibrary = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Sessão expirada");
        return;
      }
      const { data, error } = await supabase.functions.invoke(
        "sync-library-full",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (error) throw error;
      if (data?.success === false) {
        toast.error(data?.error || "Falha");
        return;
      }
      const d = data?.data || {};
      toast.success(
        `Biblioteca completa: ${d.synced || 0} itens sincronizados`,
      );
      fetchLibrary(libType);
      fetchExercises();
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setSyncing(false);
    }
  };

  const syncLibrary = async () => {
    setSyncing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      // Frontend fallback: fetch exercises directly from public API
      let libraryExercises: any[] = [];
      try {
        const resp = await fetch(LIBRARY_URL, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const ct = resp.headers.get("content-type") || "";
          if (ct.includes("json")) {
            const payload = await resp.json();
            libraryExercises = Array.isArray(payload)
              ? payload
              : payload?.exercises || [];
          }
        }
      } catch (e) {
        console.log("Frontend fetch failed, edge function will try:", e);
      }

      // Send exercises in body so edge function doesn't need to fetch
      const { data, error } = await supabase.functions.invoke(
        "sync-exercise-library",
        {
          body:
            libraryExercises.length > 0 ? { exercises: libraryExercises } : {},
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (error) throw error;
      if (data?.success === false) {
        toast.error(
          data?.hint || data?.error || "API da biblioteca indisponível",
        );
        return;
      }
      const synced = data?.data?.synced || 0;
      const errors = data?.data?.errors || 0;
      toast.success(
        `Sincronizado! ${synced} exercícios importados${errors > 0 ? `, ${errors} erros` : ""}.`,
      );
      fetchExercises();
    } catch (err: any) {
      const msg = err?.message || "Erro ao sincronizar";
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [searchTerm, muscleFilter, equipmentFilter, goalFilter]);
  useEffect(() => {
    const timer = setTimeout(() => void fetchExercises(), 200);
    return () => clearTimeout(timer);
  }, [page, searchTerm, muscleFilter, equipmentFilter, goalFilter]);

  const fetchExercises = async () => {
    setLoading(true);
    setExerciseError(false);
    let query = supabase
      .from("exercises")
      .select(
        "id, name, target_muscles, equipment, difficulty_level, phase, goal, image_url, video_url, gif_url, description",
        { count: "exact" },
      );
    if (searchTerm.trim())
      query = query.ilike(
        "name",
        `%${searchTerm.trim().replace(/[%_]/g, "")}%`,
      );
    if (muscleFilter !== "all")
      query = query.contains("target_muscles", [muscleFilter]);
    if (equipmentFilter !== "all")
      query = query.eq("equipment", equipmentFilter);
    if (goalFilter !== "all") query = query.eq("goal", goalFilter);
    const { data, error, count } = await query
      .order("name")
      .order("id")
      .range(page * 30, page * 30 + 29);
    if (error) {
      setExerciseError(true);
      setExercises([]);
    } else {
      setExercises(data ?? []);
      setTotalExercises(count ?? 0);
    }
    setLoading(false);
  };

  const allMuscles = facets.muscles;
  const allEquipment = facets.equipment;
  const allGoals = facets.goals;

  const filtered = exercises.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMuscle =
      muscleFilter === "all" ||
      (e.target_muscles || []).some((m) =>
        m.toLowerCase().includes(muscleFilter.toLowerCase()),
      );
    const matchEquip =
      equipmentFilter === "all" || e.equipment === equipmentFilter;
    const matchGoal = goalFilter === "all" || e.goal === goalFilter;
    return matchSearch && matchMuscle && matchEquip && matchGoal;
  });

  if (showAddForm)
    return (
      <AddExerciseForm
        onSuccess={() => {
          setShowAddForm(false);
          fetchExercises();
        }}
        onCancel={() => setShowAddForm(false)}
      />
    );

  const libTypes = [
    { v: "infoproduto", l: "Infoprodutos" },
    { v: "protocolo", l: "Protocolos" },
    { v: "ebook", l: "Ebooks" },
    { v: "sistema", l: "Sistemas" },
    { v: "app", l: "Apps" },
    { v: "video", l: "Vídeos" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-3xl font-display uppercase tracking-tight text-foreground">
          Biblioteca 9FIT
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={syncFullLibrary}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Sincronizar Biblioteca Completa
          </Button>
          <Button variant="outline" onClick={syncLibrary} disabled={syncing}>
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar Exercícios
          </Button>
          <Button
            className="bg-green-500 hover:bg-green-600"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="exercises"
        className="w-full"
        onValueChange={(v) => {
          if (v !== "exercises") {
            setLibType(v);
            fetchLibrary(v);
          }
        }}
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="exercises">Exercícios</TabsTrigger>
          {libTypes.map((t) => (
            <TabsTrigger key={t.v} value={t.v}>
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="exercises" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Músculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os músculos</SelectItem>
                    {allMuscles.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={equipmentFilter}
                  onValueChange={setEquipmentFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allEquipment.map((e) => (
                      <SelectItem key={e!} value={e!}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={goalFilter} onValueChange={setGoalFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {allGoals.map((g) => (
                      <SelectItem key={g!} value={g!}>
                        {g}
                      </SelectItem>
                    ))}
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
              <p className="text-sm text-muted-foreground font-data">
                {totalExercises} exercício(s) · página {page + 1}
              </p>
            </CardContent>
          </Card>

          {exerciseError ? (
            <p role="alert">
              Falha ao carregar exercícios.{" "}
              <button onClick={() => void fetchExercises()}>
                Tentar novamente
              </button>
            </p>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((exercise) => (
                <Card
                  key={exercise.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative">
                    {exercise.image_url || exercise.gif_url ? (
                      <img
                        src={exercise.image_url || exercise.gif_url || ""}
                        alt={exercise.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    {exercise.video_url && (
                      <button
                        onClick={() => setSelectedVideo(exercise.video_url)}
                        className="absolute inset-0 bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors"
                      >
                        <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center">
                          <Play className="w-8 h-8 text-foreground ml-1" />
                        </div>
                      </button>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                      {exercise.name}
                    </h3>
                    <div className="space-y-2 mb-3">
                      {exercise.target_muscles?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {exercise.target_muscles.slice(0, 3).map((m) => (
                            <Badge
                              key={m}
                              variant="secondary"
                              className="text-xs"
                            >
                              {m}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        setAssignTarget({
                          id: exercise.id,
                          external_id: exercise.id,
                          type: "exercise",
                          slug: null,
                          name: exercise.name,
                          category: null,
                          subcategory: null,
                          thumbnail_url: exercise.image_url,
                          player_url: exercise.video_url,
                        })
                      }
                    >
                      <Send className="w-3 h-3 mr-2" /> Atribuir a aluno
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm">Página {page + 1}</span>
            <Button
              variant="outline"
              disabled={(page + 1) * 30 >= totalExercises || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </TabsContent>

        {libTypes.map((t) => (
          <TabsContent key={t.v} value={t.v} className="space-y-4 mt-4">
            {libLoading && libType === t.v ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground font-data">
                  {libItems.filter((i) => i.type === t.v).length}{" "}
                  {t.l.toLowerCase()}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {libItems
                    .filter((i) => i.type === t.v)
                    .map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="aspect-video bg-muted flex items-center justify-center">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Sparkles className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <CardContent className="p-4">
                          <Badge
                            variant="secondary"
                            className="mb-2 uppercase text-[10px]"
                          >
                            {item.type}
                          </Badge>
                          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                            {item.name}
                          </h3>
                          {item.category && (
                            <p className="text-xs text-muted-foreground mb-3">
                              {item.category}
                            </p>
                          )}
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => setAssignTarget(item)}
                          >
                            <Send className="w-3 h-3 mr-2" /> Atribuir a aluno
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  {libItems.filter((i) => i.type === t.v).length === 0 && (
                    <Card className="md:col-span-2 lg:col-span-3">
                      <CardContent className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum item. Clique em "Sincronizar Biblioteca
                        Completa".
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <LibraryAssignDialog
        open={!!assignTarget}
        onOpenChange={(v) => !v && setAssignTarget(null)}
        item={assignTarget}
      />

      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-card rounded-lg p-4 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video">
              <iframe
                src={selectedVideo}
                className="w-full h-full rounded-lg"
                allowFullScreen
                title="Exercise Video"
              />
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setSelectedVideo(null)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
