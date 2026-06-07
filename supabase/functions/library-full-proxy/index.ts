// Proxy para library-full do projeto biblioteca (vrbhljmsakruoejctclg)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LIB_URL = "https://vrbhljmsakruoejctclg.supabase.co/functions/v1/library-full";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claims, error: cerr } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (cerr || !claims?.claims) return json(401, { error: "unauthorized" });

  const url = new URL(req.url);
  const sid = url.searchParams.get("student_external_id") || claims.claims.sub;
  const partner = Deno.env.get("LIBRARY_PARTNER_KEY")!;

  try {
    const r = await fetch(`${LIB_URL}?student_external_id=${encodeURIComponent(sid)}`, {
      headers: { "x-partner-key": partner },
    });
    const text = await r.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch { /* keep */ }
    return json(r.status, data);
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
