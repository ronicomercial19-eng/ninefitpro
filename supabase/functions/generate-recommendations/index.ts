import {withPaidAccess} from "../_shared/paidAccess.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(withPaidAccess(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurado");
    }

    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`[generate-recommendations] Authenticated user: ${userId}`);

    const { studentId, studentData } = await req.json();

    // Use service role for data queries
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, supabaseServiceKey);

    console.log(`[generate-recommendations] Gerando recomendações para aluno ${studentId}`);

    const { data: workoutHistory } = await supabase
      .from("historico_treinos_realizados")
      .select("*")
      .eq("aluno_id", studentId)
      .order("data_treino", { ascending: false })
      .limit(10);

    const { data: evaluations } = await supabase
      .from("avaliacoes_unificadas")
      .select("*")
      .eq("aluno_id", studentId)
      .order("data_avaliacao", { ascending: false })
      .limit(5);

    const systemPrompt = `Você é um personal trainer especializado em análise de desempenho e periodização de treino.

Analise os dados do aluno e gere recomendações ESPECÍFICAS e ACIONÁVEIS. Cada recomendação deve ter:
- type: "warning" (alerta crítico), "suggestion" (melhoria sugerida) ou "success" (reconhecimento positivo)
- title: Título direto e objetivo (máx 60 caracteres)
- description: Explicação clara baseada em dados (100-150 caracteres)
- action: Ação específica recomendada com números concretos

Retorne JSON com: { "recommendations": [...] }`;

    const userPrompt = `DADOS DO ALUNO:
${JSON.stringify(studentData, null, 2)}

HISTÓRICO DE TREINOS (últimos 10):
${JSON.stringify(workoutHistory || [], null, 2)}

AVALIAÇÕES FÍSICAS (últimas 5):
${JSON.stringify(evaluations || [], null, 2)}

Gere 3-5 recomendações baseadas nos dados reais. Seja específico com números e prazos.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 2000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-recommendations] Erro na IA:", aiResponse.status, errorText);
      throw new Error(`Erro na IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error("IA não retornou resposta válida");
    }

    let recommendations;
    try {
      const codeBlockMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        const parsed = JSON.parse(codeBlockMatch[1]);
        recommendations = parsed.recommendations || [];
      } else {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          recommendations = parsed.recommendations || [];
        } else {
          recommendations = [{
            type: "suggestion",
            title: "Análise Pendente",
            description: "Continue registrando treinos para receber recomendações mais precisas",
            action: "Registre pelo menos 5 treinos para análise detalhada"
          }];
        }
      }
    } catch (e) {
      console.error("[generate-recommendations] Erro ao parsear resposta:", e);
      recommendations = [{
        type: "warning",
        title: "Erro na Análise",
        description: "Não foi possível processar as recomendações. Tente novamente.",
        action: "Verificar logs para mais detalhes"
      }];
    }

    console.log(`[generate-recommendations] ${recommendations.length} recomendações geradas`);

    return new Response(
      JSON.stringify({ recommendations }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[generate-recommendations] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}, {bucket:'ai'}));
