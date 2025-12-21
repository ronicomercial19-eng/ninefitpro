import { useState, useEffect } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronRight, Dumbbell, FileText, Eye, Loader2, Play } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

      if (!link) {
        // Try to find by email in athletes table
        const { data: athlete } = await supabase
          .from("athletes")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (athlete) {
          // Fetch trainings for this athlete
          const { data, error } = await supabase
            .from("student_training_assignments")
            .select("*")
            .eq("student_id", athlete.id)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (!error && data) {
            setTrainings(data as TrainingAssignment[]);
          }
        }
      } else {
        // Fetch trainings for linked athlete
        const { data, error } = await supabase
          .from("student_training_assignments")
          .select("*")
          .eq("student_id", link.athlete_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setTrainings(data as TrainingAssignment[]);
        }
      }
    } catch (error) {
      console.error("Error fetching trainings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTraining = (training: TrainingAssignment) => {
    if (training.training_type === "html" && training.html_file_url) {
      setSelectedTraining(training);
    } else {
      toast.info("Visualização em desenvolvimento");
    }
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
                    : "bg-dark-800 border-dark-700 text-gray-500 hover:border-dark-600"
                }`}
              >
                <span className="text-[10px] uppercase font-bold">
                  {format(day, "EEE")}
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
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-neon-400" />
          </div>
        ) : trainings.length === 0 ? (
          <div className="text-center py-12 bg-dark-800 border border-dark-700 rounded-sm">
            <Dumbbell className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">
              Nenhum Treino Disponível
            </h3>
            <p className="text-sm text-muted-foreground">
              Seu professor ainda não atribuiu treinos para você.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {trainings.map((training) => (
              <button
                key={training.id}
                onClick={() => handleOpenTraining(training)}
                className="w-full bg-dark-800 border border-dark-700 rounded-sm p-4 text-left hover:border-neon-400/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-sm flex items-center justify-center flex-shrink-0 ${
                    training.training_type === "html" 
                      ? "bg-blue-500/20 border border-blue-500/30" 
                      : "bg-neon-400/20 border border-neon-400/30"
                  }`}>
                    {training.training_type === "html" ? (
                      <FileText className="w-6 h-6 text-blue-400" />
                    ) : (
                      <Dumbbell className="w-6 h-6 text-neon-400" />
                    )}
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
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-gray-500 uppercase">
                        Início: {new Date(training.start_date).toLocaleDateString("pt-BR")}
                      </span>
                      {training.training_type === "html" && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                          HTML
                        </span>
                      )}
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

      {/* HTML Training Viewer Dialog */}
      <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
        <DialogContent className="max-w-[95vw] h-[90vh] p-0 bg-white">
          <DialogHeader className="px-4 py-3 bg-dark-800 border-b border-dark-700">
            <DialogTitle className="text-foreground">
              {selectedTraining?.training_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-white">
            {selectedTraining?.html_file_url && (
              <iframe
                src={selectedTraining.html_file_url}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full min-h-[70vh] border-0"
                title={selectedTraining.training_name}
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
