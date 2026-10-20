import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function loadUserParameters(supabase: any, userId: string) {
  const { data } = await supabase.from("user_parameters").select("*").eq("user_id", userId).maybeSingle();
  return data;
}

function adjustForPDI(base: { volume: number; intensity: number }, pdi: any, label: string) {
  const notes: string[] = [];
  let volume = base.volume;
  let intensity = base.intensity;
  if (label === "recovery") { volume *= 0.4; intensity *= 0.5; notes.push("recovery_day"); }
  if (label === "light") { volume *= 0.7; intensity *= 0.75; notes.push("light_day"); }
  if (pdi) {
    const tolerance = typeof pdi.volume_tolerance === "number" ? Math.max(0, Math.min(10, pdi.volume_tolerance)) : 5;
    volume *= 0.6 + (tolerance / 10) * 0.6;
    if (pdi.recovery_rate === "slow") { volume *= 0.85; notes.push("slow_recovery_dampener"); }
    if (pdi.discomfort_tolerance === "conservative") intensity *= 0.9;
    if (pdi.discomfort_tolerance === "aggressive") intensity *= 1.05;
  }
  return { volume: Math.round(volume), intensity: Math.round(intensity), notes };
}

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
    const { workoutName, workoutType, bio, profile, activeSkills, recentRPE, exercises, prescription, date, request, sync, dayNumber, focusMuscles } = body ?? {};
    const userId = authedUserId; // trust JWT, not body

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return fail("CONFIG", "LOVABLE_API_KEY ausente", 500);

    const skills = Array.isArray(activeSkills)
      ? activeSkills.map((s: any) => `${s.slug}(${s.category})`).join(", ")
      : "";

    // PDI context — pull user_parameters and pre-compute baseline modulation
    const pdi = await loadUserParameters(authClient, userId);
    const base = adjustForPDI({ volume: 100, intensity: 100 }, pdi, "normal");
    const pdiBlock = pdi
      ? `PDI: goal=${pdi.goal ?? "não informado"}, recovery=${pdi.recovery_rate ?? "não informado"}, tol_vol=${pdi.volume_tolerance ?? "não informado"}/10, discomfort=${pdi.discomfort_tolerance ?? "não informado"}, injuries=${(pdi.injury_zones||[]).join("|")||"none"}. Baseline modulado: vol=${base.volume}%, int=${base.intensity}%, notes=${base.notes.join(",")}.`
      : "PDI: ainda não calibrado — use perfil conservador.";

    const sys = `Você é o FitCopilot, IA de ajuste adaptativo de treino do 9FIT PRO, sobre a prescrição do Smart Treino.
Responda SEMPRE chamando a tool ajustar_treino. Em português. Use apenas exercícios presentes na prescrição para mudanças. Não invente Sync, dia de ciclo, fadiga ou dados fisiológicos ausentes. Se houver dor ou restrição, seja conservador e recomende revisão profissional. Não aumente a carga em resposta a fadiga alta. Explique cada alteração concretamente. Não proponha exercício adicional: esta tela edita a sessão existente.
${pdiBlock}`;
    const userPrompt = `Treino: ${workoutName ?? "—"} (${workoutType ?? "geral"})
Perfil: nível ${profile?.level ?? "?"}, experiência ${profile?.experience ?? "?"}.
Estado fisiológico: HRV ${bio?.hrv ?? "—"} | Sono(min) ${bio?.sleep ?? "—"} | Recovery ${bio?.recovery ?? "—"}.
RPE recente: ${recentRPE ?? "—"}.
Exercícios atuais: ${Array.isArray(exercises) && exercises.length ? exercises.join(", ") : "não informado"}.
Prescrição Smart Treino: ${JSON.stringify(Array.isArray(prescription) ? prescription.slice(0, 30) : [])}.
Data da sessão: ${date ?? "não informada"}. Sync atual: ${typeof sync === "number" ? `${sync}%` : "não disponível"}.
Dia da estrutura Smart Treino: ${Number.isInteger(dayNumber) ? dayNumber : "não informado"}. Foco muscular: ${Array.isArray(focusMuscles) ? focusMuscles.join(", ") : "não informado"}.
Pedido do aluno: ${typeof request === "string" ? request.slice(0, 300) : "ajuste para os sinais atuais"}.
Restrições declaradas: ${profile?.restrictions ?? "não informadas"}.
Skills ativas: ${skills || "nenhuma"}.

Gere uma recomendação curta e, quando houver motivo concreto, mudanças de séries, dose, descanso ou RPE em changes para exercícios existentes. Use swaps apenas quando uma troca for realmente necessária. Deixe changes e swaps vazios quando os dados não sustentarem alteração. RESPEITE o PDI acima.`;

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
              changes: {
                type: "array",
                description: "Alterações por exercício da prescrição atual; omita campos que não devem mudar.",
                items: {
                  type: "object",
                  properties: {
                    exercise: { type: "string" },
                    sets: { type: "integer", minimum: 1, maximum: 10 },
                    reps: { type: "string" },
                    restSeconds: { type: "integer", minimum: 0, maximum: 600 },
                    rpe: { type: "integer", minimum: 1, maximum: 10 },
                    reason: { type: "string" },
                  },
                  required: ["exercise", "reason"],
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
    args.pdiAvailable = !!pdi;
    args.swaps = Array.isArray(args.swaps) ? args.swaps.slice(0, 20) : [];
    args.changes = Array.isArray(args.changes) ? args.changes.slice(0, 30) : [];
    args.addOns = [];
    return ok(args);
  } catch (e) {
    console.error("training-ai-adjust", e);
    return fail("UNKNOWN", (e as Error).message, 500);
  }
});
