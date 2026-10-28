import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyContext } from "@/services/dailyContextRules";
import { withTimeout } from '@/lib/withTimeout';
export interface CoachContext {
  version: number;
  generated_at: string;
  athlete: {
    id: string;
    name: string;
    goal: string | null;
    goal_source?: 'student_declared' | 'athlete_registration';
    registered_goal?: string | null;
    restrictions: string | null;
  };
  daily_context: DailyContext;
  workouts: any[];
  prescriptions: any[];
  assessments: any[];
  pain_reports: any[];
  activities: any[];
  habits: any[];
  protocols: any[];
  appointments: any[];
  nutrition: { meals: number; days: number };
  hydration: { water_ml: number; days: number };
}
export function useCoachStudentContext(athleteId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["coach-student-context", user?.id, athleteId],
    enabled: !!user && !!athleteId,
    staleTime: 30000,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async ({signal}) => {
      const { data, error } = await withTimeout(supabase.rpc(
        "fn_coach_student_context" as any,
        { p_athlete_id: athleteId },
      ).abortSignal(signal));
      if (error) throw error;
      const value = data as unknown as CoachContext;
      if (value?.version !== 1 || value.athlete?.id !== athleteId)
        throw new Error("Contexto do aluno não confirmado");
      return value;
    },
  });
}
