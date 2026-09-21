import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_PATHS = new Set([
  "/health",
  "/v1/fitpro/planejamento",
  "/v1/fitpro/planejamento/ativa",
  "/v1/fitpro/planejamento/sync",
  "/v1/fitpro/periodization/current",
  "/v1/fitpro/periodization/generate",
  "/v1/fitpro/periodization/update",
  "/v1/fitpro/periodization/adjust",
  "/v1/fitpro/workout/today",
  "/v1/fitpro/events",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const token = authorization.slice("Bearer ".length);
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub);
    const allowed = (roles ?? []).some((r) => ["student", "user", "trainer", "professor", "admin", "super_admin"].includes(r.role));
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : "";
    if (!ALLOWED_PATHS.has(path)) return json({ error: "SmartPeriodizer path not allowed" }, 400);

    const { data: connector } = await admin
      .from("api_connectors")
      .select("endpoint, secret_ref, status")
      .eq("key", "smart_periodizer")
      .maybeSingle();
    if (connector?.status !== "active") return json({ error: "SmartPeriodizer connector inactive" }, 409);

    const key = connector.secret_ref ? Deno.env.get(connector.secret_ref) : null;
    if (!key) return json({ error: "SmartPeriodizer secret is not configured" }, 503);

    const query = typeof body.query === "string" && (body.query === "" || body.query.startsWith("?")) ? body.query : "";
    const payload = body.payload;
    const method = typeof body.method === "string" ? body.method.toUpperCase() : (payload === undefined ? "GET" : "POST");
    const base = (connector.endpoint ?? "").replace(/\/$/, "");
    const upstream = await fetch(`${base}${path}${query}`, {
      method,
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: payload === undefined || method === "GET" ? undefined : JSON.stringify(payload),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "SmartPeriodizer proxy error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
