import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowUpRight,
  Target,
  TrendingUp,
  Compass,
  CalendarCheck,
  Sparkles,
  ClipboardCheck,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
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

// Comandos & Sinais = checkpoint de ações rápidas: dados, engajamento, retenção e evolução.
type ModuleKey = "avaliacao" | "activation" | "checkin" | "evolucao" | "schedule" | "offers";
type Signal = "pending" | "ok" | undefined;

interface ModuleConfig {
  key: ModuleKey;
  tag: string;
  title: string;
  subtitle: string;
  statusText: string;
  signal: Signal;
  icon: any;
}

interface AssessmentState { last: string | null }
interface StatsState { streak: number; treinosMes: number; prs: number; kgMes: number; ultimo: string | null }
interface GoalRow { id: string; titulo: string; valor_atual: number | null; valor_meta: number | null; unidade: string | null }

const REASSESS_DAYS = 30;

// Padrão Nine Pro v2: UM foco por tela (Foco atual, com glow + número vazado).
// Todo o resto é "calmo": preto, borda neutra, ícone laranja, sem glow/pulso.
const label = "font-data text-[9px] uppercase tracking-[0.3em] text-primary/80";
const pillPrimary = "inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-95";
const pillGhost = "inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-5 py-3 font-display text-[11px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary/10 active:scale-95";
const outlineStyle: React.CSSProperties = { WebkitTextStroke: "1.5px hsl(20 100% 50%)", color: "transparent" };

function daysSince(isoDate: string): number {
  const then = new Date(`${isoDate}T00:00:00`).getTime();
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
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
  const { athleteId } = useAthleteId();
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);
  const [assessment, setAssessment] = useState<AssessmentState | null>(null);
  const [stats, setStats] = useState<StatsState | null>(null);
  const [goals, setGoals] = useState<GoalRow[]>([]);

  // Estados reais dos cards (nada decorativo): avaliação (avaliacoes_unificadas), evolução (user_stats_agg), metas (metas_progresso).
  useEffect(() => {
    if (!athleteId) { setAssessment(null); setStats(null); setGoals([]); return; }
    let active = true;
    async function load() {
      const db = supabase as any;
      const [a, s, g] = await Promise.all([
        db.from("avaliacoes_unificadas").select("data_avaliacao").eq("athlete_id", athleteId).order("data_avaliacao", { ascending: false }).limit(1),
        db.from("user_stats_agg").select("streak_dias,total_treinos_mes,kg_total_mes,prs_count,ultimo_treino").eq("athlete_id", athleteId).maybeSingle(),
        db.from("metas_progresso").select("id,titulo,valor_atual,valor_meta,unidade").eq("athlete_id", athleteId).eq("status", "ativa").order("created_at", { ascending: false }).limit(3),
      ]);
      if (!active) return;
      if (!a.error) setAssessment({ last: a.data?.[0]?.data_avaliacao ?? null });
      if (!s.error) {
        const row = s.data;
        setStats(row ? {
          streak: Number(row.streak_dias ?? 0),
          treinosMes: Number(row.total_treinos_mes ?? 0),
          prs: Number(row.prs_count ?? 0),
          kgMes: Number(row.kg_total_mes ?? 0),
          ultimo: row.ultimo_treino ?? null,
        } : { streak: 0, treinosMes: 0, prs: 0, kgMes: 0, ultimo: null });
      }
      if (!g.error) setGoals((g.data ?? []) as GoalRow[]);
    }
    void load();
    const events = ["9fit:sync_updated", "9fit:profile-updated", "9fit:workout-updated"];
    events.forEach((e) => window.addEventListener(e, load));
    return () => { active = false; events.forEach((e) => window.removeEventListener(e, load)); };
  }, [athleteId]);

  const assessmentPending = assessment !== null && assessment.last === null;
  const assessmentAge = assessment?.last ? daysSince(assessment.last) : null;
  const assessmentStale = assessmentAge !== null && assessmentAge >= REASSESS_DAYS;

  const assessmentStatus = assessment === null
    ? "—"
    : assessmentPending
      ? "PENDENTE"
      : assessmentStale
        ? "REAVALIAR"
        : assessmentAge === 0
          ? "ATUALIZADA HOJE"
          : `ATUALIZADA HÁ ${assessmentAge}D`;

  const evolutionStatus = stats === null
    ? "—"
    : stats.streak > 0
      ? `STREAK ${stats.streak}D`
      : stats.prs > 0
        ? `${stats.prs} ${stats.prs === 1 ? "PR" : "PRS"}`
        : "REGISTROS";

  const modules: Record<ModuleKey, ModuleConfig> = {
    avaliacao: {
      key: "avaliacao",
      tag: "AVALIAÇÃO GUIADA",
      title: "Avaliação guiada",
      subtitle: "Peso, composição corporal e cargas de referência em cerca de 3 minutos",
      statusText: assessmentStatus,
      signal: assessment === null ? undefined : assessmentPending || assessmentStale ? "pending" : "ok",
      icon: ClipboardCheck,
    },
    activation: {
      key: "activation",
      tag: "METAS DO ATLETA",
      title: "Metas",
      subtitle: `Plano ativo: ${performancePlanTitle || "Defina seu objetivo"}`,
      statusText: `${weekly.treinos}/5 SESSÕES`,
      signal: undefined,
      icon: Target,
    },
    checkin: {
      key: "checkin",
      tag: "AGENDA DO ATLETA",
      title: "Compromissos",
      subtitle: "Aulas, avaliações e início de novas prescrições",
      statusText: "DISPONÍVEL",
      signal: undefined,
      icon: CalendarCheck,
    },
    evolucao: {
      key: "evolucao",
      tag: "EVOLUÇÃO DO ATLETA",
      title: "Evolução",
      subtitle: "Streak, treinos do mês e recordes pessoais",
      statusText: evolutionStatus,
      signal: stats === null ? undefined : stats.streak > 0 ? "ok" : "pending",
      icon: TrendingUp,
    },
    schedule: {
      key: "schedule",
      tag: "PROGRAMAÇÃO DO DIA",
      title: "Radar",
      subtitle: "Visão tridimensional da consistência neuromuscular",
      statusText: "REGISTROS",
      signal: undefined,
      icon: Compass,
    },
    offers: {
      key: "offers",
      tag: "BENEFÍCIOS E UPGRADES",
      title: "Prime member",
      subtitle: "Condições especiais e benefícios exclusivos do seu nível",
      statusText: "EXCLUSIVO",
      signal: undefined,
      icon: Sparkles,
    },
  };

  // Ordem por urgência: Avaliação (se pendente/vencida) > Compromissos > Metas > Evolução > Avaliação (em dia) > Radar > Prime member (sempre por último).
  const urgent = assessmentPending || assessmentStale;
  const squircleKeys: ModuleKey[] = urgent
    ? ["avaliacao", "checkin", "activation", "evolucao", "schedule", "offers"]
    : ["checkin", "activation", "evolucao", "avaliacao", "schedule", "offers"];
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

      {/* COMANDOS & SINAIS — checkpoint: dados, engajamento, retenção, evolução */}
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
                className="relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/60 p-3 text-center transition-colors hover:border-primary/40 active:scale-95"
              >
                {m.signal && (
                  <span
                    aria-hidden
                    className={`absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full ${m.signal === "pending" ? "bg-primary" : "bg-emerald-500"}`}
                  />
                )}
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
                {activeModule === "avaliacao" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className={label}>O que vamos medir</span>
                        <span className="inline-flex items-center gap-1 font-data text-[10px] uppercase tracking-widest text-muted-foreground">
                          <Timer className="h-3 w-3" /> ~3 min
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-sm text-foreground">
                        <li>Peso corporal</li>
                        <li>% Gordura corporal e massa muscular</li>
                        <li>1RM: supino, agachamento e puxada</li>
                      </ul>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {assessmentPending
                          ? "Você ainda não tem avaliação registrada. Seus dados reais alimentam seu histórico e a evolução."
                          : assessment?.last
                            ? `Última avaliação em ${formatDate(assessment.last)}${assessmentStale ? ` (há ${assessmentAge} dias). Hora de reavaliar.` : "."}`
                            : "Carregando seu histórico…"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActiveModule(null); navigate("/9fit/avaliacao-guiada"); }}
                      className={`${pillPrimary} w-full justify-center`}
                    >
                      <span>{assessmentPending ? "Começar avaliação" : "Nova avaliação"}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
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
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Plano ativo: <span className="font-medium text-white">{performancePlanTitle}</span>
                      </p>
                    )}
                    {goals.length > 0 && (
                      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <span className={label}>Metas ativas</span>
                        {goals.map((g) => {
                          const atual = Number(g.valor_atual ?? 0);
                          const meta = Number(g.valor_meta ?? 0);
                          const pct = meta > 0 ? Math.min(100, Math.max(0, (atual / meta) * 100)) : 0;
                          return (
                            <div key={g.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="truncate text-foreground">{g.titulo}</span>
                                <span className="shrink-0 font-data text-[10px] text-muted-foreground">{atual} / {meta} {g.unidade ?? ""}</span>
                              </div>
                              <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setActiveModule(null); navigate("/9fit/protocolo"); }}
                      className={`${pillGhost} w-full justify-center`}
                    >
                      <span>Abrir protocolo prescrito{protocolCount > 0 ? ` (${protocolCount})` : ""}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {activeModule === "evolucao" && (
                  <div className="space-y-4">
                    {stats && (stats.treinosMes > 0 || stats.prs > 0 || stats.streak > 0) ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: "Streak", value: `${stats.streak}d` },
                            { name: "Treinos no mês", value: String(stats.treinosMes) },
                            { name: "Recordes", value: String(stats.prs) },
                          ].map((item) => (
                            <div key={item.name} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <p className="truncate font-data text-[8px] uppercase tracking-widest text-muted-foreground">{item.name}</p>
                              <p className="mt-1 font-display text-xl font-black leading-none text-foreground">{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {stats.kgMes > 0 ? `Volume do mês: ${Math.round(stats.kgMes).toLocaleString("pt-BR")} kg. ` : ""}
                          {stats.ultimo ? `Último treino em ${formatDate(stats.ultimo)}.` : ""}
                        </p>
                      </>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="font-display text-sm font-black uppercase tracking-tight text-white">Registre seu primeiro treino</p>
                        <p className="mt-1 text-xs text-muted-foreground">Sua evolução aparece aqui a partir do primeiro treino concluído.</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setActiveModule(null); navigate(stats && (stats.treinosMes > 0 || stats.prs > 0) ? "/9fit/progresso" : "/9fit/train"); }}
                      className={`${pillPrimary} w-full justify-center`}
                    >
                      <span>{stats && (stats.treinosMes > 0 || stats.prs > 0) ? "Ver evolução completa" : "Iniciar treino"}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
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
