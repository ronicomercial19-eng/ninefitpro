// Proxy para busca/triagem de sintomas na library-api do projeto biblioteca (vrbhljmsakruoejctclg)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LIB_URL = "https://vrbhljmsakruoejctclg.supabase.co/functions/v1/library-api";

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
  const path = url.searchParams.get("path"); // "symptoms" para listar vocabulário, ausente para busca
  const q = url.searchParams.get("q");
  const type = url.searchParams.get("type"); // filtro opcional (ex: protocolo)
  const partner = Deno.env.get("LIBRARY_PARTNER_KEY")!;

  try {
    let target = LIB_URL;
    const params = new URLSearchParams();
    if (path === "symptoms") {
      target = `${LIB_URL}/symptoms`;
    } else {
      if (!q) return json(400, { error: "missing q" });
      params.set("q", q);
      if (type) params.set("type", type);
    }
    const qs = params.toString();
    const r = await fetch(qs ? `${target}?${qs}` : target, {
      headers: { "x-partner-key": partner },
    });
    const text = await r.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch { /* keep raw */ }

    // Log de acesso (auditoria leve, mesma tabela já usada por outras funções)
    await sb.from("api_access_logs").insert({
      endpoint: "library-search-proxy",
      athlete_id: null,
      response_status: r.status,
      request_metadata: { q, type, path },
    }).select().maybeSingle().then(() => {}, () => {});

    return json(r.status, data);
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
