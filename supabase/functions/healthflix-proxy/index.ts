// HealthFlix proxy — encaminha chamadas autenticadas do FitPro para as edge functions do projeto HealthFlix
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const HF_BASE = "https://kixjiwsfogqztlgiiztp.supabase.co/functions/v1";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function callHF(path: string, init: RequestInit = {}): Promise<{ status: number; data: any }> {
  const apiKey = Deno.env.get("HEALTHFLIX_API_KEY")!;
  const res = await fetch(`${HF_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* keep text */ }
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
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await sb.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) return json(401, { error: "unauthorized" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "content";

  try {
    if (action === "content" && req.method === "GET") {
      const r = await callHF("/fitpro-content", { method: "GET" });
      return json(r.status, r.data);
    }
    if (action === "health" && req.method === "GET") {
      const r = await callHF("/fitpro-health", { method: "GET" });
      return json(r.status, r.data);
    }
    if (action === "context" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      // garante sync prévio quando aluno
      if (body.role !== "professor" && body.fitpro_student_id) {
        await callHF("/fitpro-sync", { method: "POST", body: JSON.stringify({
          fitpro_student_id: body.fitpro_student_id,
          name: body.name, email: body.email, role: "student",
        })});
      }
      const r = await callHF("/fitpro-student-context", { method: "POST", body: JSON.stringify(body) });
      return json(r.status, r.data);
    }
    if (action === "assign" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const r = await callHF("/fitpro-content-assign", { method: "POST", body: JSON.stringify(body) });
      return json(r.status, r.data);
    }
    if (action === "events" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const r = await callHF("/fitpro-events", { method: "POST", body: JSON.stringify(body) });
      return json(r.status, r.data);
    }
    if (action === "progress" && req.method === "GET") {
      const sid = url.searchParams.get("fitpro_student_id");
      if (!sid) return json(400, { error: "fitpro_student_id required" });
      const r = await callHF(`/fitpro-student-progress?fitpro_student_id=${encodeURIComponent(sid)}`, { method: "GET" });
      return json(r.status, r.data);
    }
    return json(400, { error: "unknown action" });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
