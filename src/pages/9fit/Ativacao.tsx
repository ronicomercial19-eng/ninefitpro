import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Rocket, Sparkles, ChevronRight, Trophy } from "lucide-react";
import { ACTIVATION_EVENTS, useActivationProgress, type ActivationKey } from "@/hooks/useActivationProgress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROUTE_BY_KEY: Record<ActivationKey, string> = {
  profile_complete: "/9fit/profile",
  first_assessment: "/9fit/onboarding",
  first_plan: "/9fit/train",
  first_workout: "/9fit/train",
  hub_engagement: "/9fit/hub",
  streak_7d: "/9fit/hub",
};

const CTA_BY_KEY: Record<ActivationKey, string> = {
  profile_complete: "Completar perfil",
  first_assessment: "Fazer avaliação",
  first_plan: "Gerar meu plano",
  first_workout: "Iniciar treino",
  hub_engagement: "Abrir Hub",
  streak_7d: "Ver progresso",
};

const XP_BY_KEY: Record<ActivationKey, number> = {
  profile_complete: 50,
  first_assessment: 100,
  first_plan: 150,
  first_workout: 200,
  hub_engagement: 75,
  streak_7d: 300,
};

// Permitir marcação manual em missões que não têm gatilho automático claro
const SELF_MARK: ActivationKey[] = ["hub_engagement"];

export default function Ativacao() {
  const navigate = useNavigate();
  const { completed, percent, done, total, next, loading, mark } = useActivationProgress();
  const totalXp = ACTIVATION_EVENTS.reduce((acc, e) => acc + (completed.has(e.key) ? XP_BY_KEY[e.key] : 0), 0);
  const maxXp = ACTIVATION_EVENTS.reduce((acc, e) => acc + XP_BY_KEY[e.key], 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-card border border-border grid place-items-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-black">Ativação · 14 dias</p>
          <h1 className="font-display text-xl italic">Sua jornada inicial</h1>
        </div>
      </header>

      {/* Hero progresso */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 rounded-3xl p-6 relative overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/[0.18] via-card/60 to-card/40 backdrop-blur-xl"
      >
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/30 grid place-items-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Progresso geral</p>
              <p className="font-display text-3xl tabular-nums leading-none mt-1">
                {done}<span className="text-base text-muted-foreground">/{total}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">XP de ativação</p>
            <p className="font-display text-2xl text-primary tabular-nums">{totalXp}<span className="text-xs text-muted-foreground">/{maxXp}</span></p>
          </div>
        </div>

        <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary via-primary to-primary/70 shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
          />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{percent}% completo</p>
      </motion.section>

      {/* Próxima missão */}
      {next && (
        <section className="px-4 mt-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> Próxima missão
          </p>
          <button
            onClick={() => navigate(ROUTE_BY_KEY[next.key])}
            className="w-full rounded-2xl p-4 bg-primary/[0.12] border border-primary/30 hover:bg-primary/[0.18] transition flex items-center gap-3 text-left"
          >
            <div className="flex-1">
              <p className="font-semibold text-foreground">{next.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Recompensa: +{XP_BY_KEY[next.key]} XP · meta dia {next.day}</p>
            </div>
            <span className="text-xs font-bold text-primary">{CTA_BY_KEY[next.key]}</span>
            <ChevronRight className="w-4 h-4 text-primary" />
          </button>
        </section>
      )}

      {/* Lista de missões */}
      <section className="px-4 mt-6 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold mb-1">Todas as missões</p>
        {loading ? (
          <div className="h-32 surface-card animate-pulse" />
        ) : (
          ACTIVATION_EVENTS.map((ev) => {
            const isDone = completed.has(ev.key);
            return (
              <div
                key={ev.key}
                className={cn(
                  "surface-card p-4 flex items-center gap-3 transition",
                  isDone && "opacity-60"
                )}
              >
                <div className={cn(
                  "w-9 h-9 rounded-full border flex items-center justify-center shrink-0",
                  isDone ? "bg-primary border-primary" : "border-white/20 bg-white/[0.04]"
                )}>
                  {isDone ? <Check className="w-4 h-4 text-primary-foreground" /> : <span className="text-[10px] font-black text-muted-foreground">d{ev.day}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", isDone && "line-through text-muted-foreground")}>{ev.label}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">+{XP_BY_KEY[ev.key]} XP · meta dia {ev.day}</p>
                </div>
                {!isDone && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => navigate(ROUTE_BY_KEY[ev.key])}>
                      {CTA_BY_KEY[ev.key]}
                    </Button>
                    {SELF_MARK.includes(ev.key) && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await mark(ev.key);
                        toast.success(`+${XP_BY_KEY[ev.key]} XP de ativação`);
                      }}>
                        <Check className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Reward final */}
      {done >= total && (
        <section className="px-4 mt-6">
          <div className="rounded-2xl p-5 border border-primary/40 bg-primary/[0.1] flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <div>
              <p className="font-display text-lg">Ativação completa</p>
              <p className="text-xs text-muted-foreground">Você desbloqueou o protocolo Elite Bio Hacking.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
