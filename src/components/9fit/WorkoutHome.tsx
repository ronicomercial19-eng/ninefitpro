import { isExecutableTraining } from '@/lib/executableTraining';
import { useNavigate } from "react-router-dom";
import { TrainingHistory } from "./TrainingHistory";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useWorkoutAssistance, ASSISTANCE_LEVELS } from "@/hooks/useWorkoutAssistance";
import { 
  Dumbbell, Play, Calendar, Zap, 
  Clock, Target, Shield, Flame, CheckCircle2, ChevronRight, Activity, Sparkles
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

  const activeWorkout = trainings.find(isExecutableTraining) || trainings[0];
  const executable = isExecutableTraining(activeWorkout);
  const startDate = trainings.length > 0 
    ? new Date(`${trainings[0].start_date}T12:00:00`).toLocaleDateString("pt-BR") 
    : "--";

  return (
    <div className="space-y-4">
      {/* =========================================================================
          HERO VISUAL — SESSÃO PRINCIPAL DE TREINO
          Banner com gradiente de transição + bloco textual dedicado
         ========================================================================= */}
      <div className="relative rounded-3xl overflow-hidden border border-[#EF7A45]/25 bg-[#0B0B0C] flex flex-col group">
        {/* Bloco 1: Imagem Superior com Gradiente de Sobreposição (fundo -> topo) */}
        <div className="relative aspect-[16/7] min-h-40 w-full overflow-hidden bg-black shrink-0">
          <img
            src={trainHeroBanner}
            alt="Treino Principal 9FIT"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          {/* Gradiente de sobreposição sutil que sobe a partir da base em direção ao topo */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] via-[#0B0B0C]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

          {/* Badges Flutuantes sobre a Imagem */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF7A45]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/90 font-bold">
              {executable ? "PRESCRIÇÃO ATIVA" : activeWorkout ? "EM PREPARAÇÃO" : "SEM PRESCRIÇÃO"}
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/65 font-medium">
            <Sparkles strokeWidth={1.75} className="w-3 h-3 text-[#EF7A45]" />
            <span>Cadência do protocolo</span>
          </div>

          {/* Etiqueta de Telemetria ancorada na base da imagem */}
          <div className="absolute bottom-2.5 left-4 flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#EF7A45] font-bold">
              TELEMETRIA OFICIAL
            </span>
            <span className="text-white/30">•</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-white/65 font-medium bg-white/[0.08] px-2 py-0.5 rounded border border-white/15 backdrop-blur-sm">
              Carga prescrita
            </span>
          </div>
        </div>

        {/* Bloco 2: Conteúdo de Texto e Dados do Protocolo */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-[#0B0B0C] border-t border-white/[0.06]">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug font-display">
              {activeWorkout ? activeWorkout.training_name : "Hipertrofia & Força Muscular"}
            </h2>

            <p className="text-xs text-white/65 mt-1.5 line-clamp-2 max-w-xl font-normal leading-relaxed">
              {!executable ? "Seu profissional precisa preparar e confirmar os exercícios, séries e doses antes de liberar esta sessão." : activeWorkout?.training_description || "Confira os exercícios e os parâmetros definidos na sua prescrição."}
            </p>

            <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 mt-3 text-[10px] font-mono font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/65">
                <Clock strokeWidth={1.75} className="w-3.5 h-3.5 text-[#EF7A45]" />
                {activeWorkout?.training_data?.estimated_duration ? `${activeWorkout.training_data.estimated_duration} MIN` : "SEM ESTIMATIVA"}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/65">
                <Target strokeWidth={1.75} className="w-3.5 h-3.5 text-[#EF7A45]" />
                {activeWorkout?.training_data?.exercises?.length ?? activeWorkout?.training_data?.exercise_count ?? 0} BLOCOS
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EF7A45]/15 border border-[#EF7A45]/25 text-[#EF7A45]">
                <Flame strokeWidth={1.75} className="w-3.5 h-3.5 text-[#EF7A45]" />
                SESSÃO GUIADA
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => activeWorkout && onSelectWorkout(activeWorkout)}
            disabled={!executable}
            className="py-3 px-6 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#EF7A45] hover:bg-[#EF7A45]/90 text-white shadow-[0_8px_24px_rgba(239,122,69,0.25)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 self-stretch sm:self-end"
          >
            <Play strokeWidth={1.75} className="w-4 h-4 fill-current" />
            <span>{executable ? "VER TREINO" : "AGUARDANDO PRESCRIÇÃO"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CARD DE TELEMETRIA COM EFEITO DE FUNDO RADAR 360° (discreto)
         ========================================================================= */}
      <div className="relative rounded-3xl border border-[#EF7A45]/25 bg-[#0B0B0C] p-3.5 sm:p-4 transition-all overflow-hidden">
        {/* EFEITOS DE FUNDO: malha + radar 360° — sem glow colorido */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:14px_14px] opacity-40" />

          {/* Radar 360° Geométrico em Marca D'Água Técnica */}
          <svg 
            className="absolute right-[-20px] top-1/2 -translate-y-1/2 w-56 h-56 text-[#EF7A45]/[0.05] pointer-events-none"
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
            <Activity strokeWidth={1.75} className="w-3.5 h-3.5 text-[#EF7A45]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[#EF7A45] font-bold">
              HISTÓRICO & CONSISTÊNCIA
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5BC8E8]" />
            <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-white/45 font-medium">
              TELEMETRIA VIVA
            </span>
          </div>
        </div>

        {/* Grid de Métricas de Progresso */}
        <div className="relative z-10 grid grid-cols-3 gap-2">
          {/* Métrica 1: Treinos Realizados */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-white/45 font-medium mb-1">
              CONCLUÍDOS
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
              {completedCount}
            </p>
            <span className="text-[9px] font-mono text-[#EF7A45] block mt-0.5 font-semibold">
              SESSÕES
            </span>
          </div>

          {/* Métrica 2: Frequência Semanal */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-white/45 font-medium mb-1">
              SEMANA
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-white font-display tracking-tight">
              {weeklyCompleted}
            </p>
            <span className="text-[9px] font-mono text-white/45 block mt-0.5">
              TREINOS CONCLUÍDOS
            </span>
          </div>

          {/* Métrica 3: Modo de Assistência */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-white/45 font-medium mb-1">
              SUPORTE
            </p>
            <p className="text-base sm:text-lg font-bold text-white font-display tracking-tight mt-1 truncate">
              {currentSupport.label}
            </p>
            <span className="text-[9px] font-mono text-white/45 block mt-0.5 truncate">
              {startDate !== "--" ? `Desde ${startDate}` : "Ciclo 9FIT"}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NÍVEL DE SUPORTE DO TREINADOR (CALIBRAÇÃO INTELIGENTE)
         ========================================================================= */}
      <div className="rounded-3xl border border-[#EF7A45]/25 bg-[#0B0B0C] p-3.5 sm:p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Shield strokeWidth={1.75} className="w-3.5 h-3.5 text-[#EF7A45]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-white/45 font-bold">
              MODO DE ASSISTÊNCIA DO ATLETA
            </span>
          </div>
          <span className="text-xs font-bold text-[#EF7A45] px-2 py-0.5 rounded-full bg-[#EF7A45]/15 border border-[#EF7A45]/25">
            {currentSupport.label}
          </span>
        </div>

        {supportLevel[0] === 2 && <button onClick={() => navigate("/9fit/native-system?app=staff")} className="mb-3 text-sm font-semibold text-[#EF7A45]">Solicitar apoio do treinador</button>}
        <Slider
          value={supportLevel}
          onValueChange={setSupportLevel}
          max={2}
          step={1}
          className="my-3"
        />

        <div className="flex items-center justify-between text-xs text-white/65">
          <span>{currentSupport.desc}</span>
          <span className="text-[10px] font-mono text-white/35">3 NÍVEIS DISPONÍVEIS</span>
        </div>
      </div>

      {/* =========================================================================
          CENTRAL NEURAL RON — CONEXÃO DIRETA COM O TREINO
         ========================================================================= */}
      <div className="rounded-3xl border border-[#EF7A45]/25 bg-[#0B0B0C] p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#EF7A45]/[0.12] border border-[#EF7A45]/25 flex items-center justify-center text-[#EF7A45] shrink-0">
            <Sparkles strokeWidth={1.75} className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#EF7A45]">RON CONCIERGE</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#5BC8E8]/15 text-[#5BC8E8] border border-[#5BC8E8]/30">CONSULTAR</span>
            </div>
            <p className="text-xs text-white/65 truncate mt-0.5">
              Dúvidas em séries, cadência ou descanso? Consulte o RON.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge', { detail: { prompt: "Estou na tela de treinos. Analise meu treino de hoje e me oriente sobre cadência, descanso e cargas ideais." } }))}
          className="shrink-0 text-xs font-semibold px-3 py-2 rounded-2xl bg-[#EF7A45] text-white hover:bg-[#EF7A45]/90 transition-all flex items-center gap-1 shadow-[0_8px_24px_rgba(239,122,69,0.25)] cursor-pointer"
        >
          Consultar
          <ChevronRight strokeWidth={1.75} className="w-3.5 h-3.5" />
        </button>
      </div>

      <TrainingHistory />
    </div>
  );
}
