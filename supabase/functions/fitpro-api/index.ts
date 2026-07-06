// FitPro ↔ SmartPeriodizer integration API v1
// Authentication: x-api-key header validated against fitpro_connections.api_key_hash
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authenticate(req: Request, supabase: any) {
  const key = req.headers.get("x-api-key") || "";
  if (!key) return { ok: false, status: 401, error: "Missing x-api-key" };
  const hash = await sha256(key);
  const { data, error } = await supabase
    .from("fitpro_connections")
    .select("id, name, status, professor_id")
    .eq("api_key_hash", hash)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return { ok: false, status: 401, error: "Invalid API key" };
  return { ok: true, connection: data };
}

async function logEvent(supabase: any, connection_id: string, event_type: string, body: any = {}) {
  try {
    await supabase.from("fitpro_events").insert({
      connection_id, event_type, module: "SmartPeriodizer",
      fitpro_student_id: body.fitpro_student_id ?? null,
      fitpro_professor_id: body.fitpro_professor_id ?? null,
      entity_type: body.entity_type ?? null,
      entity_id: body.entity_id ?? null,
      payload: body.payload ?? body ?? {},
    });
  } catch (e) { console.warn("logEvent failed:", e); }
}

async function logGenerationFailure(supabase: any, params: {
  athlete_id?: string | null; plan_id?: string | null;
  assignment_id?: string | null; error_reason: string;
  payload?: any; error_detail?: any;
}) {
  try {
    await supabase.from("periodization_generation_failures").insert({
      athlete_id: params.athlete_id ?? null,
      plan_id: params.plan_id ?? null,
      assignment_id: params.assignment_id ?? null,
      origin: "edge",
      error_reason: params.error_reason,
      error_detail: params.error_detail ?? {},
      payload: params.payload ?? {},
    });
  } catch (e) { console.warn("logGenerationFailure failed:", e); }
}

function buildPlanejamentoBlock(snap: any) {
  const payload: any = snap?.payload || {};
  const mesos: any[] = Array.isArray(payload.mesocycles) ? payload.mesocycles : [];
  const ondasFromPayload: any[] = Array.isArray(payload.ondas) ? payload.ondas : [];
  const currentWeek = Number(snap?.cycle_week ?? 1);

  const ondas = (ondasFromPayload.length ? ondasFromPayload : mesos.map((m, i) => ({
    nome: m?.name || m?.phase || `Onda ${i + 1}`,
    phase: m?.phase ?? null,
    weeks: m?.weeks ?? null,
  }))).map((o: any, i: number) => ({
    ...o,
    status: i + 1 < currentWeek ? "done" : i + 1 === currentWeek ? "in_progress" : "pending",
  }));

  const now = new Date();
  const monthLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const today = now.toISOString().slice(0, 10);

  return {
    month_label: monthLabel,
    today,
    synced_at: snap?.updated_at ?? null,
    is_synced: snap?.status === "active",
    current_phase: snap?.current_phase ?? null,
    current_cycle: snap?.current_cycle ?? null,
    cycle_week: currentWeek,
    ondas,
    master_rules: payload.master_rules ?? {},
    macrocycles: payload.macrocycles ?? [],
    mesocycles: mesos,
  };
}

async function resolveAthlete(supabase: any, conn_id: string, fitpro_student_id: string) {
  const { data } = await supabase
    .from("fitpro_student_map")
    .select("athlete_id")
    .eq("connection_id", conn_id)
    .eq("fitpro_student_id", fitpro_student_id)
    .maybeSingle();
  return data?.athlete_id || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/fitpro-api/, "").replace(/\/+$/, "") || "/";
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // --- Public: health ---
    if (req.method === "GET" && (path === "/v1/health" || path === "/health")) {
      return json({ status: "ok", service: "fitpro-api", version: "1.0", time: new Date().toISOString() });
    }

    // All other endpoints require x-api-key
    const auth = await authenticate(req, supabase);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const conn = auth.connection!;

    // --- POST /v1/fitpro/connect ---
    if (req.method === "POST" && path === "/v1/fitpro/connect") {
      await supabase.from("fitpro_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
      await logEvent(supabase, conn.id, "smartperiodizer_connected", { payload: { name: conn.name } });
      return json({ status: "connected", connection_id: conn.id, name: conn.name });
    }

    // --- POST /v1/fitpro/sync ---
    if (req.method === "POST" && path === "/v1/fitpro/sync") {
      const body = await req.json().catch(() => ({}));
      const students: any[] = Array.isArray(body.students) ? body.students : [];
      let upserted = 0;
      for (const s of students) {
        if (!s.fitpro_student_id) continue;
        await supabase.from("fitpro_student_map").upsert({
          connection_id: conn.id,
          fitpro_student_id: String(s.fitpro_student_id),
          fitpro_professor_id: s.fitpro_professor_id ? String(s.fitpro_professor_id) : null,
          athlete_id: s.athlete_id || null,
          context: s.context || {},
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "connection_id,fitpro_student_id" });
        upserted++;
      }
      await supabase.from("fitpro_connections").update({ last_sync_at: new Date().toISOString() }).eq("id", conn.id);
      await logEvent(supabase, conn.id, "smartperiodizer_synced", { payload: { upserted } });
      return json({ synced: upserted });
    }

    // --- POST /v1/fitpro/student-context ---
    if (req.method === "POST" && path === "/v1/fitpro/student-context") {
      const body = await req.json();
      if (!body?.fitpro_student_id) return json({ error: "fitpro_student_id required" }, 400);
      await supabase.from("fitpro_student_map").upsert({
        connection_id: conn.id,
        fitpro_student_id: String(body.fitpro_student_id),
        fitpro_professor_id: body.fitpro_professor_id ? String(body.fitpro_professor_id) : null,
        athlete_id: body.athlete_id || null,
        context: body,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "connection_id,fitpro_student_id" });
      await logEvent(supabase, conn.id, "student_context_loaded", {
        fitpro_student_id: body.fitpro_student_id,
        fitpro_professor_id: body.fitpro_professor_id,
        payload: body,
      });
      return json({ status: "stored" });
    }

    // --- GET /v1/fitpro/periodization/current?fitpro_student_id=... ---
    if (req.method === "GET" && path === "/v1/fitpro/periodization/current") {
      const sid = url.searchParams.get("fitpro_student_id");
      if (!sid) return json({ error: "fitpro_student_id required" }, 400);
      const athleteId = await resolveAthlete(supabase, conn.id, sid);
      if (!athleteId) return json({ error: "Student not mapped. Call /sync first." }, 404);
      const { data: assign } = await supabase
        .from("athlete_periodizations")
        .select("id, annual_plan_id, status, match_percentage, notes, assigned_at")
        .eq("athlete_id", athleteId).in("status", ["active","in_progress"])
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!assign) return json({ status: "no_periodization", athlete_id: athleteId }, 404);
      let plan = null;
      if (assign.annual_plan_id) {
        const { data } = await supabase.from("periodization_annual_plans")
          .select("*").eq("id", assign.annual_plan_id).maybeSingle();
        plan = data;
      }
      return json({ assignment: assign, plan });
    }

    // --- GET /v1/fitpro/planejamento/ativa?fitpro_student_id=... ---
    if (req.method === "GET" && path === "/v1/fitpro/planejamento/ativa") {
      const sid = url.searchParams.get("fitpro_student_id");
      if (!sid) return json({ error: "fitpro_student_id required" }, 400);
      const athleteId = await resolveAthlete(supabase, conn.id, sid);
      const realId = athleteId || sid;
      const { data: active } = await supabase
        .from("vw_athlete_periodizacao_ativa")
        .select("*").eq("athlete_id", realId).maybeSingle();
      if (!active) return json({ status: "no_plan", athlete_id: realId }, 404);
      return json({
        active,
        week: {
          index: active.current_week_index,
          phase: active.current_phase,
          phase_category: active.current_phase_category,
          rpe_cap: active.rpe_cap,
          reps: active.reps_range,
          sets: active.sets_range,
          meso: active.current_meso,
          macro: active.current_macro,
        },
      });
    }

    // --- GET /v1/fitpro/planejamento?fitpro_student_id=... ---
    if (req.method === "GET" && path === "/v1/fitpro/planejamento") {
      const sid = url.searchParams.get("fitpro_student_id");
      if (!sid) return json({ error: "fitpro_student_id required" }, 400);
      const athleteId = await resolveAthlete(supabase, conn.id, sid);
      const realId = athleteId || sid;
      const { data: snap } = await supabase
        .from("fitpro_smartperiodizer_periodizations")
        .select("*")
        .eq("fitpro_student_id", realId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!snap) return json({ status: "no_plan", athlete_id: realId }, 404);

      const payload: any = snap.payload || {};
      const mesos: any[] = Array.isArray(payload.mesocycles) ? payload.mesocycles : [];
      const week = {
        phase: snap.current_phase,
        cycle: snap.current_cycle,
        cycle_week: snap.cycle_week ?? 1,
        rpe_cap: mesos[0]?.rpe_cap ?? null,
        reps: mesos[0]?.reps ?? null,
        sets: mesos[0]?.sets ?? null,
        progression_rules: payload.progression_rules ?? null,
        rules: payload.rules ?? null,
      };
      return json({ snapshot: snap, week, planejamento: buildPlanejamentoBlock(snap) });
    }

    // --- POST /v1/fitpro/periodization/generate ---
    if (req.method === "POST" && path === "/v1/fitpro/periodization/generate") {
      const body = await req.json();
      if (!body?.fitpro_student_id) return json({ error: "fitpro_student_id required" }, 400);
      const athleteId = body.athlete_id || await resolveAthlete(supabase, conn.id, body.fitpro_student_id);
      if (!athleteId) return json({ error: "Athlete not mapped" }, 404);

      try {
        const { data: plan, error } = await supabase.from("periodization_annual_plans").insert({
          athlete_id: athleteId,
          coach_id: conn.professor_id || athleteId,
          annual_goal: body.goal || "hipertrofia",
          dominant_profile: body.profile || {},
          scores: body.scores || {},
          flags: body.flags || [],
          selected_chief_id: body.chief_id || null,
          selected_model_id: body.variation_id || null,
          master_rules: body.master_rules || {},
          macrocycles: body.macrocycles || [],
          mesocycles: body.mesocycles || [],
          micro_rules: body.micro_rules || {},
          output_json: body.output_json || {},
          assessment_snapshot: body.assessment || {},
          status: "active",
        }).select("id").single();
        if (error) throw error;

        // Chamar sync automático
        const { error: syncErr } = await supabase.rpc("sync_fitpro_planejamento", { p_athlete_id: athleteId });
        if (syncErr) {
          console.warn("sync_fitpro_planejamento warning:", syncErr);
          await logGenerationFailure(supabase, {
            athlete_id: athleteId, plan_id: plan.id, error_reason: syncErr.message,
            payload: body, error_detail: { step: "sync_fitpro_planejamento" },
          });
        }

        await logEvent(supabase, conn.id, "periodization_created", {
          fitpro_student_id: body.fitpro_student_id,
          entity_type: "periodization", entity_id: plan.id,
          payload: { goal: body.goal, chief: body.chief_id, variation: body.variation_id },
        });
        return json({ plan_id: plan.id, status: "created" });
      } catch (err: any) {
        await logGenerationFailure(supabase, {
          athlete_id: athleteId, error_reason: err.message,
          payload: body, error_detail: { step: "insert_annual_plan" },
        });
        return json({ error: err.message }, 400);
      }
    }

    // --- PATCH /v1/fitpro/periodization/update ---
    if (req.method === "PATCH" && path === "/v1/fitpro/periodization/update") {
      const body = await req.json();
      if (!body?.plan_id) return json({ error: "plan_id required" }, 400);
      const updates: any = {};
      for (const k of ["macrocycles","mesocycles","micro_rules","master_rules","output_json","status","selected_chief_id","selected_model_id"]) {
        if (body[k] !== undefined) updates[k] = body[k];
      }
      
      try {
        const { error } = await supabase.from("periodization_annual_plans").update(updates).eq("id", body.plan_id);
        if (error) throw error;

        // Re-sync snapshot
        const { data: planRow } = await supabase.from("periodization_annual_plans")
          .select("athlete_id").eq("id", body.plan_id).maybeSingle();
        if (planRow?.athlete_id) {
          await supabase.rpc("sync_fitpro_planejamento", { p_athlete_id: planRow.athlete_id });
        }

        await logEvent(supabase, conn.id, "periodization_updated", {
          fitpro_student_id: body.fitpro_student_id,
          entity_type: "periodization", entity_id: body.plan_id,
          payload: updates,
        });
        return json({ status: "updated" });
      } catch (err: any) {
        await logGenerationFailure(supabase, {
          plan_id: body.plan_id, error_reason: err.message,
          payload: body, error_detail: { step: "update_annual_plan" },
        });
        return json({ error: err.message }, 400);
      }
    }

    // --- POST /v1/fitpro/periodization/adjust ---
    if (req.method === "POST" && path === "/v1/fitpro/periodization/adjust") {
      const body = await req.json();
      if (!body?.plan_id || !body?.dimension) return json({ error: "plan_id and dimension required" }, 400);
      const { data: plan } = await supabase.from("periodization_annual_plans")
        .select("master_rules, output_json").eq("id", body.plan_id).maybeSingle();
      const rules = { ...(plan?.master_rules || {}), [body.dimension]: body.value };
      const { error } = await supabase.from("periodization_annual_plans")
        .update({ master_rules: rules }).eq("id", body.plan_id);
      if (error) return json({ error: error.message }, 400);
      const eventMap: Record<string,string> = {
        volume: "volume_adjusted", intensity: "intensity_adjusted",
        recovery: "recovery_adjusted", phase: "phase_changed", deload: "deload_applied",
      };
      await logEvent(supabase, conn.id, eventMap[body.dimension] || "periodization_updated", {
        fitpro_student_id: body.fitpro_student_id,
        entity_type: "periodization", entity_id: body.plan_id,
        payload: { dimension: body.dimension, value: body.value },
      });
      return json({ status: "adjusted", dimension: body.dimension });
    }

    // --- POST /v1/fitpro/events ---
    if (req.method === "POST" && path === "/v1/fitpro/events") {
      const body = await req.json();
      if (!body?.event_type) return json({ error: "event_type required" }, 400);
      await logEvent(supabase, conn.id, body.event_type, body);
      return json({ status: "logged" });
    }

    return json({ error: "Not found", path, method: req.method }, 404);
  } catch (err: any) {
    console.error("fitpro-api error:", err);
    return json({ error: "Internal error", details: err.message }, 500);
  }
});
