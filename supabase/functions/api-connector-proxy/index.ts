// API Connector Proxy — assina e encaminha requests usando o secret armazenado
// como variável de ambiente referenciado por `api_connectors.secret_ref`.
// Nunca expõe a chave ao client.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    // Role gate — only trainers/admins may use the connector proxy
    const userId = claims.claims.sub as string;
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) =>
      ["trainer", "admin", "super_admin", "professor"].includes(r.role),
    );
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { connector, path, init } = body as { connector?: string; path?: string; init?: any };
    if (!connector || typeof path !== "string" || !path.startsWith("/")) {
      return json({ error: "connector and relative path required" }, 400);
    }

    const { data: rec, error } = await adminClient
      .from("api_connectors")
      .select("key, endpoint, auth_mode, secret_ref, status, config")
      .eq("key", connector)
      .maybeSingle();
    if (error || !rec) return json({ error: "connector not found" }, 404);
    if (rec.status !== "active") return json({ error: "connector inactive" }, 409);

    const secret = rec.secret_ref ? Deno.env.get(rec.secret_ref) : null;
    const base = (rec.endpoint ?? "").replace(/\/$/, "");
    const url = `${base}${path}`;

    // Whitelist only safe headers from client (never spread arbitrary headers)
    const SAFE_HEADERS = new Set(["content-type", "accept", "accept-language"]);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    for (const [k, v] of Object.entries(init?.headers ?? {})) {
      if (SAFE_HEADERS.has(k.toLowerCase()) && typeof v === "string") headers[k] = v;
    }
    if (rec.auth_mode === "apikey" && secret) {
      const headerName = (rec.config as any)?.api_key_header ?? "Authorization";
      const prefix = (rec.config as any)?.api_key_prefix ?? "Bearer ";
      headers[headerName] = `${prefix}${secret}`;
    }

    const upstream = await fetch(url, {
      method: init?.method ?? "GET",
      body: init?.body,
      headers,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { ...corsHeaders, "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e: any) {
    return json({ error: e?.message ?? "internal error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
