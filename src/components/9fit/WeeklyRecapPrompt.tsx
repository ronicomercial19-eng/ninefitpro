import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { AchievementShareSheet, type Achievement } from "@/components/9fit/AchievementShareSheet";

/** Chave de semana ISO (ex: "2026-W36") — usada só para não repetir o recap na mesma semana. */
function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

const STORAGE_KEY = "9fit_weekly_recap_shown";

/**
 * Monta o card de "Resumo da semana" com dados reais (nunca zerado, nunca inventado).
 * Retorna null se não houver pelo menos 1 atividade real na semana.
 */
async function buildWeeklyRecap(athleteId: string, userId: string): Promise<Achievement | null> {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const [{ count: workouts }, { count: prs }, { data: scores }] = await Promise.all([
    supabase.from("workout_executions").select("id", { count: "exact", head: true })
      .eq("athlete_id", athleteId).eq("status", "completed").gte("completed_at", sinceIso),
    supabase.from("personal_records").select("id", { count: "exact", head: true })
      .eq("athlete_id", athleteId).gte("created_at", sinceIso),
    supabase.from("sync_score_logs").select("score")
      .eq("user_id", userId).gte("created_at", sinceIso).order("created_at", { ascending: false }),
  ]);

  const workoutCount = workouts ?? 0;
  const prCount = prs ?? 0;
  const avgScore = scores && scores.length > 0
    ? Math.round(scores.reduce((s, r: any) => s + Number(r.score || 0), 0) / scores.length)
    : null;

  // Nunca mostrar recap vazio — exige pelo menos 1 atividade real na semana
  if (workoutCount === 0 && prCount === 0 && avgScore === null) return null;

  const parts: string[] = [];
  if (workoutCount > 0) parts.push(`${workoutCount} treino${workoutCount > 1 ? "s" : ""} concluído${workoutCount > 1 ? "s" : ""}`);
  if (prCount > 0) parts.push(`${prCount} novo${prCount > 1 ? "s" : ""} recorde${prCount > 1 ? "s" : ""}`);

  return {
    contentType: "weekly_recap",
    kicker: "Resumo da semana",
    title: workoutCount > 0 ? `${workoutCount} treino${workoutCount > 1 ? "s" : ""}` : prCount > 0 ? `${prCount} recorde${prCount > 1 ? "s" : ""}` : "Sync Score",
    value: avgScore != null ? `${avgScore}/100` : undefined,
    subtitle: parts.length > 0 ? parts.join(" · ") : "Sync Score médio da semana",
  };
}

/**
 * Dispara automaticamente o convite de compartilhar o recap semanal, no máximo 1x por semana
 * ISO, e só quando há atividade real. Renderizar uma vez perto da raiz do app autenticado
 * (ex.: dentro do layout do Hub) — não bloqueia nada, é 100% dispensável.
 */
export function WeeklyRecapPrompt() {
  const { athleteId } = useAthleteId();
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    if (!athleteId) return;
    const weekKey = isoWeekKey();
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === weekKey) return;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const recap = await buildWeeklyRecap(athleteId, user.id);
      window.localStorage.setItem(STORAGE_KEY, weekKey); // marca como visto mesmo se vazio, pra não checar toda hora
      if (recap) setAchievement(recap);
    })();
  }, [athleteId]);

  return <AchievementShareSheet achievement={achievement} onClose={() => setAchievement(null)} />;
}
