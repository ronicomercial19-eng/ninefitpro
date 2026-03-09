import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Standardized API response */
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

  try {
    const { type, data, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return apiError('CONFIG_ERROR', 'LOVABLE_API_KEY not configured', 500);

    let systemPrompt = "";
    let userPrompt = "";
    let stream = false;

    switch (type) {
      case "generate_training": {
        systemPrompt = `Você é um personal trainer especialista em prescrição de exercícios. 
Gere um plano de treino completo em HTML formatado com as seguintes tags: h3, h4, ul, li, strong, em, table, tr, td, th.
O treino deve ser detalhado com: nome do exercício, séries, repetições, carga sugerida (% de RM ou RPE), tempo de descanso.
Organize por dias da semana. Inclua aquecimento e volta à calma.
Use cores e formatação HTML profissional. NÃO use markdown, apenas HTML puro.
Responda APENAS com o HTML do treino, sem explicações extras fora do HTML.`;
        
        const d = data;
        userPrompt = `Gere um treino personalizado com os seguintes dados:
- Nome: ${d.studentName}
- Idade: ${d.age} anos, Gênero: ${d.gender || 'não informado'}
- Objetivo principal: ${d.primaryGoal}
- Nível: ${d.experienceLevel}
- Frequência: ${d.weeklyFrequency}x por semana
- Duração da sessão: ${d.sessionDuration} minutos
- Ambiente: ${d.trainingEnvironment || 'academia'}
- Equipamentos: ${d.availableEquipment?.join(', ') || 'todos disponíveis'}
- Histórico: ${d.trainingHistory || 'não informado'}
- Lesões/Restrições: ${d.injuries || 'nenhuma'} / ${d.restrictions || 'nenhuma'}
- Condições de saúde: ${d.healthConditions || 'nenhuma'}
- Estilo preferido: ${d.trainingStyle || 'tradicional'}
- Exercícios preferidos: ${d.preferredExercises || 'sem preferência'}
- Exercícios a evitar: ${d.avoidedExercises || 'nenhum'}
- Observações: ${d.additionalNotes || 'nenhuma'}`;
        break;
      }

      case "analyze_progress": {
        systemPrompt = `Você é um analista de performance esportiva. Analise os dados do aluno e forneça insights detalhados.
Responda em HTML formatado com seções claras: Resumo, Pontos Fortes, Áreas de Melhoria, Tendências, e Recomendações.
Use tags h3, h4, ul, li, strong, em. Seja específico e baseado nos dados.`;
        
        const p = data;
        userPrompt = `Analise o progresso deste aluno:
- Nome: ${p.name}
- Avaliações: ${JSON.stringify(p.assessments || [])}
- Check-ins recentes: ${JSON.stringify(p.checkins || [])}
- Treinos realizados: ${p.workoutsCompleted || 0}
- Frequência média: ${p.avgFrequency || 'N/A'}
- Objetivo: ${p.goal || 'não definido'}`;
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
- Nome: ${r.name}
- Objetivo: ${r.goal || 'hipertrofia'}
- Nível: ${r.level || 'intermediário'}
- Frequência: ${r.frequency || 3}x/semana
- Lesões: ${r.injuries || 'nenhuma'}
- Check-in recente (sono/energia/dor): ${r.lastCheckin || 'sem dados'}
- Tendência de peso: ${r.weightTrend || 'estável'}`;
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

      default:
        return apiError('INVALID_TYPE', `Tipo inválido: ${type}`, 400);
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(type === "chat" ? messages : [{ role: "user", content: userPrompt }]),
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
      console.error("AI gateway error:", response.status, await response.text());
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
    return apiError('INTERNAL_ERROR', e instanceof Error ? e.message : 'Erro desconhecido', 500);
  }
});
