import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Flame, Clock, Star, Trophy, TrendingUp, ChevronRight, Zap, Heart, Share2
} from "lucide-react";

interface PostWorkoutModalProps {
  open: boolean;
  onClose: () => void;
  athleteId: string;
  trainingName: string;
  executionId: string;
}

type Step = "pse" | "summary" | "share";

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

export function PostWorkoutModal({ open, onClose, athleteId, executionId, trainingName }: PostWorkoutModalProps) {
  const [step, setStep] = useState<Step>("pse");
  const [rpe, setRpe] = useState(5);
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const submitting=useRef(false);
  const [xpGained, setXpGained] = useState(0);
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [lastRpe, setLastRpe] = useState<number | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  const calculatedCalories = Math.round(duration * rpe * 1.2);

  useEffect(() => {
    let active = true;
    if (open) {
      setStep("pse"); setRpe(5); setDuration(1); setNotes(""); setLastRpe(null); setXpGained(0);
      void supabase.from('workout_executions').select('duration_minutes,avg_rpe').eq('id',executionId).eq('athlete_id',athleteId).single().then(({data})=>{
        if(active && data){setDuration(Math.max(1,data.duration_minutes||1));if(data.avg_rpe!=null)setRpe(Number(data.avg_rpe));}
      });
      void supabase.from('workout_executions').select('avg_rpe').eq('athlete_id',athleteId).eq('status','completed').neq('id',executionId).not('avg_rpe','is',null).order('completed_at',{ascending:false}).limit(1).maybeSingle().then(({data})=>{
        if(active && data?.avg_rpe!=null)setLastRpe(Number(data.avg_rpe));
      });
    }
    return () => { active = false; };
  }, [open,executionId,athleteId]);

  const handleSubmit = async () => {
    if (submitting.current) return;
    if (!executionId) {
      toast.error("Não foi possível identificar a sessão de treino. Tente novamente.");
      return;
    }
    submitting.current=true; setSaving(true);
    try {
      const cal = calculatedCalories;

      const { data, error } = await supabase.rpc('fn_submit_workout_feedback' as any, {
        p_execution_id:executionId,p_rpe:rpe,p_duration_minutes:duration,p_notes:notes||null,
      });
      const result=data as {saved?:boolean;xp_awarded?:number};
      if(error || !result?.saved) throw error || new Error('Feedback não confirmado.');
      const xp=Number(result.xp_awarded||0);
      window.dispatchEvent(new Event('9fit:workout-updated'));
      window.dispatchEvent(new Event('9fit:sync_updated'));
      if(xp>0)window.dispatchEvent(new Event('9fit:xp_awarded'));
      setXpGained(xp);setCaloriesBurned(cal);
      setShareMessage(`Treino concluído: ${trainingName}\nRPE: ${rpe}/10\nDuração: ${duration} min\nCalorias estimadas: ${cal} kcal\nXP confirmado nesta operação: +${xp}`);
      setStep("summary");
    } catch (e) {
      toast.error("Erro ao salvar progresso");
      console.warn("[PostWorkout] erro inesperado:", e);
    } finally {
      submitting.current=false; setSaving(false);
    }
  };

  const shareText =
    `Treino concluído: ${trainingName}
` +
    `RPE ${rpe}/10 · ${duration} min · ${caloriesBurned} kcal · +${xpGained} XP
` +
    `Rumo à próxima sessão! 💪 #9FIT`;

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Treino concluído · 9FIT", text: shareText });
        toast.success("Resultado compartilhado!");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Resumo copiado! Cole onde quiser compartilhar.");
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      if (!aborted) toast.error("Não foi possível compartilhar agora.");
    }
  };

  const getMessage = () => {
    if (rpe >= 8) return { text: "Superação! Você se superou hoje! 🏆", color: "text-red-400" };
    if (rpe >= 5) return { text: "Consistência é a chave! Continue assim! 💪", color: "text-primary" };
    return { text: "Bom treino leve. Aumente a intensidade próxima vez! 🎯", color: "text-yellow-400" };
  };

  const rpeInfo = RPE_LABELS[rpe];

  return (
    <Dialog open={open} onOpenChange={() => { if (step !== "pse") onClose(); }}>
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
        ) : step === "summary" ? (
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

            <div className="space-y-2">
              <Button
                onClick={() => setStep("share")}
                className="w-full bg-primary text-primary-foreground font-bold py-6"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar resultado
              </Button>
              <Button onClick={onClose} variant="ghost" className="w-full text-muted-foreground font-bold">
                Agora não
              </Button>
            </div>
          </div>
        ) : (
          /* Share Step */
          <div className="p-6 space-y-6 text-center">
            <div>
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Mostre seu resultado</h2>
              <p className="text-xs text-muted-foreground mt-1">{trainingName}</p>
            </div>

            <div className="bg-card border border-border rounded-sm p-4 grid grid-cols-2 gap-3 text-left">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">RPE</p>
                <p className="text-lg font-black text-foreground">{rpe}/10</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Duração</p>
                <p className="text-lg font-black text-foreground">{duration} min</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Calorias</p>
                <p className="text-lg font-black text-foreground">{caloriesBurned} kcal</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">XP</p>
                <p className="text-lg font-black text-foreground">+{xpGained}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handleShare} className="w-full bg-primary text-primary-foreground font-bold py-6">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button onClick={onClose} variant="ghost" className="w-full text-muted-foreground font-bold">
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
