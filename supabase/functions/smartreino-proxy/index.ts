import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_PATHS = new Set([
  "/fitpro-quick-workout",
  "/fitpro-adjust-workout",
  "/fitpro-plan-workout",
  "/library-full",
  "/fitpro-week-workouts",
  "/fitpro-streaming-feed",
  "/fitpro-complete-workout",
  "/fitpro-copilot-adjust",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const token = auth.slice("Bearer ".length);
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
    if (!ALLOWED_PATHS.has(path)) return json({ error: "SmartTreino path not allowed" }, 400);

    const { data: connector } = await admin
      .from("api_connectors")
      .select("endpoint, secret_ref, status")
      .eq("key", "smart_treino")
      .maybeSingle();
    if (connector?.status !== "active") return json({ error: "SmartTreino connector inactive" }, 409);
    const key = (connector.secret_ref ? Deno.env.get(connector.secret_ref) : null)
      || Deno.env.get("FITPRO_API_KEY")
      || Deno.env.get("SMARTREINO_KEY");
    if (!key) return json({ error: "SmartTreino secret is not configured" }, 503);

    const query = typeof body.query === "string" && body.query.startsWith("?") ? body.query : "";
    const payload = body.payload ?? undefined;
    const configuredBase = Deno.env.get("SMARTREINO_BASE_URL") ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1`;
    const base = configuredBase.replace(/\/fitpro-api\/?$/, "").replace(/\/$/, "");
    const upstream = await fetch(`${base}${path}${query}`, {
      method: payload === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "x-partner-key": key },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "SmartTreino proxy error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
