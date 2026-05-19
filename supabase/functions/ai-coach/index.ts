import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function apiResponse(data: any, status = 200) {
  return new Response(JSON.stringify({
    success: status < 400,
    ...(status < 400 ? { data } : { error: data }),
    metadata: { timestamp: new Date().toISOString(), version: 'v1' }
  }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function apiError(code: string, message: string, status = 500) {
  return apiResponse({ code, message }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return apiError('UNAUTHORIZED', 'Missing authorization', 401);

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (claimsError || !claimsData?.claims) return apiError('INVALID_TOKEN', 'Invalid token', 401);

  try {
    const body = await req.json();
    // Accept both legacy { type } and new { mode }; both keys work.
    const mode: string = body.mode || body.type || "chat";
    const data = body.data;
    const message: string | undefined = body.message;
    const history: any[] = Array.isArray(body.history) ? body.history : [];
    const userId: string | undefined = body.userId;
    const messages: any[] = Array.isArray(body.messages) ? body.messages : [];

    const allowed = ['generate_training', 'train', 'analyze_progress', 'analyze', 'recommendations', 'recommend', 'chat'];
    if (!allowed.includes(mode)) return apiError('INVALID_MODE', `Modo inválido: ${mode}`, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return apiError('CONFIG_ERROR', 'LOVABLE_API_KEY not configured', 500);

    let systemPrompt = "";
    let userPrompt = "";
    let chatMessages: any[] = [];

    if (mode === "chat") {
      // Build live context for RON
      let ctx = "";
      if (userId) {
        try {
          const { data: ath } = await authClient
            .from("athletes")
            .select("id, name, level, xp_total, total_xp, sync_score")
            .or(`user_id.eq.${userId}`)
            .maybeSingle();
          if (ath) {
            ctx += `\nAluno: ${ath.name} • Nível ${ath.level || 1} • Sync ${ath.sync_score || 0} • XP ${ath.xp_total || ath.total_xp || 0}.`;
          }
          const { data: lastReg } = await authClient
            .from("master_registry")
            .select("event_type, created_at, payload")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);
          if (lastReg?.length) {
            ctx += `\nÚltimos eventos: ${lastReg.map((r: any) => r.event_type).join(", ")}.`;
          }
        } catch (_) { /* context optional */ }
      }

      systemPrompt = `Você é o RON — Neural Coach do 9FIT.
Tom: direto, conciso, motivador, baseado em ciência. Português brasileiro.
Responda em no máximo 3 parágrafos curtos. Use frases de impacto.
Quando tiver dados do aluno, referencie Sync, XP, streak ou hábitos recentes.
${ctx}`;

      // Build messages: prefer explicit `messages[]`, fall back to history + message
      if (messages.length > 0) {
        chatMessages = messages.slice(-30).map((m: any) => ({
          role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
          content: String(m.content || '').slice(0, 4000),
        }));
      } else {
        chatMessages = history.slice(-20).map((m: any) => ({
          role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
          content: String(m.content || '').slice(0, 4000),
        }));
        if (message) {
          // Special opener handshake
          const finalMsg = message === '__open__'
            ? 'Diga olá em uma frase, citando algo do meu progresso recente se houver contexto.'
            : String(message).slice(0, 4000);
          chatMessages.push({ role: 'user', content: finalMsg });
        }
      }

      if (chatMessages.length === 0) return apiError('INVALID_INPUT', 'message ou messages obrigatório', 400);
    } else if (mode === 'generate_training' || mode === 'train') {
      let catalogText = "";
      try {
        const { data: lib } = await authClient
          .from("library_items")
          .select("name, category")
          .eq("type", "exercise")
          .not("player_url", "is", null)
          .limit(120);
        if (lib?.length) {
          catalogText = "\n\nCATÁLOGO (use APENAS estes nomes):\n" +
            lib.map((e: any) => `• ${e.name}${e.category ? ` [${e.category}]` : ""}`).join("\n");
        }
      } catch (_) {}
      systemPrompt = `Você é um personal trainer especialista. Gere treino em HTML puro (h3, h4, ul, li, strong, table, tr, td, th). Sem markdown. APENAS HTML.${catalogText}`;
      const d = data || {};
      userPrompt = `Gere treino:
- Nome: ${String(d.studentName || '').slice(0, 100)}
- Idade: ${String(d.age || '')} | Gênero: ${String(d.gender || 'NI')}
- Objetivo: ${String(d.primaryGoal || '').slice(0, 100)}
- Nível: ${String(d.experienceLevel || '').slice(0, 50)}
- Frequência: ${String(d.weeklyFrequency || '')}x/sem | Duração: ${String(d.sessionDuration || '')}min
- Ambiente: ${String(d.trainingEnvironment || 'academia').slice(0, 50)}
- Equipamentos: ${Array.isArray(d.availableEquipment) ? d.availableEquipment.join(', ') : 'todos'}
- Lesões: ${String(d.injuries || 'nenhuma').slice(0, 500)}`;
      chatMessages = [{ role: 'user', content: userPrompt }];
    } else if (mode === 'analyze_progress' || mode === 'analyze') {
      systemPrompt = `Analista de performance. HTML formatado: Resumo, Pontos Fortes, Áreas de Melhoria, Tendências, Recomendações. Use h3, h4, ul, li, strong.`;
      const p = data || {};
      userPrompt = `Analise: Nome: ${String(p.name || '')} | Treinos: ${p.workoutsCompleted || 0} | Objetivo: ${String(p.goal || '')} | Dados: ${JSON.stringify(p).slice(0, 2000)}`;
      chatMessages = [{ role: 'user', content: userPrompt }];
    } else {
      systemPrompt = `Consultor fitness. JSON: {"recommendations":[{"category":"...","title":"...","description":"...","priority":"alta|média|baixa","icon":"dumbbell|apple|moon|brain"}]}. 4-6 itens. APENAS JSON.`;
      const r = data || {};
      userPrompt = `Aluno: ${String(r.name || '')} | Objetivo: ${String(r.goal || '')} | Nível: ${String(r.level || '')} | Lesões: ${String(r.injuries || '')}`;
      chatMessages = [{ role: 'user', content: userPrompt }];
    }

    const aiBody = {
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: systemPrompt }, ...chatMessages],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      console.error("AI gateway error:", response.status, txt.slice(0, 400));
      if (response.status === 429) return apiError('RATE_LIMITED', 'Limite excedido. Tente novamente.', 429);
      if (response.status === 402) return apiError('CREDITS_EXHAUSTED', 'Créditos de IA esgotados.', 402);
      return apiError('AI_SERVICE_ERROR', `IA indisponível (${response.status})`, 500);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "Sem resposta da IA.";
    return apiResponse({ content });
  } catch (e: any) {
    console.error("ai-coach error:", e?.message, e?.stack);
    return apiError('INTERNAL_ERROR', e?.message || 'Erro interno', 500);
  }
});
