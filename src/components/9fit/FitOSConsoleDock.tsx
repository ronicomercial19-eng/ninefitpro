import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowUpRight,
  Target,
  Dumbbell,
  Compass,
  CalendarCheck,
  Sparkles,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NutritionTodaySummary } from "./NutritionTodaySummary";
import { DailyGoalCheckins } from "./DailyGoalCheckins";
import { HubFloatingMetrics } from "@/components/9fit/HubFloatingMetrics";
import { ActivationMissionCard } from "@/components/9fit/ActivationMissionCard";
import { HubWeeklyCounters } from "@/components/9fit/HubWeeklyCounters";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { WeeklyRadar3D } from "@/components/9fit/WeeklyRadar3D";
import { UpsellBanner } from "@/components/9fit/UpsellBanner";
import { UpcomingCommitments } from "./UpcomingCommitments";
import { DynamicOffers } from "@/components/9fit/DynamicOffers";

interface Props {
  weekly: { treinos: number; nutri: number; minutos: number };
  liveScoresVitals?: any;
  invalidateUserState: () => void;
  performancePlanTitle: string | null;
  breakdown: {
    treino: number | null;
    nutri: number | null;
    sono: number | null;
    mob: number | null;
    hidr: number | null;
  };
  protocolCount: number;
}

type ModuleKey = "metrics" | "activation" | "schedule" | "protocol" | "checkin" | "offers";

interface ModuleConfig {
  key: ModuleKey;
  tag: string;
  title: string;
  subtitle: string;
  statusText: string;
  icon: any;
}

// Padrão Nine Pro v2: UM foco por tela (Foco atual, com glow + número vazado).
// Todo o resto é "calmo": preto, borda neutra, ícone laranja, sem glow/pulso.
const label = "font-data text-[9px] uppercase tracking-[0.3em] text-primary/80";
const pillPrimary = "inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-95";
const pillGhost = "inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 active:scale-95";
const outlineStyle: React.CSSProperties = { WebkitTextStroke: "1.5px hsl(20 100% 50%)", color: "transparent" };

export function FitOSConsoleDock({
  weekly,
  liveScoresVitals,
  invalidateUserState,
  performancePlanTitle,
  breakdown,
  protocolCount,
}: Props) {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);

  const modules: Record<ModuleKey, ModuleConfig> = {
    activation: {
      key: "activation",
      tag: "METAS DO ATLETA",
      title: "Metas",
      subtitle: `Plano ativo: ${performancePlanTitle || "Defina seu objetivo"}`,
      statusText: "EM ANDAMENTO",
      icon: Target,
    },
    protocol: {
      key: "protocol",
      tag: "PRESCRIÇÃO NINE PRO",
      title: "Treinos",
      subtitle: `${protocolCount} conteúdos ativos cadastrados`,
      statusText: "PRESCRIÇÃO ATIVA",
      icon: Dumbbell,
    },
    metrics: {
      key: "metrics",
      tag: "ALIMENTAÇÃO DO DIA",
      title: "Dieta",
      subtitle: "Dieta, refeições e hidratação em um só lugar",
      statusText: "ABRIR DIÁRIO",
      icon: Activity,
    },
    schedule: {
      key: "schedule",
      tag: "PROGRAMAÇÃO DO DIA",
      title: "Radar 3D",
      subtitle: "Visão tridimensional da consistência neuromuscular",
      statusText: "REGISTROS",
      icon: Compass,
    },
    checkin: {
      key: "checkin",
      tag: "AGENDA DO ATLETA",
      title: "Compromissos",
      subtitle: "Aulas, avaliações e início de novas prescrições",
      statusText: "DISPONÍVEL",
      icon: CalendarCheck,
    },
    offers: {
      key: "offers",
      tag: "BENEFÍCIOS E UPGRADES",
      title: "Prime",
      subtitle: "Condições especiais e benefícios exclusivos do seu nível",
      statusText: "EXCLUSIVO",
      icon: Sparkles,
    },
  };

  const squircleKeys: ModuleKey[] = ["activation", "protocol", "metrics", "schedule", "checkin", "offers"];
  const currentMod = activeModule ? modules[activeModule] : null;
  const sessionsPct = Math.min(100, Math.max(0, (weekly.treinos / 5) * 100));

  return (
    <div className="w-full space-y-4">
      <HubFloatingMetrics vitals={liveScoresVitals} />
      <DailyGoalCheckins /><NutritionTodaySummary />

      {/* FOCO ATUAL — único card hero desta área (padrão TRIBOS) */}
      <motion.div
        onClick={() => setActiveModule("activation")}
        className="relative cursor-pointer overflow-hidden rounded-2xl border border-primary/20 bg-black p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsla(20,100%,50%,0.22),transparent_60%)]" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className={label}>Foco atual · FIT OS</span>
            <span className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">Ciclo em andamento</span>
          </div>

          <div>
            <h3 className="font-display text-xl font-black uppercase leading-tight tracking-tight text-foreground">
              {performancePlanTitle || "Defina seu objetivo"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {protocolCount > 0
                ? `${protocolCount} conteúdos atribuídos ainda não concluídos na Biblioteca. A rotina diária é acompanhada separadamente.`
                : "Nenhuma intervenção prescrita disponível."}
            </p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={label}>Sessões da semana</p>
              <p
                className="font-display font-black leading-none tracking-tighter"
                style={{ ...outlineStyle, fontSize: "clamp(56px, 20vw, 96px)" }}
              >
                {weekly.treinos}<span className="text-[0.45em]">/5</span>
              </p>
            </div>
            <span className={pillPrimary}>Acessar <ArrowUpRight className="h-3.5 w-3.5" /></span>
          </div>

          <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-primary transition-all duration-700" style={{ width: `${sessionsPct}%` }} />
          </div>
        </div>
      </motion.div>

      {/* COMANDOS & SINAIS — calmo: sem glow, sem pulso, ícone laranja */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className={label}>Comandos &amp; sinais</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {squircleKeys.map((key) => {
            const m = modules[key];
            const Icon = m.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveModule(key)}
                className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/60 p-3 text-center transition-colors hover:border-primary/40 active:scale-95"
              >
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="w-full truncate font-display text-xs font-black uppercase tracking-tight text-foreground">
                  {m.title}
                </span>
                <span className="mt-0.5 w-full truncate font-data text-[8px] uppercase tracking-widest text-muted-foreground">
                  {m.statusText}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SPLASH */}
      <AnimatePresence>
        {activeModule && currentMod && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModule(null)}
          >
            <motion.div
              className="relative my-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-primary/20 bg-black p-5 sm:p-6"
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsla(20,100%,50%,0.14),transparent_60%)]" />

              <button
                type="button"
                onClick={() => setActiveModule(null)}
                aria-label="Fechar painel"
                className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative z-10 mb-5 pr-8 pt-1">
                <p className={label}>{currentMod.tag}</p>
                <h3 className="mt-1 font-display text-xl font-black uppercase tracking-tight text-foreground">
                  {currentMod.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {currentMod.subtitle}
                </p>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto px-0.5 py-1">
                {activeModule === "metrics" && <NutritionTodaySummary interactive />}

                {activeModule === "activation" && (
                  <div className="space-y-3">
                    <ActivationMissionCard />
                    <div className="mt-3">
                      <HubWeeklyCounters
                        treinos={weekly.treinos}
                        nutri={weekly.nutri}
                        minutos={weekly.minutos}
                      />
                    </div>
                    {performancePlanTitle && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Plano ativo: <span className="font-medium text-white">{performancePlanTitle}</span>
                      </p>
                    )}
                  </div>
                )}

                {activeModule === "schedule" && (
                  <div className="space-y-4">
                    <DailyProtocol />
                    <div className="mt-4">
                      <WeeklyRadar3D current={breakdown} />
                    </div>
                    <div className="mt-4">
                      <UpsellBanner
                        context="hub_upsell"
                        storageKey="hub_after_protocol"
                        variant="amber"
                        headline="Desbloqueie protocolos premium e RON v9 completo"
                        cta="Testar 7 dias grátis"
                      />
                    </div>
                  </div>
                )}

                {activeModule === "protocol" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className={label}>Prescrição Nine Pro</span>
                        <span className="font-data text-xs font-bold text-white">{protocolCount} ativos</span>
                      </div>
                      <p className="font-display text-sm font-black uppercase tracking-tight text-white">
                        Seu plano personalizado de exercícios e intervenções
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Acesse a biblioteca de conteúdos prescritos para sua rotina neuromotora.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule(null);
                        navigate("/9fit/protocolo");
                      }}
                      className={`${pillPrimary} w-full justify-center`}
                    >
                      <span>Abrir tela completa do protocolo</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {activeModule === "checkin" && (
                  <div className="space-y-3">
                    <UpcomingCommitments />
                  </div>
                )}

                {activeModule === "offers" && (
                  <div className="space-y-3">
                    <DynamicOffers compact />
                  </div>
                )}
              </div>

              <div className="relative z-10 mt-5 flex justify-end border-t border-white/10 pt-4">
                <button type="button" onClick={() => setActiveModule(null)} className={pillGhost}>
                  Concluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
