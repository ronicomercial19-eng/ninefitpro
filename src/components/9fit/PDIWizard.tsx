import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check } from "lucide-react";
import { useUserParameters, UserParameters } from "@/hooks/useUserParameters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';


interface Props { open: boolean; onClose: () => void; onComplete?: () => void; detailed?: boolean; }

type Step = { key: keyof UserParameters; label: string; sub?: string;
  type: "choice" | "scale" | "multi"; opts?: { v: string; l: string }[]; max?: number };

const QUESTION_BANK: Step[] = [
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
    { v: "elbow", l: "Cotovelo" }, { v: "ankle", l: "Tornozelo" }, { v: "hip", l: "Quadril" }, { v: "none", l: "Nenhuma" }] },
  { key: "dietary_restrictions", label: "Restrições alimentares", type: "multi", opts: [
    { v: "vegan", l: "Vegano" }, { v: "vegetarian", l: "Vegetariano" },
    { v: "lactose", l: "Lactose" }, { v: "gluten", l: "Glúten" }, { v: "none", l: "Nenhuma" }] },
];

export function PDIWizard({ open, onClose, onComplete, detailed = false }: Props) {
  const STEPS = detailed ? QUESTION_BANK : QUESTION_BANK.filter(step => ['goal','peak_window','time_horizon','injury_zones','dietary_restrictions'].includes(step.key));
  const { params, reload, loading, error: loadError } = useUserParameters();
  const [i, setI] = useState(0);
  const [draft, setDraft] = useState<Partial<UserParameters>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setI(0); setDraft({}); } }, [open]);

  if (!open) return null;
  const step = STEPS[i];
  const value = draft[step.key] ?? params[step.key];

  const next = async () => {
    if (saving || loading || loadError) return;
    const confirmed = { ...draft, [step.key]: value };
    setDraft(confirmed);
    if (i < STEPS.length - 1) { setI(i + 1); return; }
    setSaving(true);
    const clean = { ...confirmed, injury_zones: (confirmed.injury_zones || []).filter(v => v !== 'none'), dietary_restrictions: (confirmed.dietary_restrictions || []).filter(v => v !== 'none') };
    const { error } = await supabase.rpc('fn_save_pdi' as any, { p_patch: clean, p_complete: true });
    setSaving(false);
    if (error) return toast.error("Erro ao salvar PDI");
    await reload();
    window.dispatchEvent(new Event('9fit:profile-updated'));
    toast.success("Sua ficha foi confirmada e continuará acompanhando sua rotina");
    onComplete?.(); onClose();
  };

  const set = (v: UserParameters[typeof step.key]) => setDraft((d) => ({ ...d, [step.key]: v }));
  const toggleMulti = (v: string) => {
    const arr: string[] = Array.isArray(value) ? [...value] : [];
    set(v === 'none' ? ['none'] : arr.includes(v) ? arr.filter((x) => x !== v) : [...arr.filter(x => x !== 'none'), v]);
  };

  return (
    <AnimatePresence>
      <Dialog open={open} onOpenChange={value => { if (!value && !saving) onClose(); }}>
        <DialogContent className="max-w-md p-0 border-primary/40 [&>button]:hidden">
        <motion.div className="w-full max-w-md rounded-3xl border border-primary/40 bg-card p-5 max-h-[90vh] overflow-y-auto"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <DialogTitle className="text-[10px] uppercase tracking-widest text-primary font-bold">Minha ficha · PDI</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">Pergunta {i + 1} de {STEPS.length}</DialogDescription>
            </div>
            <button disabled={saving} aria-label="Fechar minha ficha" onClick={onClose} className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-1 rounded-full bg-white/5 mb-5 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
          </div>

          <p className="font-display text-lg mb-1">{step.label}</p>
          {loading && <p role="status" className="text-xs text-muted-foreground">Lendo sua ficha…</p>}
          {loadError && <button className="text-xs text-destructive" onClick={() => void reload()}>{loadError}</button>}
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

          {i > 0 && <button disabled={saving} onClick={() => setI(i - 1)} className="mb-3 text-xs text-muted-foreground">Voltar</button>}
          <button onClick={next} disabled={saving || loading || !!loadError}
            className="w-full rounded-full bg-primary text-primary-foreground font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {i < STEPS.length - 1 ? <>Confirmar e continuar <ArrowRight className="w-4 h-4" /></> : (saving ? "Salvando..." : "Confirmar minha ficha")}
          </button>
        </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}

