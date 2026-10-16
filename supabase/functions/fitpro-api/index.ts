/**
 * SmartPeriodizer ↔ FitPro API v1
 * Edge Function: Planejamento (Ondas Adaptativas) + Auditoria de Falhas
 * 
 * Base URL: https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1
 * Auth: header x-api-key (SHA256 hash em fitpro_connections.api_key_hash)
 *       ou x-internal-service (service role, somente chamadas servidor-a-servidor
 *       dos proxies do próprio projeto — nunca exposto ao navegador).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authenticate(req: Request, supabase: any) {
  // Chamada interna (proxy do próprio projeto): dispensa chave por conector.
  const internal = req.headers.get("x-internal-service");
  if (internal) {
    if (!SUPABASE_SERVICE_KEY || internal !== SUPABASE_SERVICE_KEY) {
      return { ok: false, status: 401, error: "Invalid internal credential" };
    }
    const { data } = await supabase
      .from("fitpro_connections")
      .select("id, name, status, professor_id")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!data) return { ok: false, status: 401, error: "No active connection" };
    return { ok: true, connection: data };
  }

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

async function logGenerationFailure(supabase: any, params: {
  athlete_id?: string | null;
  plan_id?: string | null;
  assignment_id?: string | null;
  origin: "trigger" | "edge" | "manual";
  error_reason: string;
  payload?: any;
  error_detail?: any;
}) {
  try {
    await supabase.from("periodization_generation_failures").insert({
      athlete_id: params.athlete_id ?? null,
      plan_id: params.plan_id ?? null,
      assignment_id: params.assignment_id ?? null,
      origin: params.origin,
      error_reason: params.error_reason,
      error_detail: params.error_detail ?? {},
      payload: params.payload ?? {},
    });
  } catch (e) {
    console.warn("logGenerationFailure failed:", e);
  }
}

function buildPlanejamentoBlock(snap: any) {
  const payload: any = snap?.payload || {};
  const mesos: any[] = Array.isArray(payload.mesocycles) ? payload.mesocycles : [];
  const ondasFromPayload: any[] = Array.isArray(payload.ondas) ? payload.ondas : [];
  const currentWeek = Number(snap?.cycle_week ?? 1);

  // Montar ondas a partir de mesociclos ou payload direto
  const ondas = (ondasFromPayload.length
    ? ondasFromPayload
    : mesos.map((m, i) => ({
        nome: m?.name || m?.phase || `Onda ${i + 1}`,
        phase: m?.phase ?? null,
        weeks: m?.weeks ?? null,
      })))
    .map((o: any, i: number) => ({
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
      return json({
        status: "ok",
        service: "fitpro-api",
        version: "1.1",
        time: new Date().toISOString(),
      });
    }

    // All other endpoints require x-api-key (ou credencial interna)
    const auth = await authenticate(req, supabase);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const conn = auth.connection!;

    // --- POST /v1/fitpro/connect ---
    if (req.method === "POST" && path === "/v1/fitpro/connect") {
      await supabase
        .from("fitpro_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);
      return json({
        status: "connected",
        connection_id: conn.id,
        name: conn.name,
      });
    }

    // --- POST /v1/fitpro/sync ---
    if (req.method === "POST" && path === "/v1/fitpro/sync") {
      const body = await req.json().catch(() => ({}));
      const students: any[] = Array.isArray(body.students) ? body.students : [];
      let upserted = 0;
      for (const s of students) {
        if (!s.fitpro_student_id) continue;
        await supabase.from("fitpro_student_map").upsert(
          {
            connection_id: conn.id,
            fitpro_student_id: String(s.fitpro_student_id),
            fitpro_professor_id: s.fitpro_professor_id ? String(s.fitpro_professor_id) : null,
            athlete_id: s.athlete_id || null,
            context: s.context || {},
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "connection_id,fitpro_student_id" }
        );
        upserted++;
      }
      await supabase
        .from("fitpro_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);
      return json({ synced: upserted });
    }

    // --- GET /v1/fitpro/planejamento?fitpro_student_id=... ---
    // Snapshot canônico para a tela "Planejamento" do FitPro.
    // /planejamento/ativa e /periodization/current são aliases (o proxy do SmartPeriodizer
    // já liberava esses caminhos, mas a API respondia 404).
    if (
      req.method === "GET" &&
      ["/v1/fitpro/planejamento", "/v1/fitpro/planejamento/ativa", "/v1/fitpro/periodization/current"].includes(path)
    ) {
      const sid = url.searchParams.get("fitpro_student_id");
      if (!sid) return json({ error: "fitpro_student_id required" }, 400);
      const athleteId = await resolveAthlete(supabase, conn.id, sid);
      const realId = athleteId || sid;

      // Buscar snapshot sincronizado
      const { data: snap } = await supabase
        .from("fitpro_smartperiodizer_periodizations")
        .select("*")
        .eq("fitpro_student_id", realId)
        .eq("status", "active")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!snap) {
        return json(
          {
            status: "no_plan",
            athlete_id: realId,
            message: "Nenhuma periodização ativa. Suba uma no SmartPeriodizer.",
          },
          404
        );
      }

      // Construir bloco de Planejamento com Ondas
      const planejamento = buildPlanejamentoBlock(snap);

      return json({
        snapshot: snap,
        planejamento,
        week: {
          phase: snap.current_phase,
          cycle: snap.current_cycle,
          cycle_week: snap.cycle_week ?? 1,
          rules: (snap.payload?.master_rules) || {},
        },
      });
    }

    // --- POST /v1/fitpro/planejamento/sync ---
    // Re-espelha a periodização anual do aluno no snapshot consumido pelo app.
    if (req.method === "POST" && path === "/v1/fitpro/planejamento/sync") {
      const body = await req.json().catch(() => ({}));
      const sid = body?.fitpro_student_id;
      if (!sid) return json({ error: "fitpro_student_id required" }, 400);
      const realId = body.athlete_id || (await resolveAthlete(supabase, conn.id, sid)) || sid;
      const { error: syncErr } = await supabase.rpc("sync_fitpro_planejamento", { p_athlete_id: realId });
      if (syncErr) {
        await logGenerationFailure(supabase, {
          athlete_id: realId,
          origin: "edge",
          error_reason: syncErr.message,
          error_detail: { step: "sync_fitpro_planejamento", via: "planejamento/sync" },
          payload: body,
        });
        return json({ error: "sync_failed", detail: syncErr.message }, 502);
      }
      await supabase
        .from("fitpro_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", conn.id);
      return json({ status: "synced", athlete_id: realId });
    }

    // --- GET /v1/fitpro/workout/today?fitpro_student_id=... ---
    if (req.method === "GET" && path === "/v1/fitpro/workout/today") {
      const sid = url.searchParams.get("fitpro_student_id");
      if (!sid) return json({ error: "fitpro_student_id required" }, 400);
      const realId = (await resolveAthlete(supabase, conn.id, sid)) || sid;
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      const { data: workout, error } = await supabase
        .from("daily_workouts")
        .select("id, workout_date, day_name, workout_type, focus_muscles, estimated_duration_minutes, changes_json, override_locked")
        .eq("athlete_id", realId)
        .eq("workout_date", today)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ date: today, athlete_id: realId, workout: workout ?? null });
    }

    // --- POST /v1/fitpro/events ---
    // Registra eventos do SmartPeriodizer (ex.: periodização gerada/ajustada) para consumo do app.
    if (req.method === "POST" && path === "/v1/fitpro/events") {
      const body = await req.json().catch(() => ({}));
      if (!body?.event_type || !UUID_RE.test(String(body?.fitpro_student_id ?? ""))) {
        return json({ error: "fitpro_student_id (uuid) and event_type required" }, 400);
      }
      const professorId = body.fitpro_professor_id && UUID_RE.test(String(body.fitpro_professor_id))
        ? String(body.fitpro_professor_id)
        : (conn.professor_id ?? null);
      const { data: ev, error } = await supabase
        .from("fitpro_smartperiodizer_events")
        .insert({
          fitpro_student_id: String(body.fitpro_student_id),
          fitpro_professor_id: professorId,
          event_type: String(body.event_type).slice(0, 80),
          entity_type: body.entity_type ? String(body.entity_type).slice(0, 80) : null,
          entity_id: body.entity_id ? String(body.entity_id).slice(0, 120) : null,
          payload: body.payload ?? {},
        })
        .select("id")
        .single();
      if (error) return json({ error: error.message }, 400);
      return json({ status: "recorded", id: ev.id });
    }

    // --- POST /v1/fitpro/periodization/generate ---
    if (req.method === "POST" && path === "/v1/fitpro/periodization/generate") {
      const body = await req.json();
      if (!body?.fitpro_student_id) return json({ error: "fitpro_student_id required" }, 400);
      const athleteId = body.athlete_id || (await resolveAthlete(supabase, conn.id, body.fitpro_student_id));
      if (!athleteId) return json({ error: "Athlete not mapped" }, 404);

      try {
        const { data: plan, error } = await supabase
          .from("periodization_annual_plans")
          .insert({
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
          })
          .select("id")
          .single();

        if (error) throw error;

        // Espelhar em fitpro_smartperiodizer_periodizations
        const { error: syncErr } = await supabase.rpc("sync_fitpro_planejamento", {
          p_athlete_id: athleteId,
        });
        if (syncErr) {
          await logGenerationFailure(supabase, {
            athlete_id: athleteId,
            plan_id: plan.id,
            origin: "edge",
            error_reason: syncErr.message,
            error_detail: { step: "sync_fitpro_planejamento" },
            payload: body,
          });
        }

        return json({ plan_id: plan.id, status: "created" });
      } catch (err: any) {
        await logGenerationFailure(supabase, {
          athlete_id: athleteId,
          origin: "edge",
          error_reason: err.message,
          error_detail: { step: "insert_annual_plan" },
          payload: body,
        });
        return json({ error: err.message }, 400);
      }
    }

    // --- PATCH /v1/fitpro/periodization/update ---
    if (req.method === "PATCH" && path === "/v1/fitpro/periodization/update") {
      const body = await req.json();
      if (!body?.plan_id) return json({ error: "plan_id required" }, 400);

      try {
        const updates: any = {};
        for (const k of [
          "macrocycles",
          "mesocycles",
          "micro_rules",
          "master_rules",
          "output_json",
          "status",
          "selected_chief_id",
          "selected_model_id",
        ]) {
          if (body[k] !== undefined) updates[k] = body[k];
        }
        const { error } = await supabase
          .from("periodization_annual_plans")
          .update(updates)
          .eq("id", body.plan_id);
        if (error) throw error;

        // Re-espelhar
        const { data: planRow } = await supabase
          .from("periodization_annual_plans")
          .select("athlete_id")
          .eq("id", body.plan_id)
          .maybeSingle();
        if (planRow?.athlete_id) {
          await supabase.rpc("sync_fitpro_planejamento", {
            p_athlete_id: planRow.athlete_id,
          });
        }

        return json({ status: "updated" });
      } catch (err: any) {
        await logGenerationFailure(supabase, {
          plan_id: body.plan_id,
          origin: "edge",
          error_reason: err.message,
          error_detail: { step: "update_annual_plan" },
          payload: body,
        });
        return json({ error: err.message }, 400);
      }
    }

    // --- POST /v1/fitpro/periodization/adjust ---
    if (req.method === "POST" && path === "/v1/fitpro/periodization/adjust") {
      const body = await req.json();
      if (!body?.plan_id || !body?.dimension) {
        return json({ error: "plan_id and dimension required" }, 400);
      }
      const { data: plan } = await supabase
        .from("periodization_annual_plans")
        .select("master_rules, output_json")
        .eq("id", body.plan_id)
        .maybeSingle();
      const rules = { ...(plan?.master_rules || {}), [body.dimension]: body.value };
      const { error } = await supabase
        .from("periodization_annual_plans")
        .update({ master_rules: rules })
        .eq("id", body.plan_id);
      if (error) return json({ error: error.message }, 400);
      return json({ status: "adjusted", dimension: body.dimension });
    }

    return json({ error: "Not found", path, method: req.method }, 404);
  } catch (err: any) {
    console.error("fitpro-api error:", err);
    return json({ error: "Internal error", details: err.message }, 500);
  }
});
