// 9ZAP proxy — mantém o segredo HMAC no servidor e expõe uma API autenticada
// ao cliente FitPro. O browser nunca chama o Core OS diretamente.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const configuredZapBase = (Deno.env.get("NINEZAP_BASE_URL") || "https://core-stride-os.lovable.app").replace(/\/+$/, "");
const ZAP_BASE = configuredZapBase.endsWith("/api/public/zap")
  ? configuredZapBase
  : `${configuredZapBase}/api/public/zap`;
const TENANT = Deno.env.get("NINEZAP_TENANT") || "fitpro";

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function zapFetch(path: string, init: RequestInit & { rawBody?: string } = {}) {
  const secret = Deno.env.get("NINEZAP_SHARED_SECRET");
  if (!secret) return { status: 503, data: { error: "9ZAP not configured (missing NINEZAP_SHARED_SECRET)" } };
  const rawBody = init.rawBody ?? (typeof init.body === "string" ? init.body : "");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await hmacHex(secret, `${timestamp}.${rawBody}`);
  const res = await fetch(`${ZAP_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Zap-Tenant": TENANT,
      "X-Zap-Timestamp": timestamp,
      "X-Zap-Signature": signature,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = text; try { data = JSON.parse(text); } catch {}
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
  const { data: claims, error } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !claims?.claims) return json(401, { error: "unauthorized" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "threads";

  try {
    if (action === "threads.upsert" && req.method === "POST") {
      const body = await req.json();
      const r = await zapFetch("/threads", { method: "POST", body: JSON.stringify(body) });
      return json(r.status, r.data);
    }
    if (action === "threads" && req.method === "GET") {
      const params = new URLSearchParams(url.search);
      params.delete("action");
      const qs = params.toString();
      const query = qs ? `?${qs}` : "";
      const r = await zapFetch(`/threads${query}`, { method: "GET", rawBody: query });
      return json(r.status, r.data);
    }
    if (action === "messages.list" && req.method === "GET") {
      const threadId = url.searchParams.get("thread_id");
      if (!threadId) return json(400, { error: "thread_id required" });
      const query = "?limit=50";
      const r = await zapFetch(`/threads/${threadId}/messages${query}`, { method: "GET", rawBody: query });
      return json(r.status, r.data);
    }
    if (action === "messages.send" && req.method === "POST") {
      const body = await req.json();
      const { thread_id, ...rest } = body;
      if (!thread_id) return json(400, { error: "thread_id required" });
      const r = await zapFetch(`/threads/${thread_id}/messages`, {
        method: "POST",
        body: JSON.stringify(rest),
      });
      return json(r.status, r.data);
    }
    if (action === "read" && req.method === "POST") {
      const { thread_id, reader_external_id } = await req.json();
      const r = await zapFetch(`/threads/${thread_id}/read`, {
        method: "POST",
        body: JSON.stringify({ reader_external_id }),
      });
      return json(r.status, r.data);
    }
    return json(400, { error: "unknown action" });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
