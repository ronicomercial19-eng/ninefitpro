import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (code: string, message: string, status = 400) =>
  new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth gate — require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return fail("UNAUTHORIZED", "Missing authorization", 401);
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await authClient.auth.getClaims(token);
    if (authErr || !claims?.claims) return fail("UNAUTHORIZED", "Invalid token", 401);
    const authedUserId = claims.claims.sub as string;

    const body = await req.json();
    const { workoutName, workoutType, bio, profile, activeSkills, recentRPE } = body ?? {};
    const userId = authedUserId; // trust JWT, not body

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fail("CONFIG", "LOVABLE_API_KEY ausente", 500);

    const skills = Array.isArray(activeSkills)
      ? activeSkills.map((s: any) => `${s.slug}(${s.category})`).join(", ")
      : "";
    const sys = `Você é o FitCopilot, IA de ajuste adaptativo de treino do 9FIT PRO.
Responda SEMPRE chamando a tool ajustar_treino. Em português.`;
    const userPrompt = `Treino: ${workoutName ?? "—"} (${workoutType ?? "geral"})
Perfil: nível ${profile?.level ?? "?"}, experiência ${profile?.experience ?? "?"}.
Estado fisiológico: HRV ${bio?.hrv ?? "—"} | Sono(min) ${bio?.sleep ?? "—"} | Recovery ${bio?.recovery ?? "—"}.
RPE recente: ${recentRPE ?? "—"}.
Skills ativas: ${skills || "nenhuma"}.

Gere ajuste de intensidade, sugestões de troca de exercícios e recomendação curta.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "ajustar_treino",
          description: "Retorna ajuste adaptativo estruturado.",
          parameters: {
            type: "object",
            properties: {
              intensity: { type: "string", enum: ["leve", "moderada", "alta", "maxima"] },
              intensityPct: { type: "number" },
              fatigueLevel: { type: "string", enum: ["baixa", "moderada", "alta"] },
              fatiguePct: { type: "number" },
              swaps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    from: { type: "string" },
                    to: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["from", "to", "reason"],
                },
              },
              addOns: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    exercise: { type: "string" },
                    sets: { type: "number" },
                    reps: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["exercise", "sets", "reps", "reason"],
                },
              },
              rationale: { type: "string" },
              recoveryForecast: { type: "number" },
            },
            required: ["intensity", "intensityPct", "fatigueLevel", "fatiguePct", "rationale", "recoveryForecast"],
          },
        },
      },
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "ajustar_treino" } },
      }),
    });

    if (resp.status === 429) return fail("RATE_LIMIT", "Limite de requisições, tente novamente.", 429);
    if (resp.status === 402) return fail("CREDITS", "Sem créditos no Lovable AI.", 402);
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("ai gateway error", resp.status, txt);
      return fail("AI_ERROR", "Falha no FitCopilot", 500);
    }

    const ai = await resp.json();
    const call = ai?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return fail("PARSE", "Resposta sem tool call", 500);
    const args = JSON.parse(call.function.arguments || "{}");
    args.generatedAt = new Date().toISOString();
    args.swaps = args.swaps ?? [];
    args.addOns = args.addOns ?? [];
    return ok(args);
  } catch (e) {
    console.error("training-ai-adjust", e);
    return fail("UNKNOWN", (e as Error).message, 500);
  }
});
