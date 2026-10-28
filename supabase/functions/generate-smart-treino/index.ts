import {withPaidAccess} from "../_shared/paidAccess.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-weekly-training-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_WORKOUT_TYPES = new Set(["strength", "hypertrophy", "endurance", "power", "recovery", "quick"]);
const PILLAR_TO_WORKOUT_TYPE: Record<string, string> = {
  performance: "endurance",
  estrutural: "hypertrophy",
  longevidade: "recovery",
};
function resolveWorkoutType(pillar?: string | null): string {
  if (pillar && VALID_WORKOUT_TYPES.has(pillar)) return pillar;
  if (pillar && PILLAR_TO_WORKOUT_TYPE[pillar]) return PILLAR_TO_WORKOUT_TYPE[pillar];
  return "hypertrophy";
}

const MUSCLE_SYNONYMS: Record<string, string[]> = {
  gluteos: ["glúteo"],
  "glúteos": ["glúteo"],
  "gluteo medio": ["glúteo"],
  "glúteo médio": ["glúteo"],
  quadriceps: ["membros inferiores"],
  "quadríceps": ["membros inferiores"],
  posterior_coxa: ["isquiotibiais", "membros inferiores"],
  posterior_de_coxa: ["isquiotibiais", "membros inferiores"],
  "posterior de coxa": ["isquiotibiais", "membros inferiores"],
  "posteriores": ["isquiotibiais", "membros inferiores"],
  panturrilhas: ["membros inferiores"],
  panturrilha: ["membros inferiores"],
  "articulacoes inferiores": ["membros inferiores"],
  "articulações inferiores": ["membros inferiores"],
  "estabilizadores inferiores": ["membros inferiores"],
  "membros inferiores (mmii)": ["membros inferiores"],
  mmii: ["membros inferiores"],
  peito: ["peitoral"],
  peitoral: ["peitoral"],
  peitorais: ["peitoral"],
  mmss: ["ombro"],
  "membros superiores": ["ombro"],
  dorsais: ["dorsais", "latíssimo", "romboides", "trapézio"],
  dorsal: ["dorsais", "latíssimo", "romboides", "trapézio"],
  costas: ["dorsais", "latíssimo", "romboides", "trapézio"],
  "latissimo do dorso": ["latíssimo"],
  "latíssimo do dorso": ["latíssimo"],
  "coluna toracica": ["dorsais", "trapézio"],
  "coluna torácica": ["dorsais", "trapézio"],
  ombros: ["ombro", "deltoides"],
  ombro: ["ombro", "deltoides"],
  deltoides: ["deltoides", "ombro"],
  "serratil": ["ombro", "deltoides"],
  "serrátil": ["ombro", "deltoides"],
  "infraspinatus": ["ombro", "deltoides"],
  "teres minor": ["ombro", "deltoides"],
  "manguito": ["ombro", "deltoides"],
  "manguito rotador": ["ombro", "deltoides"],
  biceps: ["bíceps"],
  "bíceps": ["bíceps"],
  triceps: ["tríceps"],
  "tríceps": ["tríceps"],
  core: ["core", "abdômen"],
  abdomen: ["abdômen", "core"],
  "abdômen": ["abdômen", "core"],
  "core profundo": ["core", "abdômen"],
  "transverso do abdome": ["core", "abdômen"],
  "transverso do abdomen": ["core", "abdômen"],
  obliquos: ["core", "abdômen"],
  "oblíquos": ["core", "abdômen"],
  "snc": ["core"],
  "pes": ["membros inferiores"],
  "pés": ["membros inferiores"],
  lombar: ["erectores", "core"],
  erectores: ["erectores"],
  cardio: ["cardio"],
  mobilidade: ["Mobilidade"],
  "liberacao miofascial": ["Mobilidade"],
  "liberação miofascial": ["Mobilidade"],
  "alongamento": ["Mobilidade"],
  "respiracao diafragmatica": ["Mobilidade", "core"],
  "respiração diafragmática": ["Mobilidade", "core"],
  "psoas": ["membros inferiores", "Mobilidade"],
  "flexores de quadril": ["membros inferiores", "Mobilidade"],
};

const BROAD_FALLBACK_TERMS = ["core", "membros inferiores", "ombro", "peitoral", "dorsais"];

function splitCompoundTerm(raw: string): string[] {
  return raw
    .split(/[\/,]| e |\(|\)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function searchTerm(supabase: any, term: string): Promise<string | null> {
  if (!term) return null;
  const { data, error } = await supabase.rpc("fn_search_exercises_by_muscle_term", {
    p_term: `%${term}%`,
    p_limit: 1,
  });
  if (!error && data && data.length > 0) return data[0].id;
  return null;
}

async function resolveExerciseId(
  supabase: any,
  targetMuscle: string,
  movementPattern: string,
  cache: Map<string, string | null>
): Promise<string | null> {
  const key = `${targetMuscle}|${movementPattern}`;
  if (cache.has(key)) return cache.get(key)!;

  const normalized = (targetMuscle || "").toLowerCase().trim();
  let candidateTerms = MUSCLE_SYNONYMS[normalized] || [normalized];
  let foundId: string | null = null;
  for (const term of candidateTerms) {
    foundId = await searchTerm(supabase, term);
    if (foundId) break;
  }

  if (!foundId) {
    const parts = splitCompoundTerm(normalized);
    for (const part of parts) {
      const partTerms = MUSCLE_SYNONYMS[part] || [part];
      for (const term of partTerms) {
        foundId = await searchTerm(supabase, term);
        if (foundId) break;
      }
      if (foundId) break;
    }
  }

  if (!foundId && movementPattern) {
    foundId = await searchTerm(supabase, movementPattern.toLowerCase());
    if (!foundId) {
      const mpParts = splitCompoundTerm(movementPattern.toLowerCase());
      for (const part of mpParts) {
        foundId = await searchTerm(supabase, part);
        if (foundId) break;
      }
    }
  }

  if (!foundId) {
    for (const broad of BROAD_FALLBACK_TERMS) {
      foundId = await searchTerm(supabase, broad);
      if (foundId) break;
    }
  }

  cache.set(key, foundId);
  return foundId;
}

serve(withPaidAccess(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const schedulerSecret = Deno.env.get("WEEKLY_TRAINING_SCHEDULER_SECRET");
    const isSchedulerCall = !!schedulerSecret && req.headers.get("x-weekly-training-secret") === schedulerSecret;
    if (!isSchedulerCall && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = isSchedulerCall
      ? createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      : createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader! } } });

    if (!isSchedulerCall) {
      const token = authHeader!.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
      if (claimsError || !claimsData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      }
    }

    const { aluno_id, macro_rules_id, week_start } = await req.json();
    if (!aluno_id || !macro_rules_id) {
      return new Response(JSON.stringify({ error: "aluno_id and macro_rules_id required" }), { status: 400, headers: corsHeaders });
    }

    const [profileRes, rulesRes, volumeRes, athleteRes] = await Promise.all([
      supabase.from("smart_treino_profiles").select("*").eq("aluno_id", aluno_id).maybeSingle(),
      supabase.from("smart_treino_macro_rules").select("*").eq("id", macro_rules_id).single(),
      supabase.from("smart_treino_muscle_volume").select("*").eq("macro_rules_id", macro_rules_id),
      supabase.from("athletes").select("name, experience_level, goals, injuries, sessions_per_week").eq("id", aluno_id).single(),
    ]);

    if (rulesRes.error) throw new Error(`Rules: ${rulesRes.error.message}`);
    if (volumeRes.error) throw new Error(`Volume: ${volumeRes.error.message}`);

    if (!profileRes.data) {
      return new Response(JSON.stringify({
        success: false,
        needs_profile: true,
        error: "smart_treino_profiles ausente para este atleta — preencher o wizard Perfil do Atleta antes de gerar",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const profile = profileRes.data;
    const rules = rulesRes.data;
    const volumes = volumeRes.data;
    const athlete = athleteRes.data;

    const volumeMissing = !volumes || volumes.length === 0;

    let protocolData: any = null;
    if (rules.protocol_code) {
      const { data } = await supabase.from("smart_treino_protocols").select("*").eq("id", rules.protocol_code).single();
      protocolData = data;
    }

    if (protocolData) {
      const { data: compatible, error: doseError } = await supabase.rpc("fn_protocol_strength_compatible", { p_protocol_id: protocolData.id });
      if (doseError) throw doseError;
      if (!compatible) return new Response(JSON.stringify({ error: "protocolo_modalidade_incompativel", message: "Este protocolo usa distância, duração ou estrutura específica. Não pode ser convertido em repetições de musculação." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resolvedWorkoutType = resolveWorkoutType(protocolData?.pillar);

    const sessionLabels = ["A", "B", "C", "D", "E", "F"].slice(0, rules.weekly_frequency);

    const volumeSummary = volumeMissing
      ? "ATENÇÃO: nenhum volume semanal por músculo foi cadastrado para este atleta. Use volumes moderados e conservadores como padrão de segurança (8-12 séries/semana por grupo muscular, sem ênfase específica) até que o professor cadastre o volume real."
      : (volumes || []).map((v: any) =>
          `- ${v.muscle_group}: ${v.weekly_sets} séries/semana ${v.is_emphasis ? "(ÊNFASE)" : ""} | Distribuição: ${JSON.stringify(v.distribution_json)}`
        ).join("\n");

    let protocolContext = "";
    if (protocolData) {
      protocolContext = `
PROTOCOLO 9FIT SELECIONADO:
- Código: ${protocolData.id}
- Pilar: ${protocolData.pillar_label}
- Protocolo: ${protocolData.protocol_name} (${protocolData.protocol_axis})
- Variação: ${protocolData.variation_name} — ${protocolData.variation_focus}
- Modelo: ${protocolData.model_description}
- RPE Range: ${protocolData.rpe_range}

BLOCOS DE PRESCRIÇÃO OBRIGATÓRIOS (estrutura 9FIT):
1. NEURAL (Despertar do SNC): ${protocolData.block_neural}
2. INTEGRAÇÃO (Conexão de Cadeias): ${protocolData.block_integration}
3. BLOCO 9 (Execução/Nexo de Carga): ${JSON.stringify(protocolData.block_9_template)}
4. RESET (Recuperação): ${protocolData.block_reset}

REGRA: Cada sessão DEVE conter os 4 blocos na ordem: Neural → Integração → Bloco 9 → Reset.`;
    }

    const systemPrompt = `Você é o SMART TREINO da 9FIT — módulo v2.0 Premium.

MISSÃO: Converter decisões do Smart Periodizer em arquitetura executável de treino.

ESTRUTURA OBRIGATÓRIA 9FIT — 4 BLOCOS POR SESSÃO:
1. NEURAL (1-2 exercícios): Ativação do SNC, isometrias, short foot, bracing
2. INTEGRAÇÃO (1-2 exercícios): Mobilidade, drills, conexão de cadeias cinéticas
3. BLOCO 9 (3-5 exercícios): Execução principal — padrões de movimento com séries/reps/cadência/descanso
4. RESET (1-2 exercícios): Liberação miofascial, alongamento, respiração

REGRAS ABSOLUTAS:
- Volume é definido por MÚSCULO, nunca por treino
- Nunca criar exercícios específicos — apenas padrões de movimento
- Cada sessão DEVE ter os 4 blocos
- Responder APENAS em JSON válido usando tool calling
- IMPORTANTE: use termos SIMPLES de target_muscle (ex: "peitoral", "dorsais", "core", "glúteos", "ombro",
  "bíceps", "tríceps", "membros inferiores", "isquiotibiais", "trapézio", "romboides", "latíssimo",
  "deltoides", "erectores"), evitando termos compostos com "/" ou nomes anatômicos em latim

REGRAS DO MOTOR:
- IF técnica degrada → bloquear progressão
- IF RPE médio > alvo → reduzir densidade 20%
- IF dor > 3/10 → reduzir volume local

SEGURANÇA:
- Proibido falha muscular no Macro 1
- Proibido progressão sem técnica
- Proibido aumento simultâneo de volume e carga`;

    const userPrompt = `GERE A ESTRUTURA DE TREINO para o atleta abaixo.

ATLETA: ${athlete?.name || "Atleta"}
NÍVEL: ${athlete?.experience_level || "intermediário"}
LESÕES: ${athlete?.injuries?.join(", ") || "nenhuma"}

PERFIL TÉCNICO:
- Dominante: ${profile.dominant_profile}
- Secundário: ${profile.secondary_profile || "nenhum"}
- Score Global: ${profile.score_global}
- Gargalos: ${profile.gargalos_tecnicos?.join(", ") || "nenhum"}
- Riscos: ${profile.riscos_estruturais?.join(", ") || "nenhum"}
- Modalidade: ${profile.modalidade_principal}
${protocolContext}

PARÂMETROS:
- Reps: ${rules.reps_range}
- RPE alvo: ${rules.rpe_target}
- Progressão: ${rules.progression_type}
- Densidade controlada: ${rules.density_control ? "SIM" : "NÃO"}
- Volume travado: ${rules.volume_locked ? "SIM" : "NÃO"}
- Descanso compostos: ${rules.descanso_compostos}
- Descanso acessórios: ${rules.descanso_acessorios}
- Descanso core: ${rules.descanso_core}
- Carga inicial: ${rules.carga_inicial_percent}% 1RM

FREQUÊNCIA: ${rules.weekly_frequency}x/semana
SESSÕES: ${sessionLabels.join(", ")}

VOLUME SEMANAL POR MÚSCULO:
${volumeSummary}

Gere a estrutura de ${sessionLabels.length} sessões (${sessionLabels.join("/")}).
${protocolData ? "Use os 4 blocos (neural, integration, block_9, reset) conforme definido no protocolo." : "Use a estrutura de slots padrão."}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sessionSchema = protocolData ? {
      type: "object",
      properties: {
        session_label: { type: "string" },
        session_name: { type: "string" },
        focus_muscles: { type: "array", items: { type: "string" } },
        volume_percentage: { type: "number" },
        blocks: {
          type: "object",
          properties: {
            neural: { type: "array", items: { type: "object", properties: { order: { type: "number" }, movement_pattern: { type: "string" }, target_muscle: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, rest_seconds: { type: "number" }, duration: { type: "string" }, cadence: { type: "string" }, notes: { type: "string" } } } },
            integration: { type: "array", items: { type: "object", properties: { order: { type: "number" }, movement_pattern: { type: "string" }, target_muscle: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, rest_seconds: { type: "number" }, duration: { type: "string" }, cadence: { type: "string" }, notes: { type: "string" } } } },
            block_9: { type: "array", items: { type: "object", properties: { order: { type: "number" }, movement_pattern: { type: "string" }, target_muscle: { type: "string" }, sets: { type: "number" }, reps: { type: "string" }, rest_seconds: { type: "number" }, intensity: { type: "string" }, cadence: { type: "string" }, notes: { type: "string" } }, required: ["order", "movement_pattern", "target_muscle", "sets", "reps", "rest_seconds"] } },
            reset: { type: "array", items: { type: "object", properties: { order: { type: "number" }, movement_pattern: { type: "string" }, duration: { type: "string" }, notes: { type: "string" } } } },
          },
          required: ["neural", "integration", "block_9", "reset"],
        },
      },
      required: ["session_label", "session_name", "focus_muscles", "blocks"],
    } : {
      type: "object",
      properties: {
        session_label: { type: "string" },
        session_name: { type: "string" },
        focus_muscles: { type: "array", items: { type: "string" } },
        volume_percentage: { type: "number" },
        slots: {
          type: "array",
          items: {
            type: "object",
            properties: {
              order: { type: "number" },
              movement_pattern: { type: "string" },
              target_muscle: { type: "string" },
              sets: { type: "number" },
              reps: { type: "string" },
              rest_seconds: { type: "number" },
              intensity: { type: "string" },
              notes: { type: "string" },
            },
            required: ["order", "movement_pattern", "target_muscle", "sets", "reps", "rest_seconds"],
          },
        },
      },
      required: ["session_label", "session_name", "focus_muscles"],
    };

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
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_training_structure",
            description: "Generate the complete training session structure",
            parameters: {
              type: "object",
              properties: {
                sessions: { type: "array", items: sessionSchema },
                progression_notes: { type: "string" },
                safety_notes: { type: "string" },
              },
              required: ["sessions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_training_structure" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI Gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error ${status}: ${text}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const result = JSON.parse(toolCall.function.arguments);
    const sessions = Array.isArray(result.sessions) ? result.sessions : [];

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const baseDate = week_start ? new Date(`${week_start}T00:00:00`) : new Date();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7));

    const exerciseCache = new Map<string, string | null>();
    let diasGravados = 0;
    const warnings: string[] = [];
    if (volumeMissing) warnings.push("Nenhum smart_treino_muscle_volume cadastrado — IA usou volumes conservadores padrão. Recomenda-se cadastrar o volume real no wizard assim que possível.");

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const workoutDate = new Date(monday);
      workoutDate.setDate(monday.getDate() + i);
      const isoDate = workoutDate.toISOString().slice(0, 10);

      let orderedSlots: any[] = [];
      if (session.blocks) {
        orderedSlots = [
          ...(session.blocks.neural || []),
          ...(session.blocks.integration || []),
          ...(session.blocks.block_9 || []),
          ...(session.blocks.reset || []),
        ];
      } else if (Array.isArray(session.slots)) {
        orderedSlots = session.slots;
      }

      if (orderedSlots.length === 0) {
        warnings.push(`Sessão ${session.session_label ?? i + 1}: sem exercícios retornados pela IA — dia não gravado`);
        continue;
      }

      const { data: existing } = await admin
        .from("daily_workouts")
        .select("id")
        .eq("athlete_id", aluno_id)
        .eq("workout_date", isoDate)
        .maybeSingle();

      let dailyWorkoutId: string;
      const focusMuscles = session.focus_muscles || [];

      if (existing?.id) {
        dailyWorkoutId = existing.id;
        await admin.from("workout_exercises").delete().eq("daily_workout_id", dailyWorkoutId);
        await admin.from("daily_workouts").update({
          day_number: i + 1,
          day_name: session.session_name ?? session.session_label ?? `Dia ${i + 1}`,
          focus_muscles: focusMuscles,
          workout_type: resolvedWorkoutType,
          updated_at: new Date().toISOString(),
        }).eq("id", dailyWorkoutId);
      } else {
        const { data: inserted, error: insertErr } = await admin.from("daily_workouts").insert({
          athlete_id: aluno_id,
          workout_date: isoDate,
          day_number: i + 1,
          day_name: session.session_name ?? session.session_label ?? `Dia ${i + 1}`,
          focus_muscles: focusMuscles,
          workout_type: resolvedWorkoutType,
        }).select("id").single();
        if (insertErr || !inserted) {
          warnings.push(`Sessão ${session.session_label ?? i + 1}: falha ao criar daily_workout — ${insertErr?.message}`);
          continue;
        }
        dailyWorkoutId = inserted.id;
      }

      const rows = [];
      for (let order = 0; order < orderedSlots.length; order++) {
        const slot = orderedSlots[order];
        const exerciseId = await resolveExerciseId(
          admin,
          slot.target_muscle ?? "",
          slot.movement_pattern ?? "",
          exerciseCache
        );
        if (!exerciseId) {
          warnings.push(`Sessão ${session.session_label ?? i + 1}, slot ${order + 1}: nenhum exercício encontrado para "${slot.target_muscle ?? slot.movement_pattern}" (inclusive fallback amplo)`);
          continue;
        }
        rows.push({
          daily_workout_id: dailyWorkoutId,
          exercise_id: exerciseId,
          // BUG CORRIGIDO (22/10): usava slot.order (numeração que a IA devolve
          // reiniciando em 1 dentro de CADA bloco — neural/integration/block_9/reset).
          // Como orderedSlots já concatena os 4 blocos numa lista única, isso fazia
          // 4 linhas de blocos diferentes disputarem exercise_order=1, outras 4
          // disputarem exercise_order=2, etc. O app então empilhava variações
          // diferentes do "mesmo slot" como se fossem exercícios distintos na mesma
          // posição. A ordem correta é sempre a posição real na lista já concatenada.
          exercise_order: order + 1,
          sets: slot.sets ?? 3,
          reps_range: slot.reps ?? "8-12",
          rest_seconds: slot.rest_seconds ?? 60,
          load_percentage: slot.intensity ?? null,
          tempo: slot.cadence ?? null,
          rpe_target: rules.rpe_target ? Math.round(rules.rpe_target) : null,
          notes: slot.notes ?? null,
        });
      }

      if (rows.length > 0) {
        const { error: wErr } = await admin.from("workout_exercises").insert(rows);
        if (wErr) {
          warnings.push(`Sessão ${session.session_label ?? i + 1}: falha ao gravar exercícios — ${wErr.message}`);
          continue;
        }
        diasGravados++;
      } else {
        warnings.push(`Sessão ${session.session_label ?? i + 1}: nenhum exercício resolvido — daily_workout criado mas vazio`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      dias_gravados: diasGravados,
      total_sessoes_geradas: sessions.length,
      volume_missing: volumeMissing,
      workout_type_used: resolvedWorkoutType,
      warnings,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-smart-treino error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, {bucket:'ai'}));
