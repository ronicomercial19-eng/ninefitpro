import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Flame, Clock, Star, Trophy, TrendingUp, ChevronRight, Zap, Heart
} from "lucide-react";

interface PostWorkoutModalProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  trainingName: string;
}

type Step = "pse" | "summary";

const RPE_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: "Muito Fácil", emoji: "😴", color: "text-green-400" },
  2: { label: "Fácil", emoji: "😌", color: "text-green-400" },
  3: { label: "Leve", emoji: "🙂", color: "text-green-500" },
  4: { label: "Moderado", emoji: "😐", color: "text-yellow-400" },
  5: { label: "Moderado+", emoji: "😤", color: "text-yellow-500" },
  6: { label: "Difícil", emoji: "💪", color: "text-orange-400" },
  7: { label: "Intenso", emoji: "🔥", color: "text-orange-500" },
  8: { label: "Muito Intenso", emoji: "😰", color: "text-red-400" },
  9: { label: "Exaustivo", emoji: "🥵", color: "text-red-500" },
  10: { label: "Máximo", emoji: "💀", color: "text-red-600" },
};

export function PostWorkoutModal({ open, onClose, athleteId, trainingName }: PostWorkoutModalProps) {
  const [step, setStep] = useState<Step>("pse");
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [lastRpe, setLastRpe] = useState<number | null>(null);

  const calculatedCalories = Math.round(duration * rpe * 1.2);

  useEffect(() => {
    if (open) {
      setStep("pse");
      setRpe(5);
      setDuration(45);
      setNotes("");
      fetchLastRpe();
    }
  }, [open]);

  const fetchLastRpe = async () => {
    const { data } = await supabase
      .from("workout_progress")
      .select("rpe")
      .eq("aluno_id", athleteId)
      .not("rpe", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.rpe) setLastRpe(data.rpe as number);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const todayDate = new Date().toISOString().split("T")[0];

      // Check duplicate
      const { data: existing } = await supabase
        .from("workout_progress")
        .select("id")
        .eq("aluno_id", athleteId)
        .eq("training_name", trainingName)
        .eq("date", todayDate)
        .maybeSingle();

      if (existing) {
        toast.info("Você já concluiu este treino hoje! 💪");
        onClose();
        return;
      }

      const cal = calculatedCalories;

      await supabase.from("workout_progress").insert({
        aluno_id: athleteId,
        exercise_name: trainingName,
        training_name: trainingName,
        completed_at: new Date().toISOString(),
        calories_burned: cal,
        duration_minutes: duration,
        rpe,
        notes: notes || null,
        sets: 0,
        reps: 0,
        date: todayDate,
      } as any);

      // Award XP (base 100 + RPE bonus) via fn_award_xp
      const xp = 100 + (rpe > 7 ? 50 : rpe > 4 ? 25 : 0);
      await supabase.rpc("fn_award_xp" as any, {
        p_athlete_id: athleteId,
        p_amount: xp,
        p_source: "workout_completed",
        p_metadata: { training_name: trainingName, rpe, duration_minutes: duration },
      });

      setXpGained(xp);
      setCaloriesBurned(cal);
      setStep("summary");
    } catch {
      toast.error("Erro ao salvar progresso");
    } finally {
      setSaving(false);
    }
  };

  const getMessage = () => {
    if (rpe >= 8) return { text: "Superação! Você se superou hoje! 🏆", color: "text-red-400" };
    if (rpe >= 5) return { text: "Consistência é a chave! Continue assim! 💪", color: "text-primary" };
    return { text: "Bom treino leve. Aumente a intensidade próxima vez! 🎯", color: "text-yellow-400" };
  };

  const rpeInfo = RPE_LABELS[rpe];

  return (
    <Dialog open={open} onOpenChange={() => { if (step === "summary") onClose(); }}>
      <DialogContent className="max-w-md mx-auto bg-background border-border p-0 rounded-sm overflow-hidden">
        {step === "pse" ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <Trophy className="w-10 h-10 text-primary mx-auto mb-2" />
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Treino Concluído!</h2>
              <p className="text-xs text-muted-foreground mt-1">Como foi sua sessão?</p>
            </div>

            {/* RPE Slider */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
                Esforço Percebido (RPE)
              </label>
              <div className="text-center mb-4">
                <span className="text-4xl">{rpeInfo.emoji}</span>
                <p className={`text-lg font-black ${rpeInfo.color}`}>{rpe}/10</p>
                <p className="text-xs text-muted-foreground">{rpeInfo.label}</p>
              </div>
              <Slider
                value={[rpe]}
                onValueChange={([v]) => setRpe(v)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Fácil</span>
                <span>Máximo</span>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                <Clock className="w-3 h-3 inline mr-1" />Duração (minutos)
              </label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 0))}
                className="bg-card border-border"
                min={1}
                max={300}
              />
            </div>

            {/* Estimated Calories */}
            <div className="bg-card border border-border rounded-sm p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Calorias estimadas</span>
              </div>
              <span className="text-lg font-black text-foreground">{calculatedCalories} kcal</span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Observações (opcional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como se sentiu? Alguma dor?"
                className="bg-card border-border resize-none h-20"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-primary text-primary-foreground font-bold py-6"
            >
              {saving ? "Salvando..." : "Confirmar Treino"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          /* Summary Step */
          <div className="p-6 space-y-6 text-center">
            <div>
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Parabéns! 🔥</h2>
              <p className={`text-sm font-bold mt-1 ${getMessage().color}`}>{getMessage().text}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-sm p-3">
                <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xl font-black text-foreground">+{xpGained}</p>
                <p className="text-[10px] text-muted-foreground uppercase">XP</p>
              </div>
              <div className="bg-card border border-border rounded-sm p-3">
                <Flame className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-black text-foreground">{caloriesBurned}</p>
                <p className="text-[10px] text-muted-foreground uppercase">KCAL</p>
              </div>
              <div className="bg-card border border-border rounded-sm p-3">
                <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-xl font-black text-foreground">{rpe}/10</p>
                <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
              </div>
            </div>

            {lastRpe !== null && (
              <div className="bg-card border border-border rounded-sm p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">RPE anterior</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {lastRpe}/10 → {rpe}/10
                  {rpe > lastRpe ? " ↑" : rpe < lastRpe ? " ↓" : " ="}
                </span>
              </div>
            )}

            <Button onClick={onClose} className="w-full bg-primary text-primary-foreground font-bold py-6">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
