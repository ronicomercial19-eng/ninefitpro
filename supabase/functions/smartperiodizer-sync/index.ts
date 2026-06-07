// SmartPeriodizer sync — busca o plano via api_connectors.smart_periodizer e cacheia em periodization_plans_remote
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const sbUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } });
  const { data: claims } = await sbUser.auth.getClaims(auth.replace("Bearer ", ""));
  if (!claims?.claims) return json(401, { error: "unauthorized" });

  const body = await req.json().catch(() => ({}));
  const athleteId = body.athlete_id as string | undefined;
  if (!athleteId) return json(400, { error: "athlete_id required" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: conn } = await admin.from("api_connectors").select("endpoint, api_key, status")
    .eq("module_key", "smart_periodizer").maybeSingle();

  if (!conn?.endpoint) {
    return json(400, { error: "SmartPeriodizer não conectado. Configure em Admin → SmartPeriodizer." });
  }

  try {
    const r = await fetch(`${conn.endpoint.replace(/\/$/, "")}/plan?athlete=${athleteId}`, {
      headers: conn.api_key ? { "Authorization": `Bearer ${conn.api_key}` } : {},
    });
    if (!r.ok) {
      return json(502, { error: `SmartPeriodizer respondeu ${r.status}` });
    }
    const plan = await r.json();
    const waves = Array.isArray(plan.waves) ? plan.waves : Array.isArray(plan.cycles) ? plan.cycles : [];
    await admin.from("periodization_plans_remote").upsert({
      athlete_id: athleteId,
      external_plan_id: String(plan.id ?? plan.plan_id ?? "default"),
      plan_name: plan.name ?? plan.title ?? "Plano SmartPeriodizer",
      total_weeks: plan.total_weeks ?? plan.weeks ?? waves.length,
      current_week: plan.current_week ?? 1,
      waves,
      raw_payload: plan,
      status: plan.status ?? "active",
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "athlete_id,external_plan_id" });

    return json(200, { ok: true, waves: waves.length });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
