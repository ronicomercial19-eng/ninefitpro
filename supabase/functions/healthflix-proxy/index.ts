// HealthFlix proxy — encaminha chamadas autenticadas do FitPro para as edge functions do projeto HealthFlix
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const HF_BASE = "https://kixjiwsfogqztlgiiztp.supabase.co/functions/v1";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function callHF(path: string, init: RequestInit = {}): Promise<{ status: number; data: any }> {
  const apiKey = Deno.env.get("HEALTHFLIX_API_KEY")!;
  const res = await fetch(`${HF_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await sb.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json(401, { error: "unauthorized" });
  const userId = String(claimsData.claims.sub || "");
  if (!userId) return json(401, { error: "unauthorized" });
  const [{ data: athleteId }, { data: identity }] = await Promise.all([
    sb.rpc("fn_current_athlete_id"),
    sb.from("vw_current_identity").select("profile_role,roles").eq("user_id", userId).maybeSingle(),
  ]);
  const identityRoles = Array.isArray(identity?.roles) ? identity.roles.map((item: { role?: string }) => String(item.role || "").toLowerCase()) : [];
  const role = String(identity?.profile_role || identityRoles[0] || "").toLowerCase();
  const isAdmin = ["admin", "super_admin", "superadmin"].includes(role) || identityRoles.some((item: string) => ["admin", "super_admin", "superadmin"].includes(item));
  const isStaff = isAdmin || ["trainer", "coach", "professor"].includes(role) || identityRoles.some((item: string) => ["trainer", "coach", "professor"].includes(item));

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "content";

  try {
    if (action === "content" && req.method === "GET") {
      const r = await callHF("/fitpro-content", { method: "GET" });
      return json(r.status, r.data);
    }
    if (action === "health" && req.method === "GET") {
      const r = await callHF("/fitpro-health", { method: "GET" });
      return json(r.status, r.data);
    }
    if (action === "context" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!isStaff && !athleteId) return json(403, { error: "athlete profile required" });
      const requestedId = body.fitpro_student_id;
      if (!isStaff && requestedId && requestedId !== athleteId) return json(403, { error: "student identity mismatch" });
      const studentId = isStaff ? requestedId : athleteId;
      if (!studentId) return json(400, { error: "fitpro_student_id required" });
      if (isStaff && !isAdmin) {
        const { data: target } = await sb.from("athletes").select("id,coach_id").eq("id", studentId).maybeSingle();
        if (!target || target.coach_id !== userId) return json(403, { error: "student is not assigned to this coach" });
      }
      const safeBody = { fitpro_student_id: studentId, fitpro_professor_id: userId, role: isStaff ? "professor" : "student" };
      if (!isStaff) {
        await callHF("/fitpro-sync", { method: "POST", body: JSON.stringify({
          fitpro_student_id: studentId,
          name: claimsData.claims.user_metadata?.full_name || claimsData.claims.email,
          email: claimsData.claims.email, role: "student",
        })});
      }
      const r = await callHF("/fitpro-student-context", { method: "POST", body: JSON.stringify(safeBody) });
      return json(r.status, r.data);
    }
    if (action === "assign" && req.method === "POST") {
      if (!isStaff) return json(403, { error: "staff role required" });
      const body = await req.json().catch(() => ({}));
      const studentId = String(body.fitpro_student_id || "");
      if (!studentId) return json(400, { error: "fitpro_student_id required" });
      const { data: target } = await sb.from("athletes").select("id,coach_id").eq("id", studentId).maybeSingle();
      if (!target || (!isAdmin && target.coach_id !== userId)) return json(403, { error: "student is not assigned to this coach" });
      const safeBody = { ...body, fitpro_professor_id: userId, role: "professor" };
      const r = await callHF("/fitpro-content-assign", { method: "POST", body: JSON.stringify(safeBody) });
      return json(r.status, r.data);
    }
    if (action === "events" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const requestedId = body.fitpro_student_id;
      if (!athleteId || (requestedId && requestedId !== athleteId)) return json(403, { error: "student identity mismatch" });
      const eventType = String(body.event_type || "");
      const entityId = String(body.entity_id || "").slice(0, 180);
      const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
      const safeBody = {
        event_type: eventType,
        fitpro_student_id: athleteId,
        entity_type: "content",
        entity_id: entityId,
        payload: {
          title: String(payload.title || "").slice(0, 240),
          progress_percent: Math.max(0, Math.min(100, Number(payload.progress_percent) || 0)),
          last_position_seconds: Math.max(0, Math.floor(Number(payload.last_position_seconds) || 0)),
          duration_seconds: Math.max(0, Math.floor(Number(payload.duration_seconds) || 0)),
          watched_seconds: Math.max(0, Math.floor(Number(payload.watched_seconds) || 0)),
        },
      };
      if (!["content_started", "content_progress_updated", "content_completed"].includes(eventType) || !entityId) return json(400, { error: "invalid content event" });
      if (["content_started", "content_progress_updated", "content_completed"].includes(String(body.event_type)) && body.entity_id) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const progressPercent = body.event_type === "content_completed" ? 100 : Math.max(0, Math.min(99, Number(body.payload?.progress_percent) || 0));
        const { error: progressError } = await admin.from("healthflix_progress").upsert({
          athlete_id: athleteId,
          fitpro_student_id: athleteId,
          content_id: String(body.entity_id),
          content_title: String(body.payload?.title || "").slice(0, 240) || null,
          progress_percent: progressPercent,
          last_position_seconds: Math.max(0, Math.floor(Number(body.payload?.last_position_seconds) || 0)),
          duration_seconds: Math.max(0, Math.floor(Number(body.payload?.duration_seconds) || 0)),
          watched_seconds: Math.max(0, Math.floor(Number(body.payload?.watched_seconds) || Number(body.payload?.last_position_seconds) || 0)),
          started_at: body.event_type === "content_started" ? new Date().toISOString() : undefined,
          completed_at: body.event_type === "content_completed" ? new Date().toISOString() : undefined,
          last_event_at: new Date().toISOString(),
        }, { onConflict: "fitpro_student_id,content_id" });
        if (progressError) return json(500, { error: "progress persistence failed" });
      }
      try {
        const r = await callHF("/fitpro-events", { method: "POST", body: JSON.stringify(safeBody) });
        return json(200, { ok: true, fitpro_persisted: true, healthflix_synced: r.status < 400 });
      } catch (error) {
        console.error("HealthFlix event sync failed", error);
        return json(200, { ok: true, fitpro_persisted: true, healthflix_synced: false });
      }
    }
    if (action === "progress" && req.method === "GET") {
      const requestedId = url.searchParams.get("fitpro_student_id");
      if (!athleteId || (requestedId && requestedId !== athleteId)) return json(403, { error: "student identity mismatch" });
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: progress, error: progressError } = await admin.from("healthflix_progress").select("content_id,content_title,progress_percent,last_position_seconds,duration_seconds,watched_seconds,started_at,completed_at,last_event_at").eq("athlete_id", athleteId).order("last_event_at", { ascending: false }).limit(300);
      if (progressError) return json(500, { error: "progress lookup failed" });
      try {
        const r = await callHF(`/fitpro-student-progress?fitpro_student_id=${encodeURIComponent(athleteId)}`, { method: "GET" });
        return json(200, { ok: true, progress: progress || [], provider_progress: r.data?.progress || [] });
      } catch (error) {
        console.error("HealthFlix progress sync failed", error);
        return json(200, { ok: true, progress: progress || [], provider_progress: [] });
      }
    }
    return json(400, { error: "unknown action" });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
