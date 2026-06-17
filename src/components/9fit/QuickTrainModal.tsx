import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Play, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAthleteId } from "@/hooks/useAthleteId";

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

type Exercise = {
  id: string;
  name: string;
  video_url?: string | null;
  gif_url?: string | null;
  target_muscles?: string[] | null;
  sets?: number | string | null;
  reps_range?: string | null;
  rest_seconds?: number | null;
};

type Modelo = { name?: string; objective?: string; stimulus?: string };

export function QuickTrainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { athleteId } = useAthleteId();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({ goal: "", time: "", equipment: "" });
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [infoproduct, setInfoproduct] = useState<any>(null);
  const [offerSeen, setOfferSeen] = useState(false);
  const [showingOffer, setShowingOffer] = useState(false);

  const reset = () => {
    setStep(0); setAnswers({ goal: "", time: "", equipment: "" });
    setExercises([]); setModelos([]); setInfoproduct(null); setOfferSeen(false); setShowingOffer(false);
  };

  const pick = async (k: keyof Answers, v: string) => {
    const next = { ...answers, [k]: v };
    setAnswers(next);
    if (step < 2) setStep((step + 1) as Step);
    else await resolve(next);
  };

  const resolve = async (a: Answers) => {
    if (!athleteId) { toast.error("Perfil de atleta não encontrado"); return; }
    setLoading(true);
    try {
      // 1) Oferta antes do treino (não bloqueia)
      const { data: prod } = await supabase
        .from("monetization_offers" as any)
        .select("*")
        .eq("active", true)
        .or(`slug.eq.audience_49,goal.eq.${a.goal}`)
        .limit(1)
        .maybeSingle();
      setInfoproduct(prod);

      // 2) PRESCREVER TREINO RÁPIDO via RPC oficial
      const { data, error } = await supabase.rpc("prescrever_treino_rapido" as any, {
        p_athlete_id: athleteId,
        p_objetivo: a.goal,
        p_tempo_min: parseInt(a.time, 10),
        p_equipamento: a.equipment,
      });
      if (error) throw error;

      const payload: any = data || {};
      setModelos((payload.modelos || []) as Modelo[]);
      setExercises((payload.exercises || []) as Exercise[]);

      setShowingOffer(!!prod);
      setStep(3);
    } catch (e: any) {
      console.error("[QuickTrain] prescrever_treino_rapido:", e);
      toast.error(e?.message || "Não foi possível montar o treino agora.");
    } finally {
      setLoading(false);
    }
  };

  const completeWorkout = async () => {
    try {
      if (athleteId) {
        await supabase.from("workout_executions" as any).insert({
          athlete_id: athleteId,
          workout_date: new Date().toISOString().split("T")[0],
          phase_name: "quick",
          status: "completed",
          duration_minutes: parseInt(answers.time, 10) || 30,
          notes: `quick_workout · ${answers.goal} · ${answers.equipment}`,
          metadata: { answers, exercises: exercises.map((e) => e.id), modelos },
        } as any);
        await supabase.from("athlete_profile_snapshots" as any).insert({
          athlete_id: athleteId,
          source: "workout_complete",
          snapshot_data: { type: "quick", date: new Date().toISOString(), duration: parseInt(answers.time, 10), exercises: exercises.length },
        } as any);
        await supabase.rpc("fn_award_xp" as any, {
          p_athlete_id: athleteId,
          p_amount: 50,
          p_source: "quick_workout",
          p_metadata: answers as any,
        });
        toast.success("Treino concluído! +50 XP");
      }
    } catch (e) {
      console.error("[QuickTrain] complete:", e);
      toast.success("Treino iniciado");
    }
    onClose(); reset();
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

          {!loading && step === 3 && showingOffer && !offerSeen && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">Oferta para seu objetivo</p>
              <p className="font-display text-lg mb-3">Aceleramos sua meta de {answers.goal}</p>
              <div className="rounded-2xl border border-primary/40 bg-primary/[0.06] p-4 mb-4">
                <p className="font-display text-lg">{infoproduct?.title || "Protocolo Personalizado"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {infoproduct?.description || "Plano completo com vídeos, progressão semanal e ajustes pelo PDI."}
                </p>
                <p className="font-data text-primary text-2xl mt-3">
                  R$ {((infoproduct?.price_cents ?? infoproduct?.price ?? 4900) / (infoproduct?.price_cents ? 100 : 1)).toFixed(0)}
                  <span className="text-xs text-muted-foreground">/mês</span>
                </p>
              </div>
              <div className="space-y-2">
                <a href="https://buy.stripe.com/test_4gMfZg0NK3gn2NMahkgbm03" target="_blank" rel="noreferrer"
                  className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> Quero conhecer
                </a>
                <button onClick={() => { setOfferSeen(true); setShowingOffer(false); }}
                  className="w-full rounded-full border border-white/15 bg-transparent text-foreground py-3 text-sm hover:bg-white/[0.04]">
                  Agora não — liberar treino do dia
                </button>
              </div>
            </div>
          )}

          {!loading && step === 3 && !showingOffer && exercises.length > 0 && (
            <div>
              {modelos.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Modelo</p>
                  <p className="font-display text-base">{modelos[0]?.name || "Treino personalizado"}</p>
                  <p className="text-xs text-muted-foreground">{modelos[0]?.stimulus || modelos[0]?.objective}</p>
                </div>
              )}
              <p className="font-display text-lg mb-1">Seu treino está pronto</p>
              <p className="text-xs text-muted-foreground mb-3">{exercises.length} exercícios • {answers.time} min</p>
              <ul className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {exercises.map((e, i) => (
                  <li key={e.id || i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 text-primary grid place-items-center text-xs font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{e.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(e.sets || "3")}×{e.reps_range || "10-12"}{e.rest_seconds ? ` · ${e.rest_seconds}s` : ""}
                        {e.target_muscles?.length ? ` · ${e.target_muscles.slice(0,2).join(", ")}` : ""}
                      </p>
                    </div>
                    {(e.video_url || e.gif_url) && (
                      <a href={e.video_url || e.gif_url!} target="_blank" rel="noreferrer" className="text-primary">
                        <Play className="w-4 h-4" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              <button onClick={completeWorkout}
                className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3">
                Concluir treino (+50 XP)
              </button>
            </div>
          )}

          {!loading && step === 3 && !showingOffer && exercises.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Não conseguimos montar um treino para esses filtros. Tente outro objetivo.
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
