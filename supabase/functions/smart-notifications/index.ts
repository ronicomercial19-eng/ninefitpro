import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 1. Find athletes inactive >3 days
    const { data: allAthletes } = await supabase
      .from("athletes")
      .select("id, name, coach_id, user_id")
      .eq("activated", true);

    if (!allAthletes || allAthletes.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No athletes found", notifications: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsCreated = 0;

    for (const athlete of allAthletes) {
      // Check last workout
      const { data: lastWorkout } = await supabase
        .from("workout_progress")
        .select("date")
        .eq("aluno_id", athlete.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastDate = lastWorkout?.date;
      const isInactive = !lastDate || lastDate < threeDaysAgo;

      if (isInactive && athlete.user_id) {
        // Create notification for athlete
        await supabase.from("notifications").insert({
          user_id: athlete.user_id,
          title: "Sentimos sua falta! 💪",
          message: "Faz alguns dias que você não treina. Que tal um treino rápido hoje?",
          type: "reminder",
          action_url: "/9fit/train",
        });
        notificationsCreated++;
      }

      // 2. Check high RPE (>8 avg in last 5 workouts)
      const { data: recentRpe } = await supabase
        .from("workout_progress")
        .select("rpe")
        .eq("aluno_id", athlete.id)
        .not("rpe", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);

      if (recentRpe && recentRpe.length >= 3) {
        const avgRpe = recentRpe.reduce((s: number, r: any) => s + (r.rpe || 0), 0) / recentRpe.length;

        if (avgRpe > 8) {
          // Alert coach about overtraining
          const coachUserId = athlete.coach_id;
          // coach_id is already the auth user id for coaches
          await supabase.from("notifications").insert({
            user_id: coachUserId,
            title: `⚠️ Sobrecarga: ${athlete.name}`,
            message: `RPE médio de ${avgRpe.toFixed(1)} nos últimos treinos. Considere reduzir intensidade.`,
            type: "alert",
            action_url: "/app/alunos",
          });
          notificationsCreated++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications: notificationsCreated, athletes_checked: allAthletes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
