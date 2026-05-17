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

  // === AUTH: Require authenticated user ===
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
    const { type, data, messages } = body;

    // Input validation
    if (!type || typeof type !== 'string') return apiError('INVALID_INPUT', 'Field "type" is required', 400);
    const allowedTypes = ['generate_training', 'analyze_progress', 'recommendations', 'chat'];
    if (!allowedTypes.includes(type)) return apiError('INVALID_TYPE', `Tipo inválido: ${type}`, 400);

    if (type === 'chat' && (!Array.isArray(messages) || messages.length === 0)) {
      return apiError('INVALID_INPUT', 'Field "messages" is required for chat type', 400);
    }
    if (type !== 'chat' && (!data || typeof data !== 'object')) {
      return apiError('INVALID_INPUT', 'Field "data" is required', 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return apiError('CONFIG_ERROR', 'LOVABLE_API_KEY not configured', 500);

    let systemPrompt = "";
    let userPrompt = "";
    let stream = false;

    switch (type) {
      case "generate_training": {
        // Pull a catalog of available exercises (with videos) so the AI prescribes from the real library
        let catalogText = "";
        try {
          const { data: lib } = await authClient
            .from("library_items")
            .select("name, category, subcategory, thumbnail_url, player_url")
            .eq("type", "exercise")
            .not("player_url", "is", null)
            .limit(120);
          if (lib && lib.length) {
            catalogText = "\n\nCATÁLOGO DE EXERCÍCIOS DISPONÍVEIS (use APENAS estes nomes; cada item tem vídeo):\n" +
              lib.map((e: any) => `• ${e.name}${e.category ? ` [${e.category}]` : ""}`).join("\n");
          }
        } catch (_) { /* catalog optional */ }

        systemPrompt = `Você é um personal trainer especialista em prescrição de exercícios.
Gere um plano de treino completo em HTML formatado com as tags: h3, h4, ul, li, strong, em, table, tr, td, th.
Inclua para cada exercício: nome (igual ao catálogo), séries, repetições, carga (% RM ou RPE), descanso.
Organize por dias da semana, com aquecimento e volta à calma.
NÃO use markdown — apenas HTML puro. Responda APENAS com o HTML.${catalogText}`;

        const d = data;
        userPrompt = `Gere um treino personalizado:
- Nome: ${String(d.studentName || '').slice(0, 100)}
- Idade: ${String(d.age || '').slice(0, 5)} | Gênero: ${String(d.gender || 'não informado').slice(0, 20)}
- Objetivo: ${String(d.primaryGoal || '').slice(0, 100)}
- Nível: ${String(d.experienceLevel || '').slice(0, 50)}
- Frequência: ${String(d.weeklyFrequency || '').slice(0, 5)}x/sem | Sessão: ${String(d.sessionDuration || '').slice(0, 10)} min
- Ambiente: ${String(d.trainingEnvironment || 'academia').slice(0, 50)}
- Equipamentos: ${Array.isArray(d.availableEquipment) ? d.availableEquipment.map((e: any) => String(e).slice(0, 50)).join(', ') : 'todos'}
- Histórico: ${String(d.trainingHistory || 'não informado').slice(0, 500)}
- Lesões/Restrições: ${String(d.injuries || 'nenhuma').slice(0, 500)} / ${String(d.restrictions || 'nenhuma').slice(0, 500)}
- Saúde: ${String(d.healthConditions || 'nenhuma').slice(0, 500)}
- Estilo: ${String(d.trainingStyle || 'tradicional').slice(0, 50)}
- Preferidos: ${String(d.preferredExercises || 'sem preferência').slice(0, 500)}
- Evitar: ${String(d.avoidedExercises || 'nenhum').slice(0, 500)}
- Observações: ${String(d.additionalNotes || 'nenhuma').slice(0, 500)}`;
        break;
      }

      case "analyze_progress": {
        systemPrompt = `Você é um analista de performance esportiva. Analise os dados do aluno e forneça insights detalhados.
Responda em HTML formatado com seções claras: Resumo, Pontos Fortes, Áreas de Melhoria, Tendências, e Recomendações.
Use tags h3, h4, ul, li, strong, em. Seja específico e baseado nos dados.`;
        
        const p = data;
        userPrompt = `Analise o progresso deste aluno:
- Nome: ${String(p.name || '').slice(0, 100)}
- Avaliações: ${JSON.stringify(p.assessments || []).slice(0, 2000)}
- Check-ins recentes: ${JSON.stringify(p.checkins || []).slice(0, 2000)}
- Treinos realizados: ${String(p.workoutsCompleted || 0).slice(0, 10)}
- Frequência média: ${String(p.avgFrequency || 'N/A').slice(0, 20)}
- Objetivo: ${String(p.goal || 'não definido').slice(0, 100)}`;
        break;
      }

      case "recommendations": {
        systemPrompt = `Você é um consultor fitness especializado. Com base nos dados do aluno, gere recomendações personalizadas.
Responda em JSON com a seguinte estrutura:
{
  "recommendations": [
    { "category": "treino|nutrição|recuperação|mindset", "title": "título curto", "description": "descrição detalhada", "priority": "alta|média|baixa", "icon": "dumbbell|apple|moon|brain" }
  ]
}
Gere entre 4 e 6 recomendações. Responda APENAS com o JSON, sem markdown.`;

        const r = data;
        userPrompt = `Gere recomendações para este aluno:
- Nome: ${String(r.name || '').slice(0, 100)}
- Objetivo: ${String(r.goal || 'hipertrofia').slice(0, 100)}
- Nível: ${String(r.level || 'intermediário').slice(0, 50)}
- Frequência: ${String(r.frequency || 3)}x/semana
- Lesões: ${String(r.injuries || 'nenhuma').slice(0, 500)}
- Check-in recente (sono/energia/dor): ${String(r.lastCheckin || 'sem dados').slice(0, 200)}
- Tendência de peso: ${String(r.weightTrend || 'estável').slice(0, 50)}`;
        break;
      }

      case "chat": {
        stream = true;
        systemPrompt = `Você é o Assistente IA do 9FIT PRO, uma plataforma de gestão de treinos para personal trainers.
Você ajuda professores com:
- Prescrição de exercícios e periodização
- Análise de progresso de alunos
- Estratégias de nutrição esportiva
- Gestão de negócios fitness
- Dúvidas sobre fisiologia do exercício
Seja profissional, direto e baseado em evidências científicas. Responda em português brasileiro.`;
        break;
      }
    }

    // Sanitize chat messages
    const sanitizedMessages = type === "chat"
      ? messages.slice(0, 50).map((m: any) => ({
          role: ['user', 'assistant', 'system'].includes(m.role) ? m.role : 'user',
          content: String(m.content || '').slice(0, 4000),
        }))
      : [{ role: "user", content: userPrompt }];

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...sanitizedMessages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: aiMessages, stream }),
    });

    if (!response.ok) {
      if (response.status === 429) return apiError('RATE_LIMITED', 'Limite de requisições excedido. Tente novamente em alguns instantes.', 429);
      if (response.status === 402) return apiError('CREDITS_EXHAUSTED', 'Créditos de IA esgotados. Adicione créditos no workspace.', 402);
      console.error("AI gateway error:", response.status);
      return apiError('AI_SERVICE_ERROR', 'Erro no serviço de IA', 500);
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    return apiResponse({ content });
  } catch (e) {
    console.error("ai-coach error:", e);
    return apiError('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
