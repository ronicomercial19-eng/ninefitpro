import { useNavigate } from "react-router-dom";
import { TrainingHistory } from "./TrainingHistory";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useWorkoutAssistance, ASSISTANCE_LEVELS } from "@/hooks/useWorkoutAssistance";
import { 
  Dumbbell, Play, Calendar, Zap, ArrowUpRight,
  Clock, Target, Shield, CheckCircle2, ChevronRight, Activity, Sparkles
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import trainHeroBanner from "@/assets/images/train_hero_banner_1790011808035.jpg";

interface TrainingData {
  exercises?: unknown[];
  exercise_count?: number;
  estimated_duration?: number;
}

interface TrainingAssignment {
  id: string;
  training_name: string;
  training_description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  training_type?: string;
  html_file_url?: string;
  training_data?: TrainingData;
}

interface WorkoutHomeProps {
  trainings: TrainingAssignment[];
  athleteName: string;
  completedCount: number;
  weeklyCompleted?: number;
  onSelectWorkout: (training: TrainingAssignment) => void;
  onStartQuick: () => void;
}

export function WorkoutHome({ trainings, athleteName, completedCount, weeklyCompleted = 0, onSelectWorkout, onStartQuick }: WorkoutHomeProps) {
  const navigate=useNavigate();
  const {athleteId}=useAthleteId();
  const {level,setLevel}=useWorkoutAssistance(athleteId);
  const supportLevel=[level];
  const setSupportLevel=(values:number[])=>setLevel(values[0]);
  const currentSupport=ASSISTANCE_LEVELS[level];

  const activeWorkout = trainings[0];

  return (
    <div className="space-y-4">
      {/* =========================================================================
          HERO — SESSÃO DO DIA. Primeira coisa da aba Hoje; a ação principal é Iniciar treino.
         ========================================================================= */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#0c0d12] flex flex-col group">
        {/* Bloco 1: Imagem Superior com Gradiente de Sobreposição (fundo -> topo) */}
        <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black shrink-0">
          <img
            src={trainHeroBanner}
            alt="Treino Principal 9FIT"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          {/* Gradiente de sobreposição sutil que sobe a partir da base em direção ao topo */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d12] via-[#0c0d12]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          {/* Hairline luminoso sutil no topo */}
          <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          {/* Único selo do hero: estado da prescrição */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-neutral-200 font-bold">
              {activeWorkout ? "PRESCRIÇÃO ATIVA" : "SEM PRESCRIÇÃO"}
            </span>
          </div>
        </div>

        {/* Bloco 2: Conteúdo de Texto e Dados do Protocolo (Totalmente separado, 100% legível) */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-gradient-to-b from-[#0c0d12] to-[#090a0d] border-t border-white/[0.04]">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug font-display">
              {activeWorkout ? activeWorkout.training_name : "Sem treino prescrito hoje"}
            </h2>

            <p className="text-xs text-neutral-300 mt-1.5 line-clamp-2 max-w-xl font-normal leading-relaxed">
              {activeWorkout
                ? (activeWorkout.training_description || "Confira os exercícios e os parâmetros definidos na sua prescrição.")
                : "Monte uma sessão pelo Treino Rápido ou confira a aba Semana."}
            </p>

            {activeWorkout && (
              <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 mt-3 text-[10px] font-mono font-medium">
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-200">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {activeWorkout.training_data?.estimated_duration ? `${activeWorkout.training_data.estimated_duration} MIN` : "SEM ESTIMATIVA"}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-200">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  {activeWorkout.training_data?.exercises?.length ?? activeWorkout.training_data?.exercise_count ?? 0} BLOCOS
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => activeWorkout ? onSelectWorkout(activeWorkout) : onStartQuick()}
            className="py-3 px-6 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl transition-all active:scale-95 cursor-pointer shrink-0 self-stretch sm:self-end"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{activeWorkout ? "INICIAR TREINO" : "TREINO RÁPIDO"}</span>
          </button>
        </div>
      </div>

      {/* Ação secundária logo abaixo do hero: Treino Rápido (só quando já existe treino do dia; sem treino o hero já cumpre esse papel) */}
      {activeWorkout && (
        <button 
          type="button"
          onClick={onStartQuick}
          className="w-full p-3 rounded-xl border border-primary/30 hover:border-primary/60 bg-gradient-to-r from-primary/[0.12] via-[#121319] to-primary/[0.06] flex items-center justify-between transition-all group cursor-pointer shadow-lg active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Zap className="w-4 h-4 fill-primary" />
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block group-hover:text-primary transition-colors">
                Calibrar Treino Rápido
              </span>
              <span className="text-[10px] font-mono text-neutral-400 block">
                Ajuste dinâmico por tempo disponível e energia (3 etapas)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-primary">
            <span>Calibrar</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* =========================================================================
          CARD DE TELEMETRIA COM EFEITO DE FUNDO RADAR 360° (HIGH-TICKET)
         ========================================================================= */}
      <div className="relative rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#12141a] via-[#0c0d11] to-[#090a0d] p-3.5 sm:p-4 shadow-2xl transition-all overflow-hidden">
        {/* Subtle hairline edge lighting no topo */}
        <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        {/* EFEITOS DE FUNDO VISUAIS: Brilhos ambientes + Malha e Radar 360° */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute -top-14 left-1/3 w-72 h-36 bg-primary/[0.09] rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-amber-500/[0.05] rounded-full blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:14px_14px] opacity-70" />

          {/* Radar 360° Geométrico em Marca D'Água Técnica */}
          <svg 
            className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-56 h-56 text-primary/[0.07] pointer-events-none"
            viewBox="0 0 200 200" 
            fill="none"
          >
            <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="100" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="100" cy="100" r="24" stroke="currentColor" strokeWidth="1" />
            <line x1="100" y1="6" x2="100" y2="194" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="6" y1="100" x2="194" y2="100" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Header do Card */}
        <div className="relative z-10 flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-primary font-bold">
              HISTÓRICO & CONSISTÊNCIA
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 font-medium">
              TELEMETRIA VIVA
            </span>
          </div>
        </div>

        {/* Grid de Métricas de Progresso (o nível de suporte tem bloco próprio logo abaixo, sem repetir aqui) */}
        <div className="relative z-10 grid grid-cols-2 gap-2">
          {/* Métrica 1: Treinos Realizados */}
          <div className="p-3 rounded-lg backdrop-blur-md bg-white/[0.025] border border-white/[0.05] text-center">
            <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 font-medium mb-1">
              CONCLUÍDOS
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
              {completedCount}
            </p>
            <span className="text-[8px] font-mono text-primary block mt-0.5 font-semibold">
              SESSÕES
            </span>
          </div>

          {/* Métrica 2: Frequência Semanal */}
          <div className="p-3 rounded-lg backdrop-blur-md bg-white/[0.025] border border-white/[0.05] text-center">
            <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 font-medium mb-1">
              SEMANA
            </p>
            <p className="text-2xl sm:text-3xl font-black text-amber-300 font-display tracking-tight">
              {weeklyCompleted}
            </p>
            <span className="text-[8px] font-mono text-neutral-400 block mt-0.5">
              TREINOS CONCLUÍDOS
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NÍVEL DE SUPORTE DO TREINADOR (CALIBRAÇÃO INTELIGENTE)
         ========================================================================= */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0c0d10] p-3.5 sm:p-4 shadow-xl">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-white font-bold">
              MODO DE ASSISTÊNCIA DO ATLETA
            </span>
          </div>
          <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            {currentSupport.label}
          </span>
        </div>

        {supportLevel[0] === 2 && <button onClick={() => navigate("/9fit/native-system?app=staff")} className="mb-3 text-sm font-semibold text-primary">Solicitar apoio do treinador</button>}
        <Slider
          value={supportLevel}
          onValueChange={setSupportLevel}
          max={2}
          step={1}
          className="my-3"
        />

        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>{currentSupport.desc}</span>
          <span className="text-[10px] font-mono text-neutral-500">3 NÍVEIS DISPONÍVEIS</span>
        </div>
      </div>

      {/* =========================================================================
          CENTRAL NEURAL RON — CONEXÃO DIRETA COM O TREINO
         ========================================================================= */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-black to-[#0a0b10] p-3.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">RON CONCIERGE</span>
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONSULTAR</span>
            </div>
            <p className="text-xs text-neutral-200 truncate mt-0.5">
              Dúvidas em séries, cadência ou descanso? Consulte o RON.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge', { detail: { prompt: "Estou na tela de treinos. Analise meu treino de hoje e me oriente sobre cadência, descanso e cargas ideais." } }))}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-all flex items-center gap-1 shadow-md shadow-primary/20 cursor-pointer"
        >
          Consultar
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <TrainingHistory />
    </div>
  );
}
