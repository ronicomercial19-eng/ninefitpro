import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const COMMUNITY_BASE = "https://piqqmrwinullmenoyyfr.supabase.co/functions/v1";
const ROUTES: Record<string, string> = {
  feed: "/community/posts",
  posts: "/community/posts",
  groups: "/community/groups",
  categories: "/categories",
  products: "/products",
};

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

async function authenticate(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authorization } } },
  );
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { client, userId: String(data.claims.sub), claims: data.claims };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json(405, { error: "method_not_allowed" });

  const auth = await authenticate(req);
  if (!auth) return json(401, { error: "unauthorized" });

  const apiKey = Deno.env.get("COMMUNITY_API_KEY");
  if (!apiKey) return json(503, { error: "community_integration_not_configured" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "feed";
  const route = ROUTES[action];
  if (!route) return json(400, { error: "unsupported_action" });

  const params = new URLSearchParams(url.searchParams);
  params.delete("action");
  try {
    const query = params.toString();
    const upstream = await fetch(`${COMMUNITY_BASE}${route}${query ? `?${query}` : ""}`, {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });
    const text = await upstream.text();
    let body: unknown = text;
    try { body = JSON.parse(text); } catch { /* preserve non-JSON response */ }
    return json(upstream.status, body);
  } catch (error) {
    console.error("Community API request failed", error);
    return json(502, { error: "community_unavailable" });
  }
});
