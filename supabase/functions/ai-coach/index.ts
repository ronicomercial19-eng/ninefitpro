import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";
import { loadUserParameters } from "../_shared/pdi.ts";


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

// FIX QA Master #4: monta contexto real do atleta (sync score, sono, HRV,
// avaliações, treinos recentes) para os modos 'recommendations'/'recommend'
// e 'analyze_progress'/'analyze', que antes recebiam só {name, goal, level,
// injuries} do front e geravam recomendações "no escuro". Mirra a lógica de
// contexto já usada no modo 'chat' do RON.
async function buildAthleteRichContext(authClient: any, athleteId: string) {
  const parts: string[] = [];

  const { data: ath } = await authClient
    .from("athletes")
    .select("id, name, level, xp_total, total_xp, sync_score, preferred_goal, primary_goal, experience_level, injuries_limitations, user_id")
    .eq("id", athleteId)
    .maybeSingle();
  if (ath) {
    parts.push(`Nível ${ath.level || 1} • Sync Score ${ath.sync_score ?? 0} • XP ${ath.xp_total || ath.total_xp || 0} • Objetivo ${ath.preferred_goal || ath.primary_goal || 'NI'} • Nível de experiência ${ath.experience_level || 'NI'} • Lesões/limitações: ${ath.injuries_limitations || 'nenhuma'}`);
  }

  const { data: scoreLogs } = await authClient
    .from("sync_score_logs")
    .select("score, feedback_text, created_at")
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (scoreLogs?.length) {
    parts.push(`Últimos sync scores: ${scoreLogs.map((l: any) => l.score).join(', ')}`);
    if (scoreLogs[0]?.feedback_text) parts.push(`Último feedback: ${scoreLogs[0].feedback_text.slice(0, 200)}`);
  }

  const { data: workouts } = await authClient
    .from("workout_executions")
    .select("workout_date, status")
    .eq("athlete_id", athleteId)
    .order("workout_date", { ascending: false })
    .limit(10);
  if (workouts?.length) {
    const completed = workouts.filter((w: any) => w.status === 'completed').length;
    parts.push(`Treinos: ${completed}/${workouts.length} concluídos nos últimos registros. Último em ${workouts[0]?.workout_date || 'NI'}`);
  } else {
    parts.push(`Sem execuções de treino registradas ainda`);
  }

  const { data: assessments } = await authClient
    .from("avaliacoes_unificadas")
    .select("peso, gordura_corporal, massa_muscular, score_global, data_avaliacao")
    .eq("athlete_id", athleteId)
    .order("data_avaliacao", { ascending: false })
    .limit(3);
  if (assessments?.length) {
    parts.push(`Avaliações recentes: ${assessments.map((a: any) => `[${a.data_avaliacao}] score ${a.score_global ?? 'NI'}, peso ${a.peso ?? 'NI'}kg`).join('; ')}`);
  } else {
    parts.push(`Sem avaliações físicas registradas ainda`);
  }

  try {
    const { data: sleep } = await authClient
      .from("bio_sleep_logs")
      .select("hours, duration_hours, quality_score")
      .eq("user_id", ath?.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sleep) parts.push(`Sono recente: ${sleep.hours ?? sleep.duration_hours ?? 'NI'}h, qualidade ${sleep.quality_score ?? 'NI'}`);
  } catch (_) { /* table optional */ }

  return parts.length ? parts.join('\n') : 'Sem dados suficientes registrados para este atleta ainda.';
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
      // Build live context for RON (v9: profile + sync logs + state + memories)
      let ctx = "";
      let inferredState = "balanced";
      if (userId) {
        try {
          const { data: ath } = await authClient
            .from("athletes")
            .select("id, name, level, xp_total, total_xp, sync_score, preferred_goal")
            .or(`user_id.eq.${userId}`)
            .maybeSingle();
          if (ath) {
            ctx += `\n<PERFIL>${ath.name} • Nível ${ath.level || 1} • Sync ${ath.sync_score || 0} • XP ${ath.xp_total || ath.total_xp || 0} • Objetivo ${ath.preferred_goal || 'NI'}</PERFIL>`;
          }

          // Sync score history → infer state
          const { data: scoreLogs } = await authClient
            .from("sync_score_logs")
            .select("score, feedback_text, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);
          if (scoreLogs?.length) {
            const scores = scoreLogs.map((l: any) => Number(l.score));
            const latest = scores[0];
            const feedback = scoreLogs[0]?.feedback_text || "";
            const trendDown = scores.length >= 3 && scores[2] - scores[0] > 1;
            const negativeKw = /(cansad|exaust|fadiga|dor |estafad|lesion)/i.test(feedback);
            if (negativeKw || (trendDown && latest < 6) || latest < 5.5) inferredState = "low";
            else if (latest > 7.5) inferredState = "power";
            ctx += `\n<ESTADO_INFERIDO>${inferredState.toUpperCase()} (sync atual: ${latest}, últimos: ${scores.join(',')})</ESTADO_INFERIDO>`;
            if (feedback) ctx += `\n<ULTIMO_FEEDBACK>${feedback.slice(0, 200)}</ULTIMO_FEEDBACK>`;
          }

          // PDI via helper compartilhado — fonte única de verdade do perfil
          const pdi = await loadUserParameters(authClient, userId);
          if (pdi) {
            ctx += `\n<PDI>goal=${pdi.goal}, recovery=${pdi.recovery_rate}, tol_vol=${pdi.volume_tolerance}/10, peak=${pdi.peak_window}, discomfort=${pdi.discomfort_tolerance}, injuries=${(pdi.injury_zones||[]).join("|")||"none"}, restrições=${(pdi.dietary_restrictions||[]).join("|")||"none"}</PDI>`;
          }

          // Top memories
          const { data: mems } = await authClient
            .from("ron_long_term_memories")
            .select("memory_type, content, importance_score")
            .eq("user_id", userId)
            .order("importance_score", { ascending: false })
            .limit(8);

          if (mems?.length) {
            ctx += `\n<MEMORIAS>\n${mems.map((m: any) => `[${m.memory_type}] ${m.content}`).join("\n")}\n</MEMORIAS>`;
          }

          const { data: lastReg } = await authClient
            .from("master_registry")
            .select("event_type, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);
          if (lastReg?.length) {
            ctx += `\n<EVENTOS_RECENTES>${lastReg.map((r: any) => r.event_type).join(", ")}</EVENTOS_RECENTES>`;
          }
        } catch (_) { /* context optional */ }
      }

      const stateInstructions: Record<string, string> = {
        power: "Tom direto, desafiador e energético. Respostas médio-longas. Foco em progressão.",
        low:   "Tom curto, empático e acolhedor. Respostas concisas. Priorize recuperação e consistência pequena.",
        balanced: "Tom equilibrado e claro. Respostas normais. Foco em execução.",
      };

      systemPrompt = `Você é o RON — Neural Coach do 9FIT, Layer 2 de Inteligência.
${stateInstructions[inferredState]}
Português brasileiro. Use o contexto abaixo em TODAS as respostas. Quando citar dados, seja específico.
NUNCA invente dados que não estão no contexto.
${ctx}

<INSTRUÇÕES_RON>
- Referencie Sync Score, estado e feedbacks anteriores quando relevante.
- Se identificar nova preferência, lesão, meta ou fato do usuário, mencione brevemente que vai lembrar disso.
- Adapte tom conforme estado inferido acima.
</INSTRUÇÕES_RON>`;

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
      systemPrompt = `Analista de performance. HTML formatado: Resumo, Pontos Fortes, Áreas de Melhoria, Tendências, Recomendações. Use h3, h4, ul, li, strong.
NUNCA invente dados que não estejam no contexto abaixo. Se um dado não existir, diga explicitamente que não há dados suficientes em vez de estimar.`;
      const p = data || {};
      let richCtx = "";
      if (p.athleteId) {
        try { richCtx = await buildAthleteRichContext(authClient, p.athleteId); } catch (_) { /* optional */ }
      }
      userPrompt = `Analise o aluno: Nome: ${String(p.name || '')} | Objetivo: ${String(p.goal || '')}
<DADOS_REAIS_DO_ATLETA>
${richCtx || 'Sem dados adicionais fornecidos.'}
</DADOS_REAIS_DO_ATLETA>
${p.assessments?.length ? `Avaliações brutas: ${JSON.stringify(p.assessments).slice(0, 1500)}` : ''}`;
      chatMessages = [{ role: 'user', content: userPrompt }];
    } else {
      // FIX QA Master #4: modo 'recommendations'/'recommend' agora carrega
      // contexto real (sync score, treinos, avaliações, sono) em vez de
      // gerar recomendações apenas com name/goal/level/injuries.
      systemPrompt = `Consultor fitness. JSON: {"recommendations":[{"category":"...","title":"...","description":"...","priority":"alta|média|baixa","icon":"dumbbell|apple|moon|brain"}]}. 4-6 itens. APENAS JSON.
Baseie CADA recomendação em pelo menos um dado concreto do contexto fornecido — cite o dado na descrição. Se o contexto disser que faltam dados em alguma área, gere uma recomendação pedindo esse registro em vez de inventar um conselho genérico.`;
      const r = data || {};
      let richCtx = "";
      if (r.athleteId) {
        try { richCtx = await buildAthleteRichContext(authClient, r.athleteId); } catch (_) { /* optional */ }
      }
      userPrompt = `Aluno: ${String(r.name || '')} | Objetivo: ${String(r.goal || '')} | Nível: ${String(r.level || '')} | Lesões: ${String(r.injuries || '')}
<DADOS_REAIS_DO_ATLETA>
${richCtx || 'Sem dados adicionais fornecidos — gere recomendações pedindo que o aluno complete avaliação e primeiro treino.'}
</DADOS_REAIS_DO_ATLETA>`;
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
