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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurado");
    }

    // Authenticate user
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, athleteId } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user context from DB
    const db = createClient(supabaseUrl, serviceRoleKey);
    
    // Get user role
    const { data: roleData } = await db.rpc("get_user_role", { _user_id: user.id });
    const userRole = roleData || "user";

    // Gather context based on role
    let contextBlock = "";

    if (userRole === "professor" || userRole === "admin" || userRole === "trainer") {
      // Professor: get their athletes summary
      const { data: athletes } = await db
        .from("athletes")
        .select("id, name, objetivo, nivel, sessions_per_week, injuries_limitations")
        .eq("coach_id", user.id)
        .limit(20);

      const { data: profile } = await db
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user.id)
        .single();

      contextBlock = `
## CONTEXTO DO PROFESSOR
- Nome: ${profile?.full_name || user.email}
- Role: ${userRole}
- Total de alunos: ${athletes?.length || 0}
${athletes && athletes.length > 0 ? `- Alunos: ${athletes.map((a: any) => `${a.name} (${a.objetivo || "sem objetivo"}, ${a.nivel || "sem nível"})`).join("; ")}` : ""}

Se o professor perguntar sobre um aluno específico, use os dados acima para contextualizar.`;

      // If athleteId provided, get detailed athlete data
      if (athleteId) {
        const { data: athlete } = await db
          .from("athletes")
          .select("*")
          .eq("id", athleteId)
          .eq("coach_id", user.id)
          .single();

        if (athlete) {
          const { data: assessments } = await db
            .from("avaliacoes_unificadas")
            .select("data_avaliacao, peso, gordura_corporal, massa_muscular, imc, score_global")
            .or(`aluno_id.eq.${athleteId},athlete_id.eq.${athleteId}`)
            .order("data_avaliacao", { ascending: false })
            .limit(3);

          contextBlock += `
## ALUNO EM FOCO: ${athlete.name}
- Objetivo: ${athlete.objetivo || athlete.primary_goal || "não definido"}
- Nível: ${athlete.nivel || athlete.training_level || "não definido"}
- Frequência semanal: ${athlete.sessions_per_week || athlete.weekly_frequency || "N/A"}
- Lesões/Restrições: ${athlete.injuries_limitations || "nenhuma"}
- Ambiente: ${athlete.training_environment || "academia"}
${assessments && assessments.length > 0 ? `- Última avaliação (${assessments[0].data_avaliacao}): Peso ${assessments[0].peso}kg, BF ${assessments[0].gordura_corporal}%, Score ${assessments[0].score_global}` : ""}`;
        }
      }
    } else {
      // Student: get their own data
      const { data: athleteLink } = await db
        .from("athlete_auth_link")
        .select("athlete_id")
        .eq("user_id", user.id)
        .single();

      if (athleteLink) {
        const { data: athlete } = await db
          .from("athletes")
          .select("*")
          .eq("id", athleteLink.athlete_id)
          .single();

        if (athlete) {
          contextBlock = `
## CONTEXTO DO ALUNO
- Nome: ${athlete.name}
- Objetivo: ${athlete.objetivo || athlete.primary_goal || "não definido"}
- Nível: ${athlete.nivel || athlete.training_level || "não definido"}
- Frequência semanal: ${athlete.sessions_per_week || "N/A"}
- Lesões: ${athlete.injuries_limitations || "nenhuma"}`;
        }
      }

      if (!contextBlock) {
        const { data: profile } = await db
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .single();
        contextBlock = `\n## CONTEXTO\n- Usuário: ${profile?.full_name || user.email}\n- Role: ${userRole}`;
      }
    }

    const systemPrompt = `Você é o Coach IA do sistema 9FIT SmartTreino — um assistente inteligente e especialista em treinamento físico personalizado.

COMPORTAMENTO:
- Responda SEMPRE em português brasileiro
- Seja objetivo, técnico mas acessível
- Use markdown para formatar (negrito, listas, emojis)
- Adapte suas respostas ao contexto do usuário
- Quando sugerir treinos, use a metodologia 9FIT com 4 blocos: NEURAL → INTEGRAÇÃO → BLOCO 9 → RESET
- Para exercícios, sempre inclua: séries, repetições, descanso e dicas de execução
- Se o usuário mencionar dor ou lesão, SEMPRE recomende consultar um profissional de saúde
- Memorize o que o usuário disse nas mensagens anteriores e use para contextualizar respostas

METODOLOGIA 9FIT:
1. **NEURAL** (Ativação): Preparação neuromuscular específica
2. **INTEGRAÇÃO** (Conexão): Mobilidade e aquecimento funcional  
3. **BLOCO 9** (Execução): Exercícios principais do treino
4. **RESET** (Recuperação): Volta à calma e regeneração

PROTOCOLOS:
- FORÇA: 4-6 séries, 3-6 reps, RPE 8-9, descanso 120-180s
- HIPERTROFIA: 3-4 séries, 8-15 reps, RPE 7-8, descanso 60-90s
- EMAGRECIMENTO: 3 séries, 12-20 reps, RPE 6-7, descanso 30-45s
- PERFORMANCE: 3-5 séries, 3-8 reps, RPE 7-9, descanso 90-120s

CAPACIDADES:
- Criar treinos completos personalizados em tempo real
- Substituir exercícios com alternativas equivalentes
- Ajustar volume/intensidade baseado em feedback
- Orientar sobre nutrição pré/pós treino
- Analisar progressão e sugerir ajustes
- Adaptar treinos para lesões e limitações
${contextBlock}`;

    console.log(`[ai-coach-chat] User: ${user.id}, Role: ${userRole}, Messages: ${messages.length}`);

    // Call Lovable AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("[ai-coach-chat] AI error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    // Stream the response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[ai-coach-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}, {bucket:'ai'}));
