// 9ZAP proxy — encaminha chamadas autenticadas do FitPro para a API do 9ZAP (chat).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ZAP_BASE = Deno.env.get("ZAP_BASE_URL") ||
  "https://project--77259b3e-ad02-40dd-b522-75d1dcbd4ed9.lovable.app/api/public/zap";

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function zapFetch(path: string, init: RequestInit = {}) {
  const token = Deno.env.get("FITPRO_API_TOKEN");
  const tenant = Deno.env.get("ZAP_TENANT_SLUG") || "default";
  if (!token) return { status: 503, data: { error: "9ZAP not configured (missing FITPRO_API_TOKEN)" } };
  const res = await fetch(`${ZAP_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Fitpro-Tenant": tenant,
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
      const qs = url.search.replace(/^\?/, "");
      const r = await zapFetch(`/threads?${qs}`, { method: "GET" });
      return json(r.status, r.data);
    }
    if (action === "messages.list" && req.method === "GET") {
      const threadId = url.searchParams.get("thread_id");
      if (!threadId) return json(400, { error: "thread_id required" });
      const r = await zapFetch(`/threads/${threadId}/messages?limit=50`, { method: "GET" });
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
