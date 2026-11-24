import { OpticStage } from "./OpticStage";
import { isExecutableTraining } from "@/lib/executableTraining";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrainingHistory } from "./TrainingHistory";
import { useAthleteId } from "@/hooks/useAthleteId";
import {
  useWorkoutAssistance,
  ASSISTANCE_LEVELS,
} from "@/hooks/useWorkoutAssistance";
import {
  Play,
  Clock,
  Dumbbell,
  History,
  Zap,
  Brain,
  Shield,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  StudentActionCard,
  StudentBlockTitle,
  StudentDetailGroup,
} from "./StudentExperience";
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
  countsKnown?: boolean;
  onSelectWorkout: (training: TrainingAssignment) => void;
  onStartQuick: () => void;
}
export function WorkoutHome({
  trainings,
  completedCount,
  weeklyCompleted = 0,
  countsKnown = true,
  onSelectWorkout,
  onStartQuick,
}: WorkoutHomeProps) {
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { athleteId } = useAthleteId();
  const { level, setLevel } = useWorkoutAssistance(athleteId);
  const activeWorkout = trainings.find(isExecutableTraining) || trainings[0];
  const executable = isExecutableTraining(activeWorkout);
  const count =
    activeWorkout?.training_data?.exercises?.length ??
    activeWorkout?.training_data?.exercise_count;
  const minutes = activeWorkout?.training_data?.estimated_duration;
  return (
    <div className="space-y-6">
      <OpticStage
        id="train-workout"
        next={{ id: "train-history", label: "Seu histórico" }}
      >
        <section
          className="optic-session-card overflow-hidden rounded-3xl border border-white/10 bg-[#17191d]"
          aria-label="Sua sessão disponível"
        >
          <div className="relative h-36 overflow-hidden sm:h-48">
            <img
              src={trainHeroBanner}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111416] via-black/30 to-black/20" />
            <p className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white">
              {executable
                ? "Prescrição disponível"
                : activeWorkout
                ? "Em preparação"
                : "Vamos encontrar seu começo"}
            </p>
          </div>
          <div className="relative space-y-4 px-5 pb-6 sm:px-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                01 / Sua sessão
              </p>
              <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                {activeWorkout?.training_name ||
                  "Seu primeiro treino começa por aqui."}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
                {executable
                  ? activeWorkout.training_description ||
                    "Confira os exercícios, séries e descansos antes de iniciar."
                  : activeWorkout
                  ? "Seu profissional ainda precisa confirmar os exercícios e as doses desta sessão. Você pode consultar o protocolo enquanto isso."
                  : "Consulte os conteúdos disponíveis ou encontre um profissional para preparar sua prescrição."}
              </p>
            </div>
            {activeWorkout && (
              <div className="flex flex-wrap gap-2 text-xs text-white/70">
                {minutes != null && minutes > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
                    <Clock size={14} aria-hidden="true" />
                    {minutes} min estimados
                  </span>
                )}
                {count != null && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2">
                    <Dumbbell size={14} aria-hidden="true" />
                    {count} {count === 1 ? "exercício" : "exercícios"}
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                executable && activeWorkout
                  ? onSelectWorkout(activeWorkout)
                  : navigate(activeWorkout ? "/9fit/protocolo" : "/9fit/staff")
              }
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#EF7A45] px-5 text-sm font-semibold text-[#241007] transition-colors hover:bg-[#ff9465] sm:w-auto"
            >
              <Play size={17} aria-hidden="true" />
              {executable
                ? "Conferir e iniciar sessão"
                : activeWorkout
                ? "Consultar meu protocolo"
                : "Encontrar orientação profissional"}
            </button>
            {!activeWorkout && (
              <button
                type="button"
                onClick={() => navigate("/9fit/healthflix")}
                className="block min-h-11 text-sm text-primary underline underline-offset-4"
              >
                Explorar treinos em vídeo
              </button>
            )}
          </div>
        </section>
      </OpticStage>
      {trainings.length > 1 && (
        <StudentDetailGroup
          title="Outras prescrições disponíveis"
          description="Veja as outras sessões vinculadas ao seu perfil."
        >
          <div className="space-y-2">
            {trainings
              .filter((t) => t.id !== activeWorkout?.id)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() =>
                    isExecutableTraining(t)
                      ? onSelectWorkout(t)
                      : navigate("/9fit/protocolo")
                  }
                  className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-4 py-3 text-left text-sm"
                >
                  <span>{t.training_name}</span>
                  <span className="text-xs text-primary">
                    {isExecutableTraining(t)
                      ? "Conferir sessão"
                      : "Em preparação"}
                  </span>
                </button>
              ))}
          </div>
        </StudentDetailGroup>
      )}
      <OpticStage id="train-history">
        <section>
          <StudentBlockTitle
            number="02"
            title="Seu treino tem continuidade"
            description="A sessão de hoje se conecta ao que você já registrou."
          />
          {countsKnown && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#121416] p-4">
                <p className="text-xs text-muted-foreground">
                  Concluídos nesta semana
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {weeklyCompleted}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#121416] p-4">
                <p className="text-xs text-muted-foreground">
                  Sessões no histórico
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {completedCount}
                </p>
              </div>
            </div>
          )}
          <StudentActionCard
            icon={History}
            title="Rever sessões anteriores"
            description="Consulte o histórico antes de comparar cargas e esforço."
            onClick={() => setHistoryOpen(true)}
          />
        </section>
      </OpticStage>
      <StudentDetailGroup
        title="Precisa de outra forma de treinar?"
        description="Ajuste o apoio ou veja alternativas sem substituir sua prescrição automaticamente."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <StudentActionCard
            icon={Zap}
            title="Tenho pouco tempo"
            description="Abra o treino rápido e confira a proposta antes de começar."
            onClick={onStartQuick}
          />
          <StudentActionCard
            icon={Brain}
            title="Tenho uma dúvida"
            description="Converse com RON sobre a prescrição e prepare uma revisão com seu professor."
            to="/9fit/ron?context=train"
          />
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Shield size={17} className="text-primary" aria-hidden="true" />
            Como prefere ser acompanhado?
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {ASSISTANCE_LEVELS[level].label} · {ASSISTANCE_LEVELS[level].desc}
          </p>
          <Slider
            aria-label="Modo de assistência no treino"
            value={[level]}
            onValueChange={(v) => setLevel(v[0])}
            max={2}
            step={1}
            className="my-5"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Essa preferência organiza a ajuda durante o uso. Atendimento
            profissional depende das condições do serviço.
          </p>
          {level === 2 && (
            <button
              type="button"
              onClick={() => navigate("/9fit/staff")}
              className="mt-3 min-h-11 text-sm text-primary underline"
            >
              Consultar apoio profissional
            </button>
          )}
        </div>
      </StudentDetailGroup>
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="fitpro-orange max-h-[90dvh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>Treinos anteriores</DialogTitle>
            <DialogDescription>
              Consulte sessões realizadas e prescrições anteriores.
            </DialogDescription>
          </DialogHeader>
          {historyOpen && <TrainingHistory />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
