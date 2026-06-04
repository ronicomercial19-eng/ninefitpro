// Staff Connection — Public API for FitPro integration
// Endpoints:
// GET /staff-api/methods
// GET /staff-api/hubs
// GET /staff-api/professionals?hub=&method=&category=
// POST /staff-api/match { method, hub?, preferences? }
// POST /staff-api/booking { freelancer_id, method, slot, client_id, client_name, hub }
//
// CORS: open (designed to be called by external FitPro app).
// Auth: none on read endpoints; bookings expect a caller token (anon ok).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const METHODS = [
  { id: "recovery", name: "Recovery", category: "9HEALTH", goals: ["Inflamação", "Mobilidade"], level: "All", format: "Personal" },
  { id: "mobility", name: "Mobility", category: "9HEALTH", goals: ["Amplitude", "Postura"], level: "All", format: "Small Group" },
  { id: "flow", name: "Flow", category: "9HEALTH", goals: ["Foco", "Mobilidade"], level: "All", format: "Hybrid" },
  { id: "rehab", name: "Rehab", category: "9HEALTH", goals: ["Lesão", "Funcional"], level: "All", format: "Personal" },
  { id: "strength", name: "Strength", category: "9PERFORMANCE", goals: ["Força", "Massa Magra"], level: "Advanced", format: "Personal" },
  { id: "running", name: "Running", category: "9PERFORMANCE", goals: ["Endurance", "VO2"], level: "All", format: "Hybrid" },
  { id: "fight", name: "Fight", category: "9PERFORMANCE", goals: ["Reflexo", "Agilidade"], level: "All", format: "Small Group" },
  { id: "conditioning", name: "Conditioning", category: "9PERFORMANCE", goals: ["Metabólico"], level: "All", format: "Small Group" },
  { id: "signature", name: "Signature", category: "9LIFESTYLE", goals: ["Híbrido", "Elite"], level: "Advanced", format: "Hybrid" },
  { id: "balance", name: "Balance", category: "9LIFESTYLE", goals: ["Longevidade"], level: "All", format: "Personal" },
  { id: "active-life", name: "Active Life", category: "9LIFESTYLE", goals: ["Energia"], level: "All", format: "Small Group" },
];

const HUBS = [
  { id: "h1", name: "Maison", density: "High" },
  { id: "h2", name: "Granja Morumbi", density: "Low" },
  { id: "h3", name: "Panamby", density: "Medium" },
  { id: "h4", name: "Moema", density: "High" },
  { id: "h5", name: "Pinheiros", density: "Medium" },
  { id: "h6", name: "Vila Sofia", density: "Low" },
  { id: "h7", name: "Alto da Lapa", density: "Medium" },
];

const METHOD_KEYWORDS: Record<string, string[]> = {
  recovery: ["fisio", "massagem", "recovery", "recuperação"],
  mobility: ["mobility", "pilates", "yoga", "alongamento"],
  flow: ["yoga", "flow", "pilates"],
  rehab: ["fisio", "rehab", "reabilitação"],
  strength: ["personal", "musculação", "strength", "crossfit"],
  running: ["corrida", "running", "personal"],
  fight: ["boxe", "muay", "jiu", "luta", "mma"],
  conditioning: ["hiit", "funcional", "crossfit"],
  signature: ["personal", "coach"],
  balance: ["personal", "pilates"],
  "active-life": ["personal", "funcional"],
};

function scoreProfessional(pro: any, opts: { method?: string; hub?: string; preferences?: any }) {
  let score = 0;
  const fns: string[] = (pro.funcoes_experiencia || []).map((s: string) => s.toLowerCase());
  const loc = (pro.localizacao_bairro_cidade || "").toLowerCase();
  if (opts.method) {
    const kws = METHOD_KEYWORDS[opts.method] || [opts.method];
    if (kws.some((k) => fns.some((f) => f.includes(k)))) score += 50;
    if (kws.some((k) => (pro.principal_funcao_tempo || "").toLowerCase().includes(k))) score += 20;
  }
  if (opts.hub && loc.includes(opts.hub.toLowerCase())) score += 25;
  if (opts.preferences?.transport && pro.tem_transporte_proprio?.toLowerCase().includes("sim")) score += 5;
  if (pro.disponibilidade?.length) score += 5;
  return score;
}

function toPublicPro(pro: any, score?: number, includeContact = false) {
  return {
    id: pro.id,
    name: pro.nome_completo,
    role: pro.principal_funcao_tempo || "Profissional",
    skills: pro.funcoes_experiencia || [],
    location: pro.localizacao_bairro_cidade,
    availability: pro.disponibilidade || [],
    hourly: pro.faixa_valor_hora,
    bio: pro.sobre_e_amor_por_eventos,
    portfolio: pro.link_portfolio_curriculo,
    transport: pro.tem_transporte_proprio,
    ...(includeContact ? { contact: { whatsapp: pro.telefone_whatsapp, email: pro.email } } : {}),
    ...(score !== undefined ? { match_score: score } : {}),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const action = parts[parts.length - 1] || url.searchParams.get("action") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Optional auth — contact details only revealed to authenticated callers; booking requires auth
    const authHeader = req.headers.get("Authorization");
    let isAuthed = false;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
      if (!authErr && claims?.claims) isAuthed = true;
    }

    if (req.method === "GET" && action === "methods") return json({ methods: METHODS });
    if (req.method === "GET" && action === "hubs") return json({ hubs: HUBS });

    if (req.method === "GET" && action === "professionals") {
      const method = url.searchParams.get("method") || undefined;
      const hub = url.searchParams.get("hub") || undefined;
      const { data, error } = await supabase.from("freelancers_cadastro").select("*").limit(200);
      if (error) throw error;
      const list = (data || [])
        .map((p) => ({ p, s: scoreProfessional(p, { method, hub }) }))
        .filter(({ s }) => (method || hub ? s > 0 : true))
        .sort((a, b) => b.s - a.s)
        .map(({ p, s }) => toPublicPro(p, s, isAuthed));
      return json({ count: list.length, professionals: list });
    }

    if (req.method === "POST" && action === "match") {
      const body = await req.json().catch(() => ({}));
      const { method, hub, preferences, limit = 5 } = body;
      const { data, error } = await supabase.from("freelancers_cadastro").select("*").limit(500);
      if (error) throw error;
      const list = (data || [])
        .map((p) => ({ p, s: scoreProfessional(p, { method, hub, preferences }) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map(({ p, s }) => toPublicPro(p, s, isAuthed));
      return json({ method, hub, matches: list });
    }

    if (req.method === "POST" && action === "booking") {
      if (!isAuthed) return json({ error: "Authentication required for bookings" }, 401);
      const body = await req.json().catch(() => ({}));
      const { freelancer_id, method, slot, client_id, client_name, hub, notes } = body;
      if (!freelancer_id || !method)
        return json({ error: "freelancer_id and method are required" }, 400);
      const payload = {
        titulo: `[FitPro] ${method} • ${hub || "—"}`,
        descricao: `Cliente: ${client_name || client_id || "anônimo"} | Slot: ${slot || "imediato"} | Notas: ${notes || ""}`,
        data_agendada: new Date().toISOString(),
        responsavel_id: freelancer_id,
        lead_id: freelancer_id,
        concluido: false,
      };
      const { error } = await supabase.from("actions").insert(payload);
      return json({
        ok: true,
        booking: { freelancer_id, method, slot, client_id, client_name, hub, persisted: !error },
        warning: error?.message,
      });
    }

    return json(
      {
        service: "staff-api",
        version: "1.0",
        endpoints: [
          "GET /staff-api/methods",
          "GET /staff-api/hubs",
          "GET /staff-api/professionals?method=&hub=",
          "POST /staff-api/match { method, hub?, preferences?, limit? }",
          "POST /staff-api/booking { freelancer_id, method, slot, client_id, client_name, hub }",
        ],
      },
      200,
    );
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
