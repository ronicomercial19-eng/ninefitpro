import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Search, Plus, Minus, Trash2, Dumbbell, Save, GripVertical, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  target_muscles: string[];
  equipment: string | null;
  gif_url: string | null;
  video_url: string | null;
  external_video_id: string | null;
}

interface PrescribedExercise {
  exercise_id: string;
  name: string;
  target_muscles: string[];
  gif_url: string | null;
  video_url: string | null;
  external_video_id: string | null;
  sets: number;
  reps: string;
  rest_seconds: number;
  tempo: string;
  notes: string;
}

interface CreateWorkoutFormProps {
  studentId: string;
  studentName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const WEEKDAYS = [
  { key: "segunda", label: "Seg" },
  { key: "terca", label: "Ter" },
  { key: "quarta", label: "Qua" },
  { key: "quinta", label: "Qui" },
  { key: "sexta", label: "Sex" },
  { key: "sabado", label: "Sáb" },
  { key: "domingo", label: "Dom" },
];

export function CreateWorkoutForm({ studentId, studentName, onSuccess, onCancel }: CreateWorkoutFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [duration, setDuration] = useState(45);

  // Step 2: Exercise selection
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  // Step 3: Prescription
  const [prescribed, setPrescribed] = useState<PrescribedExercise[]>([]);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoadingExercises(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name, target_muscles, equipment, gif_url, video_url, external_video_id")
      .order("name");
    setExercises(data || []);
    setLoadingExercises(false);
  };

  const allMuscles = [...new Set(exercises.flatMap(e => e.target_muscles || []))].sort();

  const filtered = exercises.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMuscle = muscleFilter === "all" || (e.target_muscles || []).some(m => m.toLowerCase().includes(muscleFilter.toLowerCase()));
    return matchSearch && matchMuscle;
  });

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const addExercise = (exercise: Exercise) => {
    if (prescribed.find(p => p.exercise_id === exercise.id)) {
      toast.info("Exercício já adicionado");
      return;
    }
    setPrescribed(prev => [...prev, {
      exercise_id: exercise.id,
      name: exercise.name,
      target_muscles: exercise.target_muscles,
      gif_url: exercise.gif_url,
      video_url: exercise.video_url,
      external_video_id: exercise.external_video_id,
      sets: 3,
      reps: "12",
      rest_seconds: 60,
      tempo: "2-0-2",
      notes: "",
    }]);
  };

  const removeExercise = (idx: number) => {
    setPrescribed(prev => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, field: keyof PrescribedExercise, value: any) => {
    setPrescribed(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome do treino é obrigatório"); return; }
    if (prescribed.length === 0) { toast.error("Adicione pelo menos 1 exercício"); return; }

    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const coachId = session.session?.user?.id;

      const trainingData = {
        exercises: prescribed.map((p, idx) => ({
          order: idx + 1,
          exercise_id: p.exercise_id,
          name: p.name,
          target_muscles: p.target_muscles,
          gif_url: p.gif_url,
          video_url: p.video_url,
          external_video_id: p.external_video_id,
          sets: p.sets,
          reps: p.reps,
          rest_seconds: p.rest_seconds,
          tempo: p.tempo,
          notes: p.notes,
        })),
        training_days: selectedDays,
        estimated_duration: duration,
        exercise_count: prescribed.length,
      };

      const { error } = await supabase.from("student_training_assignments").insert({
        student_id: studentId,
        created_by: coachId || "",
        training_name: name.trim(),
        training_description: description.trim() || null,
        training_type: "structured",
        training_data: trainingData,
        start_date: new Date().toISOString().split("T")[0],
        is_active: true,
      });

      if (error) throw error;
      toast.success("Treino criado com sucesso!");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar treino: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">Criar Treino Estruturado</h2>
          <p className="text-sm text-muted-foreground">Para: {studentName}</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {/* Step 1: Metadata */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome do Treino *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Treino A - Superior" />
          </div>
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Objetivos e observações" rows={3} />
          </div>
          <div>
            <label className="text-sm font-medium">Dias da Semana</label>
            <div className="flex gap-2 mt-1">
              {WEEKDAYS.map(d => (
                <button
                  key={d.key}
                  onClick={() => toggleDay(d.key)}
                  className={`px-3 py-2 rounded-md text-xs font-bold transition-colors ${
                    selectedDays.includes(d.key)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Duração estimada (min)</label>
            <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={10} max={180} />
          </div>
          <Button onClick={() => setStep(2)} disabled={!name.trim()} className="w-full">
            Próximo: Selecionar Exercícios <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step 2: Exercise Selection */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar exercício..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <select
              value={muscleFilter}
              onChange={e => setMuscleFilter(e.target.value)}
              className="bg-background border border-input rounded-md px-3 text-sm"
            >
              <option value="all">Todos</option>
              {allMuscles.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Selected count */}
          {prescribed.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <Check className="w-4 h-4" />
              {prescribed.length} exercício(s) selecionado(s)
            </div>
          )}

          {/* Exercise list */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loadingExercises ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum exercício encontrado. Sincronize a biblioteca primeiro.</p>
            ) : (
              filtered.map(exercise => {
                const isSelected = prescribed.some(p => p.exercise_id === exercise.id);
                return (
                  <div
                    key={exercise.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => isSelected ? undefined : addExercise(exercise)}
                  >
                    {exercise.gif_url ? (
                      <img src={exercise.gif_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Dumbbell className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{exercise.name}</p>
                      <div className="flex gap-1 mt-0.5">
                        {exercise.target_muscles?.slice(0, 2).map(m => (
                          <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0">{m}</Badge>
                        ))}
                      </div>
                    </div>
                    {isSelected ? (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
            <Button onClick={() => setStep(3)} disabled={prescribed.length === 0} className="flex-1">
              Próximo: Prescrição <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Prescription */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Defina séries, repetições e descanso para cada exercício.</p>

          <div className="space-y-3 max-h-[450px] overflow-y-auto">
            {prescribed.map((p, idx) => (
              <Card key={p.exercise_id}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">{idx + 1}</span>
                    <p className="font-medium text-sm truncate flex-1">{p.name}</p>
                    <button onClick={() => removeExercise(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Séries</label>
                      <Input
                        type="number" min={1} max={10} value={p.sets}
                        onChange={e => updateExercise(idx, "sets", Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Reps</label>
                      <Input
                        value={p.reps}
                        onChange={e => updateExercise(idx, "reps", e.target.value)}
                        className="h-8 text-sm" placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Desc (s)</label>
                      <Input
                        type="number" min={0} value={p.rest_seconds}
                        onChange={e => updateExercise(idx, "rest_seconds", Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase">Tempo</label>
                      <Input
                        value={p.tempo}
                        onChange={e => updateExercise(idx, "tempo", e.target.value)}
                        className="h-8 text-sm" placeholder="2-0-2"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <Input
                      value={p.notes}
                      onChange={e => updateExercise(idx, "notes", e.target.value)}
                      placeholder="Observações (opcional)" className="h-8 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Voltar</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Treino"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
