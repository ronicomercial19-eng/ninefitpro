import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check } from "lucide-react";
import { useUserParameters, UserParameters } from "@/hooks/useUserParameters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";


interface Props { open: boolean; onClose: () => void; onComplete?: () => void; }

type Step = { key: keyof UserParameters; label: string; sub?: string;
  type: "choice" | "scale" | "multi"; opts?: { v: string; l: string }[]; max?: number };

const STEPS: Step[] = [
  { key: "goal", label: "Qual seu objetivo principal?", type: "choice", opts: [
    { v: "performance", l: "Performance" }, { v: "aesthetics", l: "Estética" },
    { v: "longevity", l: "Longevidade" }, { v: "recomposition", l: "Recomposição" }] },
  { key: "recovery_rate", label: "Como é sua recuperação?", sub: "Quanto tempo após um treino pesado você se sente 100%?", type: "choice", opts: [
    { v: "fast", l: "Rápida (≤24h)" }, { v: "medium", l: "Média (24-48h)" }, { v: "slow", l: "Lenta (>48h)" }] },
  { key: "volume_tolerance", label: "Tolerância a volume", sub: "1 = baixa, 10 = altíssima", type: "scale", max: 10 },
  { key: "peak_window", label: "Quando você performa melhor?", type: "choice", opts: [
    { v: "morning", l: "Manhã" }, { v: "afternoon", l: "Tarde" }, { v: "night", l: "Noite" }] },
  { key: "stress_sensitivity", label: "Sensibilidade ao estresse", sub: "1 = nada me abala, 10 = muito sensível", type: "scale", max: 10 },
  { key: "discomfort_tolerance", label: "Tolerância a desconforto no treino", type: "choice", opts: [
    { v: "aggressive", l: "Agressiva — empurro até o limite" },
    { v: "moderate", l: "Moderada" },
    { v: "conservative", l: "Conservadora — priorizo segurança" }] },
  { key: "time_horizon", label: "Horizonte de tempo (semanas)", sub: "Quantas semanas você tem para sua meta?", type: "scale", max: 52 },
  { key: "injury_zones", label: "Zonas com histórico de lesão", sub: "Selecione todas que se aplicam", type: "multi", opts: [
    { v: "knee", l: "Joelho" }, { v: "shoulder", l: "Ombro" }, { v: "back", l: "Costas" },
    { v: "elbow", l: "Cotovelo" }, { v: "ankle", l: "Tornozelo" }, { v: "hip", l: "Quadril" }] },
  { key: "dietary_restrictions", label: "Restrições alimentares", type: "multi", opts: [
    { v: "vegan", l: "Vegano" }, { v: "vegetarian", l: "Vegetariano" },
    { v: "lactose", l: "Lactose" }, { v: "gluten", l: "Glúten" }, { v: "none", l: "Nenhuma" }] },
];

export function PDIWizard({ open, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const { params, save } = useUserParameters();
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState<Partial<UserParameters>>({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;
  const step = STEPS[i];
  const value = (draft[step.key] ?? params[step.key]) as any;

  const next = async () => {
    if (i < STEPS.length - 1) { setI(i + 1); return; }
    setSaving(true);
    const { error } = await save(draft);
    if (!error && user?.id) {
      try {
        const { data: link } = await (supabase as any)
          .from("athlete_auth_link").select("athlete_id").eq("user_id", user.id).maybeSingle();
        let athleteId = (link as any)?.athlete_id ?? null;
        if (!athleteId) {
          const { data: ath } = await supabase.from("athletes").select("id").eq("user_id", user.id).maybeSingle();
          athleteId = ath?.id ?? null;
        }
        if (athleteId) {
          await supabase.from("athlete_pdi_history" as any).insert({
            athlete_id: athleteId,
            pdi_data: { ...params, ...draft } as any,
          } as any);
        }
      } catch (e) { console.warn("[PDIWizard] history:", e); }
    }
    setSaving(false);
    if (error) return toast.error("Erro ao salvar PDI");
    toast.success("PDI calibrado — o sistema aprendeu seu perfil");
    onComplete?.(); onClose();
  };

  const set = (v: any) => setDraft((d) => ({ ...d, [step.key]: v }));
  const toggleMulti = (v: string) => {
    const arr: string[] = Array.isArray(value) ? [...value] : [];
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/85 flex items-end sm:items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-5 max-h-[90vh] overflow-y-auto"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Calibrar IA · PDI</p>
              <p className="text-xs text-muted-foreground">Pergunta {i + 1} de {STEPS.length}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-1 rounded-full bg-white/5 mb-5 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
          </div>

          <p className="font-display text-lg mb-1">{step.label}</p>
          {step.sub && <p className="text-xs text-muted-foreground mb-4">{step.sub}</p>}

          {step.type === "choice" && (
            <div className="space-y-2 mb-5">
              {step.opts!.map((o) => (
                <button key={o.v} onClick={() => set(o.v)}
                  className={`w-full rounded-xl border py-3 px-4 text-left transition ${value === o.v ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.02] hover:border-primary/60"}`}>
                  {o.l}
                </button>
              ))}
            </div>
          )}

          {step.type === "scale" && (
            <div className="mb-5">
              <input type="range" min={1} max={step.max} value={Number(value) || 1}
                onChange={(e) => set(Number(e.target.value))}
                className="w-full accent-primary" />
              <p className="text-center font-display text-3xl text-primary mt-2">{Number(value) || 1}</p>
            </div>
          )}

          {step.type === "multi" && (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {step.opts!.map((o) => {
                const active = Array.isArray(value) && value.includes(o.v);
                return (
                  <button key={o.v} onClick={() => toggleMulti(o.v)}
                    className={`rounded-xl border py-2.5 px-3 text-sm transition flex items-center gap-2 ${active ? "border-primary bg-primary/10" : "border-white/10 bg-white/[0.02]"}`}>
                    {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    {o.l}
                  </button>
                );
              })}
            </div>
          )}

          <button onClick={next} disabled={saving}
            className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {i < STEPS.length - 1 ? <>Próxima <ArrowRight className="w-4 h-4" /></> : (saving ? "Salvando..." : "Concluir calibração")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
