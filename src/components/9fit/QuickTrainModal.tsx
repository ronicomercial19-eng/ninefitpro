import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Play, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type Step = 0 | 1 | 2 | 3;
type Answers = { goal: string; time: string; equipment: string };

const QS = [
  { key: "goal", label: "Qual seu objetivo agora?", opts: [
    { v: "fatburn", l: "Queimar gordura" },
    { v: "strength", l: "Ganhar força" },
    { v: "mobility", l: "Recuperação / mobilidade" },
    { v: "cardio", l: "Cardio rápido" }] },
  { key: "time", label: "Quanto tempo você tem?", opts: [
    { v: "15", l: "15 min" }, { v: "30", l: "30 min" }, { v: "45", l: "45 min" }, { v: "60", l: "1 hora" }] },
  { key: "equipment", label: "Onde vai treinar?", opts: [
    { v: "home", l: "Casa (sem equipamento)" },
    { v: "home_basic", l: "Casa (halteres / elásticos)" },
    { v: "gym", l: "Academia completa" },
    { v: "outdoor", l: "Ar livre" }] },
];

type Exercise = { id: string; name: string; video_url?: string | null; muscle_group?: string | null };

export function QuickTrainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", time: "", equipment: "" });
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [infoproduct, setInfoproduct] = useState<any>(null);

  const reset = () => { setStep(0); setAnswers({ goal: "", time: "", equipment: "" }); setExercises([]); setInfoproduct(null); };

  const pick = async (k: keyof Answers, v: string) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    if (step < 2) setStep((step + 1) as Step);
    else await resolve(next);
  };

  const resolve = async (a: Answers) => {
    setLoading(true);
    try {
      // mapear objetivo -> grupos musculares / categoria
      const tagMap: Record<string, string[]> = {
        fatburn: ["cardio", "funcional", "hiit"],
        strength: ["peito", "costas", "perna", "ombro"],
        mobility: ["mobilidade", "alongamento", "core"],
        cardio: ["cardio"],
      };
      const tags = tagMap[a.goal] || ["funcional"];
      const { data: ex } = await supabase
        .from("exercises")
        .select("id, name, video_url, muscle_group")
        .or(tags.map((t) => `muscle_group.ilike.%${t}%`).join(","))
        .limit(parseInt(a.time, 10) >= 45 ? 8 : 5);

      if (ex && ex.length >= 3) {
        setExercises(ex as Exercise[]);
        setStep(3);
      } else {
        // fallback infoproduto
        const { data: prod } = await supabase
          .from("dynamic_offers" as any)
          .select("*")
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        setInfoproduct(prod);
        setStep(3);
      }
    } catch (e) {
      toast.error("Não foi possível montar o treino agora.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-5 max-h-[90vh] overflow-y-auto"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Treino Rápido</p>
              <p className="font-display text-xl">Monte em 10s</p>
            </div>
            <button onClick={() => { onClose(); reset(); }} className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="py-10 flex flex-col items-center text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-sm">Montando seu treino...</p>
            </div>
          )}

          {!loading && step < 3 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-2">Pergunta {step + 1} de 3</p>
              <p className="font-display text-lg mb-4">{QS[step].label}</p>
              <div className="space-y-2">
                {QS[step].opts.map((o) => (
                  <button key={o.v} onClick={() => pick(QS[step].key as keyof Answers, o.v)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] py-3 px-4 text-left hover:border-primary/60 hover:bg-primary/[0.06] transition">
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && step === 3 && exercises.length > 0 && (
            <div>
              <p className="font-display text-lg mb-1">Seu treino está pronto</p>
              <p className="text-xs text-muted-foreground mb-3">{exercises.length} exercícios • {answers.time} min</p>
              <ul className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {exercises.map((e, i) => (
                  <li key={e.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{e.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{e.muscle_group || "—"}</p>
                    </div>
                    {e.video_url && <a href={e.video_url} target="_blank" rel="noreferrer" className="text-primary"><Play className="w-4 h-4" /></a>}
                  </li>
                ))}
              </ul>
              <button onClick={() => { toast.success("Treino iniciado"); onClose(); reset(); }}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3">
                Iniciar agora
              </button>
            </div>
          )}

          {!loading && step === 3 && exercises.length === 0 && (
            <div>
              <p className="font-display text-lg mb-1">Treino especial</p>
              <p className="text-sm text-muted-foreground mb-3">
                Encontramos um plano premium ideal para o seu objetivo.
              </p>
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] p-4 mb-4">
                <p className="font-display text-lg">{infoproduct?.title || "Protocolo Personalizado"}</p>
                <p className="text-xs text-muted-foreground mt-1">{infoproduct?.description || "Plano completo com vídeos e progressão semanal."}</p>
                <p className="font-data text-primary text-2xl mt-3">
                  R$ {infoproduct?.price ?? "49"}<span className="text-xs text-muted-foreground">/único</span>
                </p>
              </div>
              <button onClick={() => navigate(`/9fit/checkout/${infoproduct?.id || "quicktrain"}`)}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Desbloquear treino
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
