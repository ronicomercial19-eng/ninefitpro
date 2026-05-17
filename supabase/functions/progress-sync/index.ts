// progress-sync — registra eventos de progresso (set_log, workout_complete, habit_check, mission_done)
// e propaga para master_registry para que o Hub/OS reaja em realtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const kind = String(body?.kind || "").trim();
    const payload = body?.payload ?? {};

    const ALLOWED = new Set([
      "set_log", "workout_complete", "habit_check", "mission_done",
      "hydration_log", "sleep_log", "mobility_log", "nutrition_log",
    ]);
    if (!ALLOWED.has(kind)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid kind" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) registra no master_registry (sempre)
    const { data: regRow, error: regErr } = await supabase
      .from("master_registry")
      .insert({
        user_id: userId,
        event_type: kind,
        source: "progress-sync",
        payload,
      })
      .select("id")
      .single();
    if (regErr) {
      return new Response(JSON.stringify({ success: false, error: regErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) efeitos colaterais por tipo
    if (kind === "set_log" && payload?.execution_id) {
      // upsert do set executado
      await supabase.from("workout_exercise_sets").upsert({
        execution_id: payload.execution_id,
        exercise_name: payload.exercise_name,
        exercise_order: payload.exercise_order ?? 0,
        set_number: payload.set_number ?? 1,
        actual_reps: payload.actual_reps ?? null,
        actual_weight: payload.actual_weight ?? null,
        rpe: payload.rpe ?? null,
        completed: payload.completed ?? true,
        notes: payload.notes ?? null,
      });
    }

    if (kind === "workout_complete" && payload?.execution_id) {
      await supabase
        .from("workout_executions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", payload.execution_id);
    }

    return new Response(
      JSON.stringify({ success: true, data: { registry_id: regRow.id, kind } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
