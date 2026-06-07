// Webhook receiver — HealthFlix posta eventos aqui; valida x-webhook-secret e grava no log + atualiza progresso
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== Deno.env.get("HEALTHFLIX_WEBHOOK_SECRET")) {
    return json(401, { error: "invalid webhook secret" });
  }

  const body = await req.json().catch(() => ({}));
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  await sb.from("integration_events_log").insert({
    source: "healthflix",
    event_type: body.event_type ?? "unknown",
    fitpro_student_id: body.fitpro_student_id ?? null,
    fitpro_professor_id: body.fitpro_professor_id ?? null,
    entity_type: body.entity_type ?? null,
    entity_id: body.entity_id ? String(body.entity_id) : null,
    payload: body.payload ?? {},
  });

  if (body.fitpro_student_id && body.entity_id &&
      ["content_started", "content_progress_updated", "content_completed"].includes(body.event_type)) {
    const progress = Number(body.payload?.progress_percent ?? (body.event_type === "content_completed" ? 100 : 0));
    // resolve athlete_id pelo fitpro_student_id (assumindo igual ao athletes.id)
    const { data: athlete } = await sb.from("athletes").select("id").eq("id", body.fitpro_student_id).maybeSingle();
    await sb.from("healthflix_progress").upsert({
      athlete_id: athlete?.id ?? null,
      fitpro_student_id: body.fitpro_student_id,
      content_id: String(body.entity_id),
      content_title: body.payload?.title ?? null,
      progress_percent: Math.max(0, Math.min(100, progress)),
      started_at: body.event_type === "content_started" ? new Date().toISOString() : undefined,
      completed_at: body.event_type === "content_completed" ? new Date().toISOString() : undefined,
      last_event_at: new Date().toISOString(),
    }, { onConflict: "fitpro_student_id,content_id" });
  }

  return json(200, { ok: true });
});
