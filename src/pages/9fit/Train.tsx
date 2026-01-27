import { useState, useEffect } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronRight, Dumbbell, FileText, Eye, Loader2, Play, Globe, Code2, X } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SkeletonCard } from "@/components/9fit/SkeletonCard";
import { EmptyState } from "@/components/9fit/EmptyState";

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

export default function NineFitTrain() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<TrainingAssignment | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get athlete linked to this user
      const { data: link } = await supabase
        .from("athlete_auth_link")
        .select("athlete_id")
        .eq("user_id", user.id)
        .single();

      let athleteId = link?.athlete_id;

      if (!athleteId) {
        // Try to find by user_id in athletes table
        const { data: athlete } = await supabase
          .from("athletes")
          .select("id")
          .eq("user_id", user.id)
          .single();
        
        athleteId = athlete?.id;
      }

      if (athleteId) {
        const { data, error } = await supabase
          .from("student_training_assignments")
          .select("*")
          .eq("student_id", athleteId)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!error && data) {
          // Filter by date - show trainings that are valid for today
          const today = new Date().toISOString().split('T')[0];
          const validTrainings = data.filter((t: TrainingAssignment) => {
            const startValid = t.start_date <= today;
            const endValid = !t.end_date || t.end_date >= today;
            return startValid && endValid;
          });
          setTrainings(validTrainings as TrainingAssignment[]);
        }
      }
    } catch (error) {
      console.error("Error fetching trainings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTraining = (training: TrainingAssignment) => {
    if (training.html_file_url || training.training_type === 'link') {
      setSelectedTraining(training);
      setIsFullscreen(true);
    } else {
      toast.info("Visualização em desenvolvimento");
    }
  };

  const getTrainingIcon = (training: TrainingAssignment) => {
    if (training.training_type === 'link') {
      return <Globe className="w-6 h-6 text-green-400" />;
    }
    if (training.training_type === 'html') {
      const source = training.training_data?.source;
      if (source === 'html_code_paste') {
        return <Code2 className="w-6 h-6 text-cyan-400" />;
      }
      return <FileText className="w-6 h-6 text-blue-400" />;
    }
    return <Dumbbell className="w-6 h-6 text-neon-400" />;
  };

  const getTrainingTypeLabel = (training: TrainingAssignment) => {
    if (training.training_type === 'link') return 'LINK';
    if (training.training_type === 'html') {
      const source = training.training_data?.source;
      if (source === 'html_code_paste') return 'CÓDIGO';
      return 'HTML';
    }
    return 'TREINO';
  };

  const getTrainingBgColor = (training: TrainingAssignment) => {
    if (training.training_type === 'link') {
      return "bg-green-500/20 border-green-500/30";
    }
    if (training.training_type === 'html') {
      const source = training.training_data?.source;
      if (source === 'html_code_paste') {
        return "bg-cyan-500/20 border-cyan-500/30";
      }
      return "bg-blue-500/20 border-blue-500/30";
    }
    return "bg-neon-400/20 border-neon-400/30";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-foreground">
          Meus Treinos
        </h1>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
          9FIT PRO Training System
        </p>
      </div>

      {/* Calendar Strip */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {weekDays.map((day) => {
            const isSelected =
              format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
            const isToday =
              format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center justify-center w-12 h-16 rounded-sm border transition-all flex-shrink-0 ${
                  isSelected
                    ? "bg-neon-400 border-neon-400 text-primary-foreground"
                    : "bg-dark-800 border-dark-700 text-muted-foreground hover:border-dark-600"
                }`}
              >
                <span className="text-[10px] uppercase font-bold">
                  {format(day, "EEE", { locale: ptBR })}
                </span>
                <span className="text-xl font-black">{format(day, "d")}</span>
                {isToday && !isSelected && (
                  <div className="w-1 h-1 bg-neon-400 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trainings List */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-neon-400" />
            Treinos Ativos
          </h2>
          <span className="text-xs text-muted-foreground">
            {trainings.length} treino{trainings.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : trainings.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Nenhum Treino Disponível"
            description="Seu professor ainda não atribuiu treinos para você."
          />
        ) : (
          <div className="space-y-3">
            {trainings.map((training) => (
              <button
                key={training.id}
                onClick={() => handleOpenTraining(training)}
                className="w-full bg-dark-800 border border-dark-700 rounded-sm p-4 text-left hover:border-neon-400/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-sm flex items-center justify-center flex-shrink-0 border ${getTrainingBgColor(training)}`}>
                    {getTrainingIcon(training)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate group-hover:text-neon-400 transition-colors">
                      {training.training_name}
                    </h3>
                    {training.training_description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {training.training_description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] text-muted-foreground uppercase">
                        Início: {new Date(training.start_date).toLocaleDateString("pt-BR")}
                      </span>
                      {training.end_date && (
                        <span className="text-[10px] text-muted-foreground uppercase">
                          Fim: {new Date(training.end_date).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        training.training_type === 'link' 
                          ? 'bg-green-500/20 text-green-400'
                          : training.training_type === 'html'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {getTrainingTypeLabel(training)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-neon-400 rounded-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Play className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Training Viewer Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 m-0 bg-white rounded-none">
          {/* Custom Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-700">
            <div className="flex items-center gap-3">
              {selectedTraining && getTrainingIcon(selectedTraining)}
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  {selectedTraining?.training_name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedTraining && getTrainingTypeLabel(selectedTraining)}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedTraining(null)}
              className="text-foreground hover:bg-dark-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Content Area - Full Height */}
          <div className="flex-1 w-full h-[calc(100vh-60px)] bg-white overflow-hidden">
            {selectedTraining?.html_file_url && (
              <iframe
                src={selectedTraining.html_file_url}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                className="w-full h-full border-0"
                title={selectedTraining.training_name}
                style={{ minHeight: 'calc(100vh - 60px)' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
