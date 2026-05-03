/**
 * apiService — Camada unificada de acesso a dados
 * 
 * Atualmente usa Supabase diretamente. Quando os Agentes da Vercel estiverem prontos,
 * substitua o corpo de cada função por: `await fetch(`${BASE_URL}/...`)`
 * 
 * Endpoints futuros (api.9fit.com/v1):
 *  /user/profile, /home/feed, /training/active, /content/stream,
 *  /nutrition/had, /logistics/scheduler, /commerce/offers, /reports/360
 */

import { supabase } from "@/integrations/supabase/client";

// const BASE_URL = "https://api.9fit.com/v1";

export interface UserProfile {
  name: string;
  avatarUrl: string;
  level: number;
  healthScore: number;
  recoveryStatus: string;
}

export interface TrainingActive {
  workoutId: string;
  name: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: number;
    reps: string;
    load: string;
    videoUrl?: string;
    notes?: string;
  }>;
  iaMargin: number;
  overrideProfessor: boolean;
}

export interface NutritionDaily {
  kcalTarget: number;
  kcalConsumed: number;
  macros: { protein: number; carbs: number; fats: number };
  adherence: number;
  streakDays: number;
}

export interface ScheduleData {
  confirmedClasses: Array<{ date: string; time: string; instructor: string; location: string }>;
  availableSlots: string[];
}

export interface CommerceOffer {
  active: boolean;
  offer?: { title: string; description: string; link: string };
}

export interface EvolutionData {
  beforePhoto?: string;
  afterPhoto?: string;
  progressChartData: number[];
  pdfUrl?: string;
}

// === Helpers ===
async function getAthleteIdForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("athletes")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data.id;
  const { data: link } = await supabase
    .from("athlete_auth_link")
    .select("athlete_id")
    .eq("user_id", userId)
    .maybeSingle();
  return link?.athlete_id || null;
}

// === API ===
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data: athlete } = await supabase
    .from("athletes")
    .select("name")
    .eq("user_id", userId)
    .maybeSingle() as { data: { name?: string } | null };

  return {
    name: athlete?.name || "Atleta",
    avatarUrl: "",
    level: 2,
    healthScore: 87,
    recoveryStatus: "Pronto para treinar",
  };
}

export async function getTrainingActive(userId: string): Promise<TrainingActive | null> {
  const athleteId = await getAthleteIdForUser(userId);
  if (!athleteId) return null;

  const { data } = await supabase
    .from("student_training_assignments")
    .select("*")
    .eq("student_id", athleteId)
    .eq("training_type", "workout")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const td: any = data.training_data || {};
  const exercises = (td.exercises || []).map((e: any, i: number) => ({
    id: e.id || `ex-${i}`,
    name: e.name || "Exercício",
    sets: e.sets || 3,
    reps: e.reps || "10-12",
    load: e.load || e.weight || "—",
    videoUrl: e.video_url || e.videoUrl,
    notes: e.notes,
  }));

  return {
    workoutId: data.id,
    name: td.name || "Treino do Dia",
    exercises,
    iaMargin: 0.15,
    overrideProfessor: !!td.override_locked,
  };
}

export async function getNutritionDaily(userId: string): Promise<NutritionDaily> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("nutrition_logs")
    .select("kcal, protein, carbs, fats")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00`);

  const totals = (data || []).reduce(
    (acc, r: any) => ({
      kcal: acc.kcal + (r.kcal || 0),
      protein: acc.protein + (r.protein || 0),
      carbs: acc.carbs + (r.carbs || 0),
      fats: acc.fats + (r.fats || 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 }
  );

  return {
    kcalTarget: 2100,
    kcalConsumed: totals.kcal,
    macros: { protein: totals.protein, carbs: totals.carbs, fats: totals.fats },
    adherence: 88,
    streakDays: 7,
  };
}

export async function getSchedule(userId: string): Promise<ScheduleData> {
  const athleteId = await getAthleteIdForUser(userId);
  if (!athleteId) return { confirmedClasses: [], availableSlots: ["08:00", "10:00", "18:00"] };

  const { data } = await supabase
    .from("appointments")
    .select("scheduled_at, title")
    .eq("student_id", athleteId)
    .neq("status", "cancelled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(5);

  return {
    confirmedClasses: (data || []).map((a: any) => ({
      date: a.scheduled_at?.slice(0, 10) || "",
      time: a.scheduled_at?.slice(11, 16) || "",
      instructor: "Prof.",
      location: a.title || "",
    })),
    availableSlots: ["08:00", "10:00", "18:00"],
  };
}

export async function getCommerceOffers(_userId: string): Promise<CommerceOffer> {
  return { active: false };
}

export async function getReportsEvolution(userId: string): Promise<EvolutionData> {
  const athleteId = await getAthleteIdForUser(userId);
  if (!athleteId) return { progressChartData: [] };

  const { data } = await supabase
    .from("avaliacoes_unificadas")
    .select("peso, data_avaliacao")
    .eq("aluno_id", athleteId)
    .order("data_avaliacao", { ascending: true })
    .limit(10);

  return {
    progressChartData: (data || []).map((r: any) => Number(r.peso) || 0),
  };
}

// === Context Engine ===
export type HomeContext = "manha" | "treino" | "noite";
export function getCurrentContext(now: Date = new Date()): HomeContext {
  const h = now.getHours();
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 20) return "treino";
  return "noite";
}
