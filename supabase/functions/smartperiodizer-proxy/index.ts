import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { partnerTarget } from "../_shared/partnerTarget.ts";
import { resolveConnectorSecret } from "../_shared/connectorSecret.ts";

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
    const { data: profile, error: profileError } = await userClient.from("profiles").select("role,is_active").eq("user_id", claims.claims.sub).maybeSingle();
    if (profileError || !profile || profile.is_active === false) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path : "";
    if (!ALLOWED_PATHS.has(path)) return json({ error: "SmartPeriodizer path not allowed" }, 400);

    let athleteId: string | null;
    try { athleteId=partnerTarget(typeof body.query === 'string' ? body.query : '', body.payload); }
    catch { return json({error:"Invalid or conflicting athlete identifiers"},400); }
    if (path !== '/health' && !athleteId) return json({error:"fitpro_student_id required"},400);
    if (athleteId) {
      const {data: athlete,error: athleteError}=await userClient.from('athletes').select('id,coach_id').eq('id',athleteId).maybeSingle();
      if (athleteError || !athlete) return json({error:"Athlete access denied"},403);
    }
    const params=new URLSearchParams(typeof body.query === 'string' ? body.query.replace(/^\?/, '') : '');
    const requestedMethod=typeof body.method==='string' ? body.method.toUpperCase() : (body.payload===undefined ? 'GET':'POST');
    if (!['GET','POST','PUT','PATCH'].includes(requestedMethod) || (path==='/health' && requestedMethod!=='GET')) return json({error:"Method not allowed"},405);
    if (athleteId && requestedMethod==='GET') params.set('fitpro_student_id',athleteId);

    const { data: connector } = await admin
      .from("api_connectors")
      .select("endpoint, secret_ref, status")
      .eq("key", "smart_periodizer")
      .maybeSingle();
    if (connector?.status !== "active") return json({ error: "SmartPeriodizer connector inactive" }, 409);

    const base = (connector.endpoint ?? "").replace(/\/$/, "");

    // Conector que aponta para o próprio FitPro (fitpro-api no mesmo projeto): autentica
    // servidor-a-servidor, sem exigir chave colada na UI. Qualquer outro host exige secret.
    let isInternal = false;
    try {
      const target = new URL(base);
      isInternal = target.host === new URL(Deno.env.get("SUPABASE_URL")!).host &&
        target.pathname.startsWith("/functions/v1/fitpro-api");
    } catch (_) { /* endpoint inválido: cai no caminho com secret */ }

    const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (isInternal) {
      upstreamHeaders["x-internal-service"] = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    } else {
      const key = resolveConnectorSecret(connector.secret_ref, "smart_periodizer");
      if (!key) return json({ error: "SmartPeriodizer secret is not configured" }, 503);
      upstreamHeaders["x-api-key"] = key;
    }

    const query = params.size ? `?${params.toString()}` : '';
    const payload = body.payload;
    const method = requestedMethod;
    const upstream = await fetch(`${base}${path}${query}`, {
      method,
      headers: upstreamHeaders,
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
