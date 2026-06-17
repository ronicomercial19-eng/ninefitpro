import { useState } from "react";
import { ChevronLeft, Brain, Check, Minus, Plus, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { useAdaptiveAdjustment } from "@/hooks/useAdaptiveAdjustment";

export default function NineFitAjusteTreino() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const workoutName = params.get("workout") ?? "Treino de Hoje • Peito + Tríceps";
  const [mode, setMode] = useState<"smart" | "copilot">("smart");
  const [intensity, setIntensity] = useState(82);
  const [fatigueAdj, setFatigueAdj] = useState(-1);
  const { adjustment, loading, generate, apply } = useAdaptiveAdjustment();

  const runCopilot = async () => {
    const r = await generate({ workoutName, workoutType: "hipertrofia" });
    if (r) {
      setIntensity(r.intensityPct);
      toast.success("FitCopilot ajustou seu treino");
    }
  };

  const onSave = async () => {
    if (mode === "copilot") await apply();
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (userId) {
        const { data: ath } = await supabase
          .from("athletes").select("id").eq("user_id", userId).maybeSingle();
        const athleteId = (ath as any)?.id;
        if (athleteId) {
          const today = new Date().toISOString().slice(0, 10);
          const changes = {
            workout_name: workoutName,
            intensity_pct: intensity,
            fatigue_adjustment: fatigueAdj,
            mode,
            applied_at: new Date().toISOString(),
          };
          const { error } = await supabase.rpc("aplicar_ajuste_treino_dia" as any, {
            p_athlete_id: athleteId,
            p_data: today,
            p_changes: changes,
          });
          if (error) console.warn("[AjusteTreino] RPC error", error);
        }
      }
    } catch (e) {
      console.warn("[AjusteTreino] save failed", e);
    }
    toast.success("Ajustes salvos");
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      <div className="px-4 pt-6 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">AJUSTE DE TREINO</p>
          <h1 className="text-2xl font-display tracking-tight">{workoutName}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-4 mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode("smart")}
          className={`py-3 rounded-2xl font-semibold border ${
            mode === "smart" ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground"
          }`}
        >
          SmartTreino
        </button>
        <button
          onClick={() => {
            setMode("copilot");
            if (!adjustment && !loading) runCopilot();
          }}
          className={`py-3 rounded-2xl font-semibold border flex items-center justify-center gap-2 ${
            mode === "copilot" ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground"
          }`}
        >
          FitCopilot / IA
          <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 text-[9px] flex items-center justify-center text-primary">AI</span>
        </button>
      </div>

      {/* Card */}
      <div className="mx-4 mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_30px_80px_-40px_hsl(var(--primary)/0.5)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary text-xs font-semibold">Supino Reto • 4x8-10</p>
            <p className="text-[11px] text-muted-foreground mt-1">Peso atual sugerido: 92.5 kg</p>
          </div>
          <p className="text-2xl font-display text-primary">3/4</p>
        </div>

        {/* Intensidade */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Intensidade</span>
            <span className="text-2xl font-bold text-primary">{intensity}%</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full mt-2 accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Leve</span>
            <span>Máxima</span>
          </div>
        </div>

        {/* Fadiga */}
        <div className="mt-5">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Fadiga</span>
          <div className="mt-2 flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
                <circle cx="18" cy="18" r="15" stroke="hsl(var(--primary))" strokeWidth="3" fill="none"
                  strokeDasharray="60 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold">65%</span>
                <span className="text-[8px] text-muted-foreground">Moderada</span>
              </div>
            </div>
            <div className="flex-1 text-xs">
              <p className="text-muted-foreground">Ajuste de fadiga</p>
              <p className="font-semibold">{fatigueAdj > 0 ? "+" : ""}{fatigueAdj} nível</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFatigueAdj((v) => v - 1)} className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => setFatigueAdj((v) => v + 1)} className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sugestão IA */}
      <div className="mx-4 mt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Sugestões IA</p>
        <div className="rounded-2xl border border-primary/40 bg-primary/[0.04] p-4">
          <div className="flex items-center justify-between">
            <p className="text-primary text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4" /> FitCopilot recomenda:
            </p>
            <button
              onClick={async () => {
                if (!adjustment) await runCopilot();
                await apply();
                toast.success("Recomendações aplicadas");
              }}
              className="text-[11px] uppercase tracking-widest text-primary border border-primary/40 rounded-full px-3 py-1 flex items-center gap-1"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Aplicar
            </button>
          </div>
          <div className="mt-3 text-sm text-foreground/85 italic leading-relaxed">
            {loading && "Analisando bio + skills ativas…"}
            {!loading && adjustment && (
              <>
                {adjustment.rationale}
                {adjustment.swaps?.[0] && (
                  <p className="mt-2 not-italic text-[12px] text-muted-foreground">
                    Trocar <b>{adjustment.swaps[0].from}</b> por <b>{adjustment.swaps[0].to}</b> — {adjustment.swaps[0].reason}
                  </p>
                )}
                <p className="mt-1 not-italic text-[12px] text-muted-foreground">
                  Previsão de recuperação: {adjustment.recoveryForecast}% amanhã.
                </p>
              </>
            )}
            {!loading && !adjustment && (
              <>Troque o Supino Inclinado por Crucifixo com halteres (-15% fadiga articular). Adicione 1 série de Tríceps Francês. Previsão de recuperação: 91% amanhã.</>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onSave}
        className="mx-4 mt-6 w-[calc(100%-2rem)] rounded-full bg-primary text-primary-foreground py-4 font-bold tracking-widest uppercase shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]"
      >
        Salvar Ajustes
      </button>

      <BottomNavigation />
    </div>
  );
}
