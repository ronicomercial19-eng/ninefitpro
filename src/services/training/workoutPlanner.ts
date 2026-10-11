/**
 * Workout Planner — projeta a sessão do dia a partir de
 * `athlete_periodizations`, treinos atribuídos e estado bio recente.
 * Não cria tabelas novas; consome o schema existente.
 */
import { format } from "date-fns";
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
      date: format(d, "yyyy-MM-dd"),
      label: `${DAY_LABELS[d.getDay()]} • Sem treino atribuído`,
      durationMin: 0,
      intensityPct: 0,
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
      const days: number[] = Array.isArray(td.weekDays) ? td.weekDays : [];
      const todayKey = format(new Date(), "yyyy-MM-dd");
      const starts = !a.start_date || a.start_date <= week[6].date;
      const ends = !a.end_date || a.end_date >= week[0].date;
      if (!starts || !ends) return;
      week.forEach((slot, idx) => {
        const dow = new Date(`${slot.date}T12:00:00`).getDay();
        if ((days.includes(dow) || (!days.length && slot.date === a.start_date)) && (!a.start_date || a.start_date <= slot.date) && (!a.end_date || a.end_date >= slot.date) && slot.source === "fallback") {
          week[idx] = {
            ...slot,
            label: a.training_name,
            durationMin: Number(td.estimated_duration ?? td.requested_duration_min ?? 0),
            intensityPct: Number(td.intensity ?? 0),
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
