import { useState } from "react";
import { 
  Dumbbell, Play, Calendar, Zap, 
  Clock, Target, Shield, Flame, CheckCircle2, ChevronRight, Activity, Sparkles
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import trainHeroBanner from "@/assets/images/train_hero_banner_1790011808035.jpg";

interface TrainingData {
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
  onSelectWorkout: (training: TrainingAssignment) => void;
  onStartQuick: () => void;
}

const supportLevels = [
  { label: "Solo", desc: "Execução autônoma", icon: "🔥" },
  { label: "Guiado", desc: "Orientações e cadência Ron AI", icon: "📋" },
  { label: "Assistido", desc: "Apoio do treinador dedicado", icon: "🤝" },
];

export function WorkoutHome({ trainings, athleteName, completedCount, onSelectWorkout, onStartQuick }: WorkoutHomeProps) {
  const [supportLevel, setSupportLevel] = useState([1]);
  const currentSupport = supportLevels[supportLevel[0]];

  const activeWorkout = trainings[0];
  const startDate = trainings.length > 0 
    ? new Date(trainings[0].start_date).toLocaleDateString("pt-BR") 
    : "--";

  return (
    <div className="space-y-4">
      {/* =========================================================================
          HERO VISUAL CINEMATOGRÁFICO — SESSÃO PRINCIPAL DE TREINO (HIGH-TICKET)
          Estrutura em layout vertical: Banner com gradiente de transição + Bloco textual dedicado
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

          {/* Badges Flutuantes sobre a Imagem */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-neutral-200 font-bold">
              PROTOCOLO ATIVO · CICLO 1
            </span>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-[9px] font-mono text-amber-300 font-medium">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Cadência 3-0-1</span>
          </div>

          {/* Etiqueta de Telemetria ancorada na base da imagem */}
          <div className="absolute bottom-2.5 left-4 flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-primary font-bold">
              TELEMETRIA OFICIAL
            </span>
            <span className="text-white/30">•</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-200 font-medium bg-white/[0.08] px-2 py-0.5 rounded border border-white/15 backdrop-blur-sm">
              82% 1RM
            </span>
          </div>
        </div>

        {/* Bloco 2: Conteúdo de Texto e Dados do Protocolo (Totalmente separado, 100% legível) */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-gradient-to-b from-[#0c0d12] to-[#090a0d] border-t border-white/[0.04]">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug font-display">
              {activeWorkout ? activeWorkout.training_name : "Hipertrofia & Força Muscular"}
            </h2>

            <p className="text-xs text-neutral-300 mt-1.5 line-clamp-2 max-w-xl font-normal leading-relaxed">
              {activeWorkout?.training_description || "Volume neuromuscular calibrado para alta densidade metabólica e hipertrofia de cadeia anterior."}
            </p>

            <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 mt-3 text-[10px] font-mono font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-200">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {activeWorkout?.training_data?.estimated_duration || 45} MIN
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-neutral-200">
                <Target className="w-3.5 h-3.5 text-primary" />
                {activeWorkout?.training_data?.exercise_count || 6} BLOCOS
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 text-amber-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                ~480 KCAL
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => activeWorkout ? onSelectWorkout(activeWorkout) : onStartQuick()}
            className="py-3 px-6 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl transition-all active:scale-95 cursor-pointer shrink-0 self-stretch sm:self-end"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>INICIAR TREINO</span>
          </button>
        </div>
      </div>

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

        {/* Grid de Métricas de Progresso */}
        <div className="relative z-10 grid grid-cols-3 gap-2">
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
              5/5
            </p>
            <span className="text-[8px] font-mono text-neutral-400 block mt-0.5">
              META ATIVA
            </span>
          </div>

          {/* Métrica 3: Modo de Assistência */}
          <div className="p-3 rounded-lg backdrop-blur-md bg-white/[0.025] border border-white/[0.05] text-center">
            <p className="text-[9px] font-mono uppercase tracking-wider text-neutral-400 font-medium mb-1">
              SUPORTE
            </p>
            <p className="text-base sm:text-lg font-bold text-white font-display tracking-tight mt-1 truncate">
              {currentSupport.label}
            </p>
            <span className="text-[8px] font-mono text-neutral-400 block mt-0.5 truncate">
              {startDate !== "--" ? `Desde ${startDate}` : "Ciclo 9FIT"}
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
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ONLINE</span>
            </div>
            <p className="text-xs text-neutral-200 truncate mt-0.5">
              Dúvidas em séries, RPE ou desconforto articular? Ajuste em tempo real.
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

      {/* =========================================================================
          GRADE DE TREINOS DO PLANO
         ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-neutral-200 font-bold">
              TREINOS DA GRADE
            </span>
          </div>
          <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
            {trainings.length} {trainings.length === 1 ? "PRESCRIÇÃO" : "PRESCRIÇÕES"}
          </span>
        </div>

        {trainings.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0d10] p-8 text-center">
            <Dumbbell className="w-8 h-8 text-neutral-500 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-neutral-400">Nenhum treino específico atribuído no momento.</p>
            <button
              type="button"
              onClick={onStartQuick}
              className="mt-3 py-2 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-all cursor-pointer"
            >
              Criar Treino Rápido
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {trainings.map((training, i) => {
              const exerciseCount = training.training_data?.exercise_count || 6;
              const duration = training.training_data?.estimated_duration || 45;
              const isNext = i === 0;

              return (
                <button
                  key={training.id}
                  type="button"
                  onClick={() => onSelectWorkout(training)}
                  className={`w-full p-3.5 rounded-xl text-left transition-all group flex items-center justify-between gap-3 border cursor-pointer ${
                    isNext
                      ? "bg-white/[0.03] hover:bg-white/[0.06] border-primary/40 shadow-lg"
                      : "bg-[#0c0d10] hover:bg-white/[0.03] border-white/[0.06] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isNext ? "bg-primary/20 border border-primary/30 text-primary" : "bg-white/[0.04] text-neutral-400"
                    }`}>
                      <Dumbbell className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-primary transition-colors">
                          {training.training_name}
                        </h4>
                        {isNext && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase shrink-0">
                            Próximo
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 mt-1 text-[10px] font-mono text-neutral-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          ~{duration}min
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-neutral-500" />
                          {exerciseCount} exercícios
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-lg border border-white/10 group-hover:border-primary/50 bg-white/[0.02] group-hover:bg-primary flex items-center justify-center transition-all text-neutral-400 group-hover:text-primary-foreground shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
