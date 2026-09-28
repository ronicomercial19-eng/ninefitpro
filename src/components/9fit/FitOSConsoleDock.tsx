import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ArrowUpRight,
  Target,
  Dumbbell,
  Compass,
  CalendarCheck,
  Sparkles,
  Flame,
  Activity,
  Heart,
  Smile,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTiltCard } from "@/hooks/useTiltCard";
import { HubFloatingMetrics } from "@/components/9fit/HubFloatingMetrics";
import { QuickMoodInput } from "@/components/9fit/QuickMoodInput";
import { ActivationMissionCard } from "@/components/9fit/ActivationMissionCard";
import { HubWeeklyCounters } from "@/components/9fit/HubWeeklyCounters";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { WeeklyRadar3D } from "@/components/9fit/WeeklyRadar3D";
import { UpsellBanner } from "@/components/9fit/UpsellBanner";
import { QuickCheckIn } from "@/components/9fit/QuickCheckIn";
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
  telemetryBadge: string;
  icon: any;
  accentColor: string;
  pulseColor: string;
}

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
      subtitle: `Plano ativo: ${performancePlanTitle || "Emagrecimento (plano ativo)"}`,
      statusText: "EM ANDAMENTO",
      telemetryBadge: "Missões Ativas",
      icon: Target,
      accentColor: "#FF6600",
      pulseColor: "#FF6600",
    },
    protocol: {
      key: "protocol",
      tag: "PRESCRIÇÃO NINE PRO",
      title: "Treinos",
      subtitle: `${protocolCount || 4} conteúdos ativos cadastrados`,
      statusText: "PRESCRIÇÃO ATIVA",
      telemetryBadge: `${protocolCount || 4} Ativos`,
      icon: Dumbbell,
      accentColor: "#10B981",
      pulseColor: "#10B981",
    },
    metrics: {
      key: "metrics",
      tag: "MÉTRICAS SEMANAIS",
      title: "Dieta",
      subtitle: `Treino ${weekly.treinos} · Nutri ${weekly.nutri} · Move ${weekly.minutos}min`,
      statusText: "SINCRONIZADO",
      telemetryBadge: `T:${weekly.treinos} · N:${weekly.nutri} · M:${weekly.minutos}m`,
      icon: Activity,
      accentColor: "#10B981",
      pulseColor: "#10B981",
    },
    schedule: {
      key: "schedule",
      tag: "PROGRAMAÇÃO DO DIA",
      title: "Radar 3D",
      subtitle: "Visão tridimensional da consistência neuromuscular",
      statusText: "CALIBRADO",
      telemetryBadge: "Radar 3D Ativo",
      icon: Compass,
      accentColor: "#00E5FF",
      pulseColor: "#00E5FF",
    },
    checkin: {
      key: "checkin",
      tag: "AGENDA E PRESENÇA",
      title: "Check-in de Aula",
      subtitle: "Confirmação rápida e reserva de vaga guiada",
      statusText: "DISPONÍVEL",
      telemetryBadge: "Reserva Ágil",
      icon: CalendarCheck,
      accentColor: "#3B82F6",
      pulseColor: "#3B82F6",
    },
    offers: {
      key: "offers",
      tag: "BENEFÍCIOS E UPGRADES",
      title: "Prime",
      subtitle: "Condições especiais e benefícios exclusivos do seu nível",
      statusText: "EXCLUSIVO",
      telemetryBadge: "Nível Liberado",
      icon: Sparkles,
      accentColor: "#A855F7",
      pulseColor: "#A855F7",
    },
  };

  const squircleKeys: ModuleKey[] = ["activation", "protocol", "metrics", "schedule", "checkin", "offers"];
  const currentMod = activeModule ? modules[activeModule] : null;

  return (
    <div className="w-full space-y-4">
      {/* 1. FOCO DO MOMENTO: CARD HERO COM OBJETIVO CLARO E DINÂMICA VISUAL (Estrutura do print IMG_0115) */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25 }}
        onClick={() => setActiveModule("activation")}
        className="hub-card-interactive relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#161720] via-[#0e0f14] to-[#08080b] p-4 sm:p-5 shadow-2xl shadow-black/70 cursor-pointer group"
      >
        {/* Halo ambiente dinâmico */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-[#FF6600]/15 blur-3xl pointer-events-none group-hover:bg-[#FF6600]/25 transition-all" />

        {/* Hairline luminoso superior */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6600] to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10 space-y-3">
          {/* Top header row: Eyebrow + Status Badge */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono tracking-[0.25em] font-bold text-[#FF6600] uppercase">
              FOCO ATUAL · FIT OS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              CICLO EM ANDAMENTO
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight font-display">
              {performancePlanTitle || "Emagrecimento (plano ativo)"}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {protocolCount > 0
                ? `${protocolCount} intervenções prescritas prontas para execução hoje.`
                : "4 intervenções prescritas prontas para execução hoje."}
            </p>
          </div>

          {/* Botão de Ação Acessar (Pill button conforme print) */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#FF6600] to-[#FF8533] text-white font-bold text-xs shadow-lg shadow-orange-950/50 group-hover:brightness-110 active:scale-95 transition-all">
              <span>Acessar</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Barra de progresso horizontal completa */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3 text-[11px] font-mono text-neutral-400">
            <span className="text-neutral-300 font-medium shrink-0">Consistência do ciclo:</span>
            <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden mx-2">
              <div
                className="h-full bg-gradient-to-r from-[#FF6600] via-amber-400 to-emerald-400 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(25, ((weekly.treinos || 6) / 5) * 100))}%` }}
              />
            </div>
            <span className="text-white font-bold shrink-0">{weekly.treinos || 6}/5 sessões</span>
          </div>
        </div>
      </motion.div>

      {/* 2. DOCK DE AÇÕES & MÓDULOS ORGÂNICOS (SQUIRCLES TÁTEIS - Inspirado em IMG_0115.png) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#FF6600] uppercase font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            COMANDOS & SINAIS
          </span>
          <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
            TOQUE PARA ABRIR EM SPLASH
          </span>
        </div>

        {/* Grid de 6 squircles estilizados em 3 colunas conforme print */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {squircleKeys.map((key) => {
            const m = modules[key];
            const Icon = m.icon;
            return (
              <motion.button
                key={key}
                type="button"
                whileHover={{ y: -3, scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setActiveModule(key)}
                className="hub-card-interactive squircle-interactive relative flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#14151b] to-[#0a0a0d] shadow-lg shadow-black/50 group text-center cursor-pointer overflow-hidden"
              >
                {/* Halo sutil interno na cor do módulo */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-25 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${m.accentColor}, transparent 70%)`,
                  }}
                />

                {/* Indicador pulsante dinâmico individual */}
                <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: m.pulseColor }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                    style={{ backgroundColor: m.pulseColor }}
                  />
                </span>

                {/* Ícone com squircle vibrante */}
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110 shadow-md"
                  style={{
                    backgroundColor: `${m.accentColor}18`,
                    border: `1px solid ${m.accentColor}35`,
                    color: m.accentColor,
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Título do squircle */}
                <span className="text-[11px] sm:text-xs font-bold text-white font-display leading-tight truncate w-full">
                  {m.title}
                </span>

                {/* Badge de status tátil */}
                <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-tight mt-0.5 truncate w-full">
                  {m.statusText}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 3. TELA SPLASH MODAL OVERLAY (Com todos os componentes e ferramentas preservados) */}
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
              className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#090909] p-5 sm:p-6 shadow-2xl shadow-black flex flex-col my-auto"
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hairline luminoso superior do Splash em Laranja Nine Pro */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px] opacity-80"
                style={{
                  background: `linear-gradient(90deg, transparent, ${currentMod.accentColor}, transparent)`,
                }}
              />

              {/* Botão de Fechar */}
              <button
                type="button"
                onClick={() => setActiveModule(null)}
                aria-label="Fechar painel"
                className="absolute top-4 right-4 w-8 h-8 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Cabeçalho do Splash */}
              <div className="mb-5 pt-1 pr-8">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase"
                    style={{ color: currentMod.accentColor }}
                  >
                    {currentMod.tag}
                  </span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: currentMod.pulseColor }}
                    />
                    <span className="text-[8px] font-mono uppercase text-neutral-300">
                      {currentMod.statusText}
                    </span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight font-display">
                  {currentMod.title}
                </h3>
                <p className="text-xs text-neutral-400 mt-1 font-normal leading-relaxed">
                  {currentMod.subtitle}
                </p>
              </div>

              {/* Conteúdo Dinâmico do Módulo */}
              <div className="flex-1 overflow-y-auto px-0.5 py-1">
                {activeModule === "metrics" && (
                  <div className="space-y-3">
                    <HubFloatingMetrics vitals={liveScoresVitals} />
                    <div className="mt-3">
                      <QuickMoodInput onLogged={invalidateUserState} />
                    </div>
                  </div>
                )}

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
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Plano ativo: <span className="text-white font-medium">{performancePlanTitle}</span>
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
                    <div className="rounded-xl border border-[#FF6600]/25 bg-[#FF6600]/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono tracking-widest text-[#FF6600] font-bold uppercase">
                          PRESCRIÇÃO NINE PRO
                        </span>
                        <span className="text-xs font-mono font-bold text-white">
                          {protocolCount} Ativos
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white font-display">
                        Seu plano personalizado de exercícios e intervenções
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Acesse a biblioteca de conteúdos prescritos para sua rotina neuromotora.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule(null);
                        navigate("/9fit/protocolo");
                      }}
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 bg-[#FF6600] hover:bg-[#FF6600]/90 text-white shadow-lg shadow-[#FF6600]/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Abrir Tela Completa do Protocolo</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeModule === "checkin" && (
                  <div className="space-y-3">
                    <QuickCheckIn />
                  </div>
                )}

                {activeModule === "offers" && (
                  <div className="space-y-3">
                    <DynamicOffers compact />
                  </div>
                )}
              </div>

              {/* Rodapé com botão de fechar */}
              <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModule(null)}
                  className="px-5 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                >
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

