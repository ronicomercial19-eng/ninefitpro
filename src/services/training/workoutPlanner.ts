/**
 * Workout Planner — projeta a sessão do dia a partir de
 * `athlete_periodizations`, treinos atribuídos e estado bio recente.
 * Não cria tabelas novas; consome o schema existente.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PlannedSession {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Push A — Peito + Tríceps"
  durationMin: number;
  intensityPct: number; // recomendada
  source: "periodization" | "assignment" | "fallback";
  trainingId?: string;
  trainingType?: string;
  htmlUrl?: string;
  trainingData?: any;
}

const DAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

export async function planWeek(athleteId: string): Promise<PlannedSession[]> {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  const week: PlannedSession[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    week.push({
      date: d.toISOString().slice(0, 10),
      label: `${DAY_LABELS[d.getDay()]} • Recuperação`,
      durationMin: 0,
      intensityPct: 30,
      source: "fallback",
    });
  }

  // Hidrata com assignments ativos
  try {
    const { data: assigns } = await supabase
      .from("student_training_assignments")
      .select("id, training_name, training_type, html_file_url, training_data, start_date, end_date, is_active")
      .eq("student_id", athleteId)
      .eq("is_active", true);

    (assigns ?? []).forEach((a: any) => {
      const td = a.training_data || {};
      const days: number[] = Array.isArray(td.weekDays) ? td.weekDays : [1, 3, 5];
      week.forEach((slot, idx) => {
        const dow = new Date(slot.date).getDay();
        if (days.includes(dow) && slot.source === "fallback") {
          week[idx] = {
            ...slot,
            label: a.training_name,
            durationMin: td.estimated_duration || 60,
            intensityPct: td.intensity || 72,
            source: "assignment",
            trainingId: a.id,
            trainingType: a.training_type,
            htmlUrl: a.html_file_url,
            trainingData: td,
          };
        }
      });
    });
  } catch (e) {
    console.warn("[planner] assignments fetch skipped", e);
  }

  return week;
}

export function pickWorkoutOfTheDay(week: PlannedSession[]): PlannedSession | null {
  const today = new Date().toISOString().slice(0, 10);
  return week.find((s) => s.date === today && s.source !== "fallback") ?? null;
}
