import {withPaidAccess} from "../_shared/paidAccess.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(withPaidAccess(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await authSupabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ success: false, error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { studentId, periodizationModelId, periodizationText, formData, smartTreinoContext } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (smartTreinoContext) {
      const { data: compatible, error: doseError } = await supabase.rpc("fn_protocol_strength_compatible", { p_protocol_id: smartTreinoContext.protocol_code || "" });
      if (doseError) throw doseError;
      if (!compatible) return new Response(JSON.stringify({ success: false, error: "protocolo_modalidade_incompativel", message: "Este protocolo exige distância/duração e não pode gerar séries de musculação." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Fetch student data (try athletes first, then alunos)
    let student: any = null;
    const { data: athleteData } = await supabase.from('athletes').select('*').eq('id', studentId).single();
    if (athleteData) {
      student = {
        nome: athleteData.name,
        objetivo: athleteData.objetivo || athleteData.primary_goal,
        nivel_experiencia: athleteData.nivel || athleteData.experience_level,
        frequencia_semanal: athleteData.sessions_per_week || athleteData.weekly_frequency,
        ambiente_treino: athleteData.training_environment,
        tempo_disponivel_min: 60,
        historico_lesoes: athleteData.injuries_limitations,
        restricoes_medicas: athleteData.injuries?.join(', '),
        foco_muscular: 'corpo_todo',
        condicionamento_cardio: 'medio',
        experiencia_pesos_livres: 'basico',
        preferencia_intensidade: 'moderado',
        preferencia_cardio: 'integrado',
        preferencia_equipamento: 'ambos',
        meta_tempo_meses: 3,
      };
    } else {
      const { data: alunoData, error: alunoError } = await supabase.from('alunos').select('*').eq('id', studentId).single();
      if (alunoError || !alunoData) throw new Error('Aluno não encontrado');
      student = alunoData;
    }

    // 2. Fetch periodization model if provided
    let periodizationModel = null;
    if (periodizationModelId) {
      const { data: model } = await supabase.from('periodization_models').select('*').eq('id', periodizationModelId).single();
      periodizationModel = model;
    }

    // 3. Build the comprehensive prompt
    const freq = formData?.frequencia_semanal || student.frequencia_semanal || 3;
    const objetivo = formData?.objetivo || student.objetivo || 'hipertrofia';
    const nivel = formData?.nivel || student.nivel_experiencia || 'intermediario';

    const periodizationContext = periodizationModel
      ? `
MODELO DE PERIODIZAÇÃO SELECIONADO:
- Título: ${periodizationModel.title}
- Objetivo: ${periodizationModel.goal}
- Duração: ${periodizationModel.duration}
- Descrição: ${periodizationModel.description}

MACROCICLO:
${JSON.stringify(periodizationModel.macrocycle, null, 2)}

MESOCICLOS:
${JSON.stringify(periodizationModel.mesocycle, null, 2)}

MICROCICLO:
${JSON.stringify(periodizationModel.microcycle, null, 2)}
`
      : periodizationText
        ? `
PERIODIZAÇÃO IMPORTADA (TEXTO):
${periodizationText}
`
        : '';

    // 4. Build Smart Treino 9FIT protocol context
    let smartTreinoBlock = '';
    if (smartTreinoContext) {
      smartTreinoBlock = `
PROTOCOLO 9FIT APLICADO (OBRIGATÓRIO):
- Código: ${smartTreinoContext.protocol_code}
- Pilar: ${smartTreinoContext.pillar}
- Protocolo: ${smartTreinoContext.protocol_name} (${smartTreinoContext.protocol_axis})
- Variação: ${smartTreinoContext.variation_name} — ${smartTreinoContext.variation_focus}
- Modelo: ${smartTreinoContext.model_description}
- RPE: ${smartTreinoContext.rpe_range}

ESTRUTURA OBRIGATÓRIA POR SESSÃO (4 BLOCOS):
1. NEURAL (Despertar SNC): ${smartTreinoContext.block_neural}
2. INTEGRAÇÃO (Conexão de cadeias): ${smartTreinoContext.block_integration}
3. BLOCO 9 (Execução principal): ${JSON.stringify(smartTreinoContext.block_9_template)}
4. RESET (Recuperação): ${smartTreinoContext.block_reset}

REGRA: Cada dia de treino DEVE seguir a ordem Neural → Integração → Bloco 9 → Reset.
Organize os exercícios dentro dos 4 blocos obrigatórios.
`;

      if (smartTreinoContext.profile) {
        smartTreinoBlock += `
PERFIL TÉCNICO DO ATLETA:
- Perfil dominante: ${smartTreinoContext.profile.dominant_profile}
- Score global: ${smartTreinoContext.profile.score_global}
- Gargalos: ${smartTreinoContext.profile.gargalos?.join(', ') || 'nenhum'}
- Riscos: ${smartTreinoContext.profile.riscos?.join(', ') || 'nenhum'}
`;
      }

      if (smartTreinoContext.rules) {
        smartTreinoBlock += `
REGRAS DO MACROCICLO:
- Reps: ${smartTreinoContext.rules.reps_range}
- RPE alvo: ${smartTreinoContext.rules.rpe_target}
- Progressão: ${smartTreinoContext.rules.progression_type}
- Densidade controlada: ${smartTreinoContext.rules.density_control ? 'SIM' : 'NÃO'}
- Volume travado: ${smartTreinoContext.rules.volume_locked ? 'SIM' : 'NÃO'}
`;
      }

      if (smartTreinoContext.volumes?.length > 0) {
        smartTreinoBlock += `
VOLUME SEMANAL POR MÚSCULO:
${smartTreinoContext.volumes.map((v: any) => `- ${v.muscle}: ${v.sets} séries/sem ${v.emphasis ? '(ÊNFASE)' : ''}`).join('\n')}
`;
      }
    }

    const prompt = `Você é o SMART PERIODIZER da 9FIT — módulo de geração de planos periodizados completos.

PERFIL DO ALUNO:
- Nome: ${student.nome}
- Objetivo: ${objetivo}
- Nível: ${nivel}
- Frequência Semanal: ${freq} dias/semana
- Ambiente: ${student.ambiente_treino || 'academia'}
- Tempo por sessão: ${student.tempo_disponivel_min || 60} minutos
- Lesões/Restrições: ${student.historico_lesoes || student.restricoes_medicas || 'Nenhuma'}
- Foco muscular: ${student.foco_muscular || 'corpo_todo'}
- Condicionamento cardio: ${student.condicionamento_cardio || 'medio'}
- Experiência com pesos: ${student.experiencia_pesos_livres || 'basico'}
- Preferência intensidade: ${student.preferencia_intensidade || 'moderado'}
- Meta de tempo: ${student.meta_tempo_meses || 3} meses

${periodizationContext}
${smartTreinoBlock}

INSTRUÇÕES CRÍTICAS:
1. Crie um plano COMPLETO para ${student.meta_tempo_meses || 3} meses (${(student.meta_tempo_meses || 3) * 4} semanas aprox.)
2. Divida em mesociclos de 3-6 semanas cada, com foco e progressão distintos
3. Para CADA semana, crie ${freq} dias de treino com exercícios REAIS e específicos
4. Cada exercício deve ter: nome, séries, repetições, descanso e observação
5. Aplique princípios de periodização: progressão de volume/intensidade, deload a cada 3-4 semanas
6. Considere o ambiente (${student.ambiente_treino || 'academia'}) na seleção de exercícios
${smartTreinoContext ? '7. OBRIGATÓRIO: Organize cada dia nos 4 blocos (neural, integração, bloco_9, reset) conforme protocolo 9FIT' : ''}

RETORNE APENAS JSON VÁLIDO no seguinte formato:
{
  "macrociclo": {
    "nome": "Nome descritivo do macrociclo",
    "duracao_semanas": número_total_de_semanas${smartTreinoContext ? ',\n    "protocolo_9fit": "código do protocolo",\n    "pilar": "nome do pilar"' : ''}
  },
  "mesociclos": [
    {
      "nome": "Nome do mesociclo",
      "semana_inicio": 1,
      "semana_fim": 4,
      "foco": "Descrição do foco principal",
      "volume": "Alto/Moderado/Baixo",
      "intensidade": "Alta/Moderada/Baixa",
      "descricao": "Explicação detalhada da fase"
    }
  ],
  "semanas": [
    {
      "numero": 1,
      "mesociclo": "Nome do mesociclo correspondente",
      "foco_semana": "Foco específico desta semana",
      "dias": [
        {
          "dia": "Segunda",
          "nome": "Treino A - Descrição",
          "tipo": "Tipo do treino",
          "exercicios": [
            {
              "nome": "Nome do Exercício",
              "series": "4",
              "repeticoes": "8-12",
              "descanso": "90s",
              "observacao": "Notas técnicas"${smartTreinoContext ? ',\n              "bloco": "neural|integration|block_9|reset"' : ''}
            }
          ]
        }
      ]
    }
  ]
}

IMPORTANTE: Gere TODAS as semanas completas com TODOS os dias e exercícios. Não use abreviações como "repita semana X".`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY não configurada');

    console.log('🏋️ Gerando plano completo para:', student.nome, '| Semanas:', (student.meta_tempo_meses || 3) * 4, smartTreinoContext ? `| Protocolo 9FIT: ${smartTreinoContext.protocol_code}` : '');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'Você é o SMART PERIODIZER da 9FIT — especialista certificado em prescrição de exercícios e periodização. Retorne APENAS JSON válido em português brasileiro. Gere planos completos com exercícios reais e específicos para cada dia de cada semana. Se um protocolo 9FIT for fornecido, organize cada dia nos 4 blocos obrigatórios: Neural → Integração → Bloco 9 → Reset.'
          },
          { role: 'user', content: prompt }
        ],
        model: 'google/gemini-3-flash-preview',
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit excedido. Tente novamente em alguns minutos.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'Créditos insuficientes para geração de IA.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    let fullPlan;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fullPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      throw new Error('Falha ao processar resposta da IA');
    }

    if (!fullPlan.macrociclo || !fullPlan.mesociclos || !fullPlan.semanas) {
      console.error('Invalid plan structure:', Object.keys(fullPlan));
      throw new Error('Estrutura do plano inválida');
    }

    console.log('✅ Plano gerado:', fullPlan.macrociclo.nome, '|', fullPlan.semanas.length, 'semanas |', fullPlan.mesociclos.length, 'mesociclos');

    // 5. Save to planos_treino_aluno
    const tipoPeriodizacao = smartTreinoContext
      ? `smart_treino_v2 (${smartTreinoContext.protocol_code})`
      : periodizationModel?.title || 'Personalizada';

    const { data: savedPlan, error: saveError } = await supabase
      .from('planos_treino_aluno')
      .insert({
        aluno_id: studentId,
        professor_id: authUser.id,
        nome_plano: fullPlan.macrociclo.nome || 'Plano Periodizado Completo',
        objetivo: objetivo,
        duracao_semanas: fullPlan.macrociclo.duracao_semanas || fullPlan.semanas.length,
        frequencia_semanal: freq,
        estrutura_treino: fullPlan,
        tipo_periodizacao: tipoPeriodizacao,
        fase_atual: fullPlan.mesociclos[0]?.nome || 'Fase 1',
        semana_atual: 1,
        status: 'ativo',
        data_inicio: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving plan:', saveError);
      throw new Error('Erro ao salvar plano');
    }

    // Deactivate other active plans for this student
    await supabase
      .from('planos_treino_aluno')
      .update({ status: 'inativo' })
      .eq('aluno_id', studentId)
      .neq('id', savedPlan.id)
      .eq('status', 'ativo');

    // Auto-deliver to FitPro (fire-and-forget)
    try {
      await fetch(`${supabaseUrl}/functions/v1/fitpro-deliver-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({
          athlete_id: studentId,
          plano_id: savedPlan.id,
          workout_date: new Date().toISOString().slice(0, 10),
          source: 'generate_full_plan',
          treino: { plano_id: savedPlan.id, macrociclo: fullPlan.macrociclo?.nome },
        }),
      });
    } catch (e) { console.warn('auto-deliver full-plan warn:', e); }


    return new Response(JSON.stringify({
      success: true,
      plan: savedPlan,
      summary: {
        macrociclo: fullPlan.macrociclo.nome,
        total_semanas: fullPlan.semanas.length,
        total_mesociclos: fullPlan.mesociclos.length,
        mesociclos: fullPlan.mesociclos.map((m: any) => m.nome),
        protocolo_9fit: smartTreinoContext?.protocol_code || null,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-full-plan:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}, {bucket:'ai'}));
