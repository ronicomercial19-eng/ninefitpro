import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  studentId: string;
}

interface AssignmentRow {
  id: string;
  training_name: string;
  training_data: any;
}

export function SovereignOverridePanel({ studentId }: Props) {
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("student_training_assignments")
      .select("id, training_name, training_data")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .eq("training_type", "structured");
    setRows((data as any) || []);
    setLoading(false);
  };

  const updateExerciseLock = async (assignmentId: string, exerciseIdx: number, locked: boolean) => {
    const row = rows.find((r) => r.id === assignmentId);
    if (!row) return;
    const td = { ...(row.training_data || {}) };
    const exercises = [...(td.exercises || [])];
    if (!exercises[exerciseIdx]) return;
    exercises[exerciseIdx] = { ...exercises[exerciseIdx], override_locked: locked };
    td.exercises = exercises;

    const { error } = await supabase
      .from("student_training_assignments")
      .update({ training_data: td })
      .eq("id", assignmentId);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === assignmentId ? { ...r, training_data: td } : r)));
    toast.success(locked ? "Exercício bloqueado para IA" : "Bloqueio removido");
  };

  const toggleAll = async (assignmentId: string, locked: boolean) => {
    const row = rows.find((r) => r.id === assignmentId);
    if (!row) return;
    const td = { ...(row.training_data || {}) };
    td.exercises = (td.exercises || []).map((e: any) => ({ ...e, override_locked: locked }));
    td.override_locked_all = locked;

    const { error } = await supabase
      .from("student_training_assignments")
      .update({ training_data: td })
      .eq("id", assignmentId);
    if (error) {
      toast.error("Erro");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === assignmentId ? { ...r, training_data: td } : r)));
    toast.success(locked ? "Treino totalmente bloqueado" : "Bloqueios removidos");
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Nenhum treino estruturado ativo para configurar Sovereign Override.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Sovereign Override — Bloqueio de Ajuste IA
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Exercícios bloqueados não serão ajustados pela IA (carga, séries, reps).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => {
          const exercises: any[] = row.training_data?.exercises || [];
          const allLocked = exercises.length > 0 && exercises.every((e) => e.override_locked);
          return (
            <div key={row.id} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{row.training_name}</p>
                <Button
                  size="sm"
                  variant={allLocked ? "destructive" : "outline"}
                  onClick={() => toggleAll(row.id, !allLocked)}
                >
                  {allLocked ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                  {allLocked ? "Desbloquear tudo" : "Bloquear tudo"}
                </Button>
              </div>
              {exercises.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sem exercícios.</p>
              ) : (
                <div className="space-y-1.5">
                  {exercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm py-1">
                      <span className="text-xs text-muted-foreground w-6">#{idx + 1}</span>
                      <span className="flex-1 truncate">{ex.name}</span>
                      {ex.override_locked && (
                        <Badge variant="outline" className="text-[10px]">
                          <Lock className="w-2.5 h-2.5 mr-0.5" /> Bloqueado
                        </Badge>
                      )}
                      <Switch
                        checked={!!ex.override_locked}
                        onCheckedChange={(v) => updateExerciseLock(row.id, idx, v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
