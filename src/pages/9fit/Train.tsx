import { useState, useEffect } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dumbbell, Loader2 } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";
import { useAthleteId } from "@/hooks/useAthleteId";
import { WorkoutHome } from "@/components/9fit/WorkoutHome";
import { WorkoutOverview } from "@/components/9fit/WorkoutOverview";
import { WorkoutExecution } from "@/components/9fit/WorkoutExecution";
import { DailyProtocol } from "@/components/9fit/DailyProtocol";
import { UpsellBanner } from "@/components/9fit/UpsellBanner";
import { EcosystemGrid } from "@/components/9fit/EcosystemGrid";
import { DynamicOffers } from "@/components/9fit/DynamicOffers";
import { QuickTrainModal } from "@/components/9fit/QuickTrainModal";
import { useNavigate } from "react-router-dom";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";
import { Film, Dumbbell as DumbIcon, Target, Zap } from "lucide-react";

interface TrainingAssignment {
  id: string;
  training_name: string;
  training_description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  training_type?: string;
  html_file_url?: string;
  training_data?: any;
}

type WorkoutFlow = "HOME" | "OVERVIEW" | "EXECUTION";

export default function NineFitTrain() {
  const { athleteId, athleteName, loading: athleteLoading } = useAthleteId();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedCount, setCompletedCount] = useState(0);
  const [subTab, setSubTab] = useState<"train" | "protocol" | "healthflix">("train");
  const [quickOpen, setQuickOpen] = useState(false);

  // Workout flow state
  const [flow, setFlow] = useState<WorkoutFlow>("HOME");
  const [selectedTraining, setSelectedTraining] = useState<TrainingAssignment | null>(null);

  useEffect(() => {
    if (!athleteLoading && athleteId) {
      fetchTrainings(athleteId);
      fetchCompletedCount(athleteId);
    } else if (!athleteLoading && !athleteId) {
      setLoading(false);
    }
  }, [athleteId, athleteLoading]);

  // Realtime: novos treinos/atualizações entram sozinhos
  useRealtimeTable(
    {
      table: "student_training_assignments",
      filter: athleteId ? `student_id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => { if (athleteId) { fetchTrainings(athleteId); fetchCompletedCount(athleteId); } },
  );
  useRealtimeTable(
    {
      table: "workout_executions",
      filter: athleteId ? `athlete_id=eq.${athleteId}` : undefined,
      enabled: !!athleteId,
    },
    () => { if (athleteId) fetchCompletedCount(athleteId); },
  );

  const fetchTrainings = async (aid: string) => {
    try {
      const { data, error } = await supabase
        .from("student_training_assignments")
        .select("*")
        .eq("student_id", aid)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const today = new Date().toISOString().split('T')[0];
        const valid = data.filter((t: any) => {
          const startValid = t.start_date <= today;
          const endValid = !t.end_date || t.end_date >= today;
          return startValid && endValid;
        });
        setTrainings(valid as TrainingAssignment[]);
      }
    } catch (error) {
      console.error("[Train] Error:", error);
      toast.error("Erro ao carregar treinos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedCount = async (aid: string) => {
    const { count } = await supabase
      .from("workout_progress")
      .select("id", { count: "exact", head: true })
      .or(`aluno_id.eq.${aid},athlete_id.eq.${aid}`);
    setCompletedCount(count || 0);
  };

  const handleSelectWorkout = (training: TrainingAssignment) => {
    setSelectedTraining(training);
    setFlow("OVERVIEW");
  };

  const handleStartExecution = () => {
    if (selectedTraining?.training_type === 'link' && selectedTraining.html_file_url) {
      window.open(selectedTraining.html_file_url, '_blank');
      return;
    }
    setFlow("EXECUTION");
  };

  const handleFinish = () => {
    setFlow("HOME");
    setSelectedTraining(null);
    if (athleteId) {
      fetchCompletedCount(athleteId);
    }
  };

  const handleBack = () => {
    if (flow === "EXECUTION") {
      setFlow("OVERVIEW");
    } else if (flow === "OVERVIEW") {
      setFlow("HOME");
      setSelectedTraining(null);
    }
  };

  // Execution mode - fullscreen, no bottom nav
  if (flow === "EXECUTION" && selectedTraining && athleteId) {
    return (
      <WorkoutExecution
        training={selectedTraining}
        athleteId={athleteId}
        onFinish={handleFinish}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen gradient-mission pb-28">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // TRAIN</p>
        <h1 className="text-massive text-3xl text-foreground mt-1">
          {flow === "HOME" ? "MEUS TREINOS" : "VISÃO GERAL"}
        </h1>
      </div>

      {/* Upsell contextual no topo de Train */}
      <div className="px-4 mb-3">
        <UpsellBanner
          context="feature_locked"
          storageKey="train_top"
          variant="cyan"
          headline="IA personaliza cada treino em tempo real no PRIME"
          cta="Ativar 7 dias grátis"
        />
      </div>


      {/* Internal sub-tabs */}
      {flow === "HOME" && (
        <div className="px-4 mb-3">
          <div className="glass-mission rounded-full p-1 flex gap-1">
            {[
              { k: "train", l: "Treinos", I: DumbIcon },
              { k: "protocol", l: "Protocolo", I: Target },
              { k: "healthflix", l: "Streaming", I: Film },
            ].map(({ k, l, I }) => (
              <button
                key={k}
                onClick={() => {
                  if (k === "healthflix") navigate("/9fit/healthflix");
                  else setSubTab(k as any);
                }}
                className={`flex-1 py-2 rounded-full text-[10px] font-display uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  subTab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <I className="w-3.5 h-3.5" />
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        {loading || athleteLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : flow === "OVERVIEW" && selectedTraining ? (
          <WorkoutOverview
            training={selectedTraining}
            onBack={handleBack}
            onStart={handleStartExecution}
          />
        ) : subTab === "protocol" ? (
          <DailyProtocol />
        ) : (
          <>
            <button onClick={() => setQuickOpen(true)}
              className="w-full mb-3 rounded-2xl border border-primary/40 bg-primary/[0.08] py-3 flex items-center justify-center gap-2 font-bold text-primary hover:bg-primary/[0.14] transition">
              <Zap className="w-4 h-4" /> TREINO RÁPIDO (3 perguntas)
            </button>
            <WorkoutHome
              trainings={trainings}
              athleteName={athleteName || "Atleta"}
              completedCount={completedCount}
              onSelectWorkout={handleSelectWorkout}
              onStartQuick={() => setQuickOpen(true)}
            />
          </>
        )}
        <QuickTrainModal open={quickOpen} onClose={() => setQuickOpen(false)} />

        {flow === "HOME" && (
          <div className="mt-6 space-y-6">
            <DynamicOffers category="training" compact />
            <EcosystemGrid category="training" />
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
