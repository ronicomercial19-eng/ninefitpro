// 9ZAP → FitPro webhook receiver. Verifica HMAC-SHA256 e deduplica por event_id.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-9zap-signature, x-9zap-event-id, x-9zap-event-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const raw = await req.text();
  const secret = Deno.env.get("FITPRO_WEBHOOK_SECRET");
  if (!secret) return json(503, { error: "webhook secret not configured" });

  const sigHeader = req.headers.get("x-9zap-signature") || "";
  const expected = await hmacHex(secret, raw);
  const provided = sigHeader.replace(/^sha256=/, "");
  if (provided !== expected) return json(401, { error: "invalid signature" });

  const eventId = req.headers.get("x-9zap-event-id") || crypto.randomUUID();
  const eventType = req.headers.get("x-9zap-event-type") || "unknown";
  let body: any = {}; try { body = JSON.parse(raw); } catch {}

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // dedupe
  const { error: insertErr } = await sb.from("zap_webhook_events").insert({
    event_id: eventId, event_type: eventType, payload: body,
  });
  if (insertErr && !String(insertErr.message).includes("duplicate")) {
    console.error("zap-webhook insert error", insertErr);
  }
  if (insertErr) return json(200, { ok: true, deduped: true });

  // log canônico
  try {
    await sb.from("integration_events_log").insert({
      source: "9zap",
      event_type: eventType,
      payload: body,
    });
  } catch (e) { console.error(e); }

  await sb.from("zap_webhook_events").update({ processed_at: new Date().toISOString() }).eq("event_id", eventId);
  return json(200, { ok: true });
});
