import { NutritionCompactCard } from "./NutritionCompactCard";
import { useState } from "react";
import { DailyGoalCheckins } from "./DailyGoalCheckins";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  Target,
  Users,
  ShoppingBag,
  Compass,
  CalendarCheck,
  Crown,
  Dumbbell,
  Utensils,
  Lightbulb,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HubFloatingMetrics } from "@/components/9fit/HubFloatingMetrics";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { WeeklyRadar3D } from "@/components/9fit/WeeklyRadar3D";

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

interface Shortcut {
  key: string;
  title: string;
  status: string;
  icon: any;
  /** só true quando houver novidade/pendência real — sem novidade, sem bolinha */
  hasNews?: boolean;
  /** rota ao tocar; sem rota = abre splash (apenas Radar 3D, que depende dos dados do Hub) */
  route?: string;
}

const PILLAR_LABEL: Record<string, string> = {
  treino: "treino",
  nutri: "nutrição",
  sono: "sono",
  mob: "mobilidade",
  hidr: "hidratação",
};

export function FitOSConsoleDock({
  weekly,
  liveScoresVitals,
  performancePlanTitle,
  breakdown,
  protocolCount,
}: Props) {
  const navigate = useNavigate();
  const [radarOpen, setRadarOpen] = useState(false);

  // Comandos & Sinais: Staff / Store / Metas  ·  Compromissos / Radar 3D / Prime Pass
  const shortcuts: Shortcut[] = [
    { key: "staff", title: "Staff", status: "EQUIPE", icon: Users, route: "/9fit/staff" },
    { key: "store", title: "Store", status: "LOJA", icon: ShoppingBag, route: "/9fit/native-system?app=store" },
    { key: "metas", title: "Metas", status: "EVOLUÇÃO", icon: Target, route: "/9fit/progresso" },
    { key: "compromissos", title: "Compromissos", status: "AGENDA", icon: CalendarCheck, route: "/9fit/aulas-creditos?tab=schedule" },
    { key: "radar", title: "Radar 3D", status: "SEMANA", icon: Compass },
    { key: "prime", title: "Prime Pass", status: "BENEFÍCIOS", icon: Crown, route: "/9fit/primepass" },
  ];

  const onShortcut = (s: Shortcut) => {
    if (s.route) navigate(s.route);
    else setRadarOpen(true);
  };

  // ---------- Brief do Foco atual (só dados reais da semana; sem números inventados) ----------
  const trainStatus =
    weekly.treinos === 0 ? "Sem treino registrado esta semana"
    : weekly.treinos >= 5 ? "Meta semanal atingida"
    : weekly.treinos >= 3 ? "Bom ritmo"
    : "Ritmo inicial";
  const dietStatus =
    weekly.nutri === 0 ? "Sem refeições registradas esta semana"
    : `${weekly.nutri} refeiç${weekly.nutri === 1 ? "ão registrada" : "ões registradas"} na semana`;

  const lowest = (Object.entries(breakdown) as [string, number | null][])
    .filter(([, v]) => v != null)
    .sort((a, b) => (a[1] as number) - (b[1] as number))[0];

  let guidance: string;
  if (weekly.treinos === 0) guidance = "Comece com uma sessão curta hoje e registre. Consistência vem antes de intensidade.";
  else if (weekly.nutri === 0) guidance = "Seus treinos estão andando, mas a alimentação está sem registro. Registre a próxima refeição para fechar o quadro.";
  else if (weekly.treinos < 3) guidance = `Faltam ${5 - weekly.treinos} sessões para a meta da semana. Agende a próxima agora.`;
  else if (lowest && (lowest[1] as number) < 60) guidance = `Maior oportunidade: ${PILLAR_LABEL[lowest[0]] || lowest[0]}. Foque nisso nos próximos dias.`;
  else guidance = "Bom ritmo. Mantenha a rotina e continue registrando sono e hidratação.";

  return (
    <div className="w-full space-y-4">
      <HubFloatingMetrics vitals={liveScoresVitals} />
      <DailyGoalCheckins />

      {/* Cabeçalho "Sua alimentação hoje" — abre splash com o conteúdo completo */}
      <NutritionCompactCard />

      {/* FOCO ATUAL com brief do atleta */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.25 }}
        onClick={() => navigate("/9fit/planejamento")}
        className="relative overflow-hidden rounded-3xl border border-[#EF7A45]/25 bg-[#0B0B0C] bg-gradient-to-b from-[#EF7A45]/[0.05] to-transparent p-4 sm:p-5 cursor-pointer group"
      >
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono tracking-[0.12em] font-bold text-[#EF7A45] uppercase">
              FOCO ATUAL · FIT OS
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-[0.08em] text-[#EF7A45] bg-[#EF7A45]/15 border border-[#EF7A45]/25">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF7A45]" />
              CICLO EM ANDAMENTO
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight font-display">
              {performancePlanTitle || "Defina seu objetivo"}
            </h3>
            <p className="text-xs text-white/65 mt-1">
              {protocolCount > 0
                ? `${protocolCount} conteúdos atribuídos ainda não concluídos na Biblioteca. A rotina diária é acompanhada separadamente.`
                : "Nenhuma intervenção prescrita disponível."}
            </p>
          </div>

          {/* Brief: estado atual em treino e dieta + orientação */}
          <div className="rounded-2xl border border-[#EF7A45]/25 bg-black/30 p-3 space-y-2.5">
            <p className="text-[11px] font-mono tracking-[0.12em] uppercase font-bold text-[#EF7A45]">
              Brief do atleta
            </p>
            <div className="flex items-start gap-2.5 text-[12px] text-white/65">
              <Dumbbell strokeWidth={1.75} className="w-5 h-5 text-[#EF7A45] shrink-0" />
              <span><b className="font-semibold text-white">Treino:</b> {trainStatus} · {weekly.treinos}/5 sessões</span>
            </div>
            <div className="flex items-start gap-2.5 text-[12px] text-white/65">
              <Utensils strokeWidth={1.75} className="w-5 h-5 text-[#EF7A45] shrink-0" />
              <span><b className="font-semibold text-white">Dieta:</b> {dietStatus}</span>
            </div>
            <div className="flex items-start gap-2.5 text-[12px] text-white/65">
              <Lightbulb strokeWidth={1.75} className="w-5 h-5 text-[#EF7A45] shrink-0" />
              <span><b className="font-semibold text-white">Para melhorar:</b> {guidance}</span>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#EF7A45] text-white font-semibold text-sm shadow-[0_8px_24px_rgba(239,122,69,0.25)] active:scale-95 transition-transform">
              <span>Acessar</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3 text-[11px] font-mono text-white/65">
            <span className="shrink-0">Consistência do ciclo:</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden mx-2">
              <div
                className="h-full bg-[#EF7A45] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, (weekly.treinos / 5) * 100))}%` }}
              />
            </div>
            <span className="text-white font-bold shrink-0">{weekly.treinos}/5 sessões</span>
          </div>
        </div>
      </motion.div>

      {/* COMANDOS & SINAIS — atalhos com rota própria */}
      <div className="space-y-2 pb-20">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-mono tracking-[0.12em] text-white/45 uppercase font-bold flex items-center gap-1.5">
            <Zap strokeWidth={1.75} className="w-3.5 h-3.5 text-[#EF7A45]" />
            COMANDOS & SINAIS
          </span>
          <span className="text-[10px] font-mono text-white/35 uppercase tracking-[0.12em]">TOQUE PARA ABRIR</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            const active = s.key === "radar" && radarOpen;
            return (
              <motion.button
                key={s.key}
                type="button"
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.2 }}
                onClick={() => onShortcut(s)}
                className={`relative flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-[20px] border text-center cursor-pointer overflow-hidden transition-colors ${
                  active
                    ? "border-[#EF7A45]/60 bg-[#EF7A45]/[0.08]"
                    : "border-[#EF7A45]/25 bg-[#0B0B0C]"
                }`}
              >
                {s.hasNews && (
                  <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[#EF7A45]" />
                )}

                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 bg-[#EF7A45]/[0.12] border border-[#EF7A45]/25">
                  <Icon strokeWidth={1.75} className="w-6 h-6 text-[#EF7A45]" />
                </div>

                <span className="text-[15px] sm:text-base font-bold text-white font-display leading-tight truncate w-full">
                  {s.title}
                </span>
                <span className="text-[11px] font-mono text-white/45 uppercase tracking-[0.08em] mt-0.5 truncate w-full">
                  {s.status}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Splash do Radar 3D (não tem rota própria: depende dos dados do Hub) */}
      <AnimatePresence>
        {radarOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRadarOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#090909] p-5 sm:p-6 shadow-2xl shadow-black flex flex-col my-auto"
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--orange-500)] to-transparent opacity-80" />
              <button
                type="button"
                onClick={() => setRadarOpen(false)}
                aria-label="Fechar painel"
                className="absolute top-4 right-4 w-8 h-8 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-5 pt-1 pr-8">
                <span className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase text-[var(--orange-400)]">
                  PROGRAMAÇÃO DO DIA
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight font-display mt-1">Radar 3D</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Cobertura dos seus registros na semana: treino, nutrição, sono, mobilidade e hidratação.
                </p>
              </div>

              <div className="space-y-4">
                <DailyProtocol />
                <WeeklyRadar3D current={breakdown} />
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRadarOpen(false)}
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
