import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.2";
import {
  professionalClient,
  cors,
  json,
  fail,
} from "../_shared/professorRequest.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (req.method !== "POST")
      return json({ error: "method_not_allowed" }, 405);
    const caller = await professionalClient(req);
    const { data: identity } = await caller.auth.getUser();
    const { data: profile } = await caller
      .from("profiles")
      .select("role")
      .eq("user_id", identity.user!.id)
      .single();
    if (!["admin", "super_admin"].includes(profile?.role))
      return json({ error: "admin_required" }, 403);
    const { connector, path, init } = await req.json();
    if (
      typeof connector !== "string" ||
      typeof path !== "string" ||
      !path.startsWith("/") ||
      path.startsWith("//") ||
      path.includes("\\") ||
      path.includes("..") ||
      (init?.method && init.method !== "GET")
    )
      return json({ error: "read_only_relative_path_required" }, 400);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: rec, error } = await admin
      .from("api_connectors")
      .select("endpoint,auth_mode,secret_ref,status,config")
      .eq("key", connector)
      .single();
    if (error || !rec) return json({ error: "connector_not_found" }, 404);
    if (rec.status !== "active" || !rec.endpoint)
      return json({ error: "connector_inactive_or_missing_endpoint" }, 409);
    const base = new URL(rec.endpoint),
      url = new URL(base.toString().replace(/\/$/, "") + path);
    if (
      base.protocol !== "https:" ||
      base.username ||
      base.password ||
      url.origin !== base.origin ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(
        base.hostname,
      )
    )
      return json({ error: "invalid_endpoint" }, 400);
    let secret: string | null = null;
    if (rec.secret_ref?.startsWith("vault:")) {
      const result = await admin.rpc("fn_connector_vault_secret", {
        p_key: connector,
      });
      if (result.error) throw new Error("secret_unavailable");
      secret = result.data;
    } else if (rec.secret_ref) secret = Deno.env.get(rec.secret_ref) || null;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (rec.auth_mode === "apikey") {
      if (!secret)
        return json({ error: "connector_secret_not_configured" }, 409);
      headers[rec.config?.api_key_header || "Authorization"] =
        (rec.config?.api_key_prefix ?? "Bearer ") + secret;
    } else if (!["none", "iframe_sso"].includes(rec.auth_mode))
      return json({ error: "unsupported_auth_mode" }, 409);
    const upstream = await fetch(url, {
      method: "GET",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    const text = await upstream.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      return json({ error: "upstream_non_json", status: upstream.status }, 502);
    }
    if (
      !upstream.ok ||
      body?.success === false ||
      body?.ok === false ||
      body?.error
    )
      return json({ error: "upstream_rejected", status: upstream.status }, 502);
    return json({ success: true, verified: true, data: body });
  } catch (e) {
    return fail(e);
  }
});
